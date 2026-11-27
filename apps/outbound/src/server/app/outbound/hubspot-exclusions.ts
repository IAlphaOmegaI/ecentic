import "server-only";
import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  HUBSPOT_AUTOMATION_OPERATION,
  HUBSPOT_PULL_OPERATION,
  HUBSPOT_REFRESH_MS,
  HUBSPOT_STALE_MS,
  type HubspotAutomation,
  type HubspotPullState,
  hubspotAutomationSchema,
  hubspotPageSchema,
  hubspotPullInputSchema,
  hubspotPullStateSchema,
} from "@/lib/outbound-hubspot";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as HubSpot from "@/server/utils/outbound/hubspot";
import {
  hubspotHash,
  projectHubspotExclusions,
} from "@/server/utils/outbound/hubspot-exclusions";
import { repository } from "@/server/utils/repository";
import * as Credentials from "./provider-credentials";

const Jobs = repository(schema.outboundIntegrationJob);
const operation = sql`${schema.outboundIntegrationJob.input}->>'operation'=${HUBSPOT_PULL_OPERATION}`;
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const transaction = <Data>(
  callback: (scope: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return callback(scope);
    }),
  );
const credential = async (scope?: TransactionScope) => {
  const metadata = value(await Credentials.metadata("hubspot", scope, true));
  if (!metadata.configured || !metadata.version)
    throw new ValidationError(
      "Save and check a HubSpot credential before explicitly starting a read preview.",
    );
  return metadata.version;
};
const read = async (id: string, scope?: TransactionScope) => {
  const job = value(await Jobs.get(Environment.SERVER, id, { tx: scope }));
  if (
    !job ||
    job.provider !== "automation" ||
    job.input["operation"] !== HUBSPOT_PULL_OPERATION
  )
    throw new NotFoundError("HubSpot exclusion preview not found.");
  const input = hubspotPullInputSchema.parse(job.input);
  const state = hubspotPullStateSchema.parse(job.output);
  const preview = projectHubspotExclusions(input, state);
  return { job, input, state, preview };
};
const update = async (
  scope: TransactionScope,
  id: string,
  state: HubspotPullState,
  status: "pending" | "starting" | "complete" | "failed" | "uncertain",
  error: string | null = null,
) =>
  value(
    await Jobs.update(
      Environment.SERVER,
      id,
      { status, output: state, error, updatedAt: new Date() },
      { tx: scope },
    ),
  );

const configurationRequestId = "hubspot-exclusion-automation";
const automation = async (scope?: TransactionScope) => {
  const job = value(
    await Jobs.find(
      Environment.SERVER,
      {
        where: eq(
          schema.outboundIntegrationJob.requestId,
          configurationRequestId,
        ),
        limit: 1,
      },
      { tx: scope },
    ),
  )[0];
  if (!job) return null;
  if (
    job.provider !== "automation" ||
    job.status !== "complete" ||
    job.error ||
    hubspotHash(job.input) !==
      hubspotHash({ operation: HUBSPOT_AUTOMATION_OPERATION })
  )
    throw new ConflictError(
      "The HubSpot automation configuration needs attention.",
    );
  return { job, state: hubspotAutomationSchema.parse(job.output) };
};
const saveAutomation = async (
  scope: TransactionScope,
  id: string,
  state: HubspotAutomation,
) =>
  value(
    await Jobs.update(
      Environment.SERVER,
      id,
      {
        output: hubspotAutomationSchema.parse(state),
        updatedAt: new Date(),
      },
      { tx: scope },
    ),
  );
const assertAutomationBinding = async (
  current: Awaited<ReturnType<typeof read>>,
  scope?: TransactionScope,
) => {
  if (!current.input.automation) return;
  const configured = await automation(scope);
  if (
    !configured ||
    !configured.state.enabled ||
    configured.job.id !== current.input.automation.configurationId ||
    configured.state.epoch !== current.input.automation.epoch ||
    configured.state.currentJobId !== current.job.id ||
    configured.state.credentialVersion !== current.input.credentialVersion ||
    configured.state.maxPages !== current.input.maxPages ||
    current.input.requestedBy !== "hubspot-schedule" ||
    current.job.requestId !==
      `hubspot-exclusions:daily:${configured.job.id}:${current.input.automation.day}`
  )
    throw new ConflictError(
      "This scheduled HubSpot read is no longer enabled or owned by its configuration.",
    );
};
const checkedEnableProof = async (
  scope: TransactionScope,
  input: { job: string; expectedHash: string },
) => {
  const current = await read(input.job, scope);
  if (
    current.job.status !== "complete" ||
    current.job.error ||
    current.state.lease ||
    !current.preview.complete ||
    !current.state.applied ||
    current.preview.previewHash !== input.expectedHash ||
    current.state.applied.previewHash !== input.expectedHash
  )
    throw new ConflictError(
      "Enable daily protection only from an unchanged complete, applied HubSpot preview.",
    );
  return current;
};
const disableWithin = async (
  scope: TransactionScope,
  configured: NonNullable<Awaited<ReturnType<typeof automation>>>,
  actor: string,
  reason: string,
) => {
  if (configured.state.currentJobId) {
    const current = await read(configured.state.currentJobId, scope);
    await assertAutomationBinding(current, scope);
    if (current.job.status === "pending" || current.job.status === "starting")
      await update(
        scope,
        current.job.id,
        { ...current.state, lease: null },
        current.job.status === "starting" ? "uncertain" : "failed",
        reason,
      );
  }
  const state = hubspotAutomationSchema.parse({
    ...configured.state,
    enabled: false,
    epoch: randomUUID(),
    updatedBy: actor,
    updatedAt: new Date().toISOString(),
    reason,
  });
  await saveAutomation(scope, configured.job.id, state);
  return state;
};

/** Explicit activation only. Credential saving and deployment never create this configuration. */
export const enable = (
  actor: string,
  input: { job: string; expectedHash: string },
) =>
  transaction(async (scope) => {
    const proof = await checkedEnableProof(scope, input);
    if (
      (await credential(scope)) !== proof.input.credentialVersion ||
      Date.now() - Date.parse(proof.state.pages[0]!.observedAt) >
        HUBSPOT_STALE_MS
    )
      throw new ConflictError(
        "Daily protection needs a fresh applied preview from the current HubSpot credential.",
      );
    const configured = await automation(scope);
    if (configured?.state.enabled) {
      if (
        configured.state.proof.jobId !== input.job ||
        configured.state.proof.previewHash !== input.expectedHash
      )
        throw new ConflictError(
          "Disable the current HubSpot schedule before binding a different checked preview.",
        );
      return { ...configured.state, repeated: true };
    }
    const state = hubspotAutomationSchema.parse({
      enabled: true,
      epoch: randomUUID(),
      credentialVersion: proof.input.credentialVersion,
      proof: { jobId: input.job, previewHash: input.expectedHash },
      maxPages: proof.input.maxPages,
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
      nextDueAt: new Date(
        Math.max(
          Date.now(),
          Date.parse(proof.state.completedAt!) + HUBSPOT_REFRESH_MS,
          configured ? Date.parse(configured.state.nextDueAt) : 0,
        ),
      ).toISOString(),
      currentJobId: null,
      reason: null,
    });
    if (configured) await saveAutomation(scope, configured.job.id, state);
    else
      value(
        await Jobs.create(
          Environment.SERVER,
          {
            provider: "automation",
            requestId: configurationRequestId,
            input: { operation: HUBSPOT_AUTOMATION_OPERATION },
            status: "complete",
            output: state,
          },
          { tx: scope },
        ),
      );
    return { ...state, repeated: false };
  });

export const disable = (actor: string) =>
  transaction(async (scope) => {
    const configured = await automation(scope);
    if (!configured || !configured.state.enabled)
      return { enabled: false, repeated: true };
    return {
      ...(await disableWithin(
        scope,
        configured,
        actor,
        "Daily HubSpot protection was explicitly disabled. Existing exclusions remain.",
      )),
      repeated: false,
    };
  });

/** No cron or credential-save caller. Starting only reserves a preview; it makes no HTTP request. */
export const start = (
  actor: string,
  input: { requestId: string; maxPages?: number },
) =>
  transaction(async (scope) => {
    const requestId = `hubspot-exclusions:${z.string().uuid().parse(input.requestId)}`;
    const request = hubspotPullInputSchema.parse({
      operation: HUBSPOT_PULL_OPERATION,
      requestedBy: actor,
      credentialVersion: await credential(scope),
      maxPages: input.maxPages ?? 50,
      mode: "preview-only",
    });
    const existing = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: eq(schema.outboundIntegrationJob.requestId, requestId),
          limit: 1,
        },
        { tx: scope },
      ),
    )[0];
    if (existing) {
      if (
        hubspotHash(hubspotPullInputSchema.parse(existing.input)) !==
        hubspotHash(request)
      )
        throw new ConflictError(
          "This request already binds a different HubSpot preview.",
        );
      return { jobId: existing.id, repeated: true };
    }
    const active = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            operation,
            sql`${schema.outboundIntegrationJob.status} in ('pending','starting')`,
          ),
          limit: 1,
        },
        { tx: scope },
      ),
    );
    if (active.length)
      throw new ConflictError(
        "Finish the existing HubSpot read preview first.",
      );
    const job = value(
      await Jobs.create(
        Environment.SERVER,
        {
          provider: "automation",
          requestId,
          input: request,
          status: "pending",
          output: { object: "companies", after: null, pages: [], lease: null },
        },
        { tx: scope },
      ),
    );
    return { jobId: job.id, repeated: false };
  });

/** Exactly one GET outside the workspace transaction. Failure/expired leases require a new explicit pull. */
export const runPage = async (
  { job: id }: { job: string },
  dependencies: { readPage?: typeof HubSpot.readPage } = {},
): Promise<Result<{ status: string } | null, Error>> => {
  const claimed = await transaction(async (scope) => {
    const current = await read(id, scope);
    await assertAutomationBinding(current, scope);
    if (current.job.status === "starting") {
      if (
        current.state.lease &&
        Date.parse(current.state.lease.expiresAt) <= Date.now()
      ) {
        await update(
          scope,
          id,
          { ...current.state, lease: null },
          "uncertain",
          "The read lease expired. Prior exclusions and the last-good pull are unchanged.",
        );
        return null;
      }
      throw new ConflictError(
        "The read is already reserved; it is not resubmitted.",
      );
    }
    if (current.job.status !== "pending") return null;
    if (
      (await credential(scope)) !== current.input.credentialVersion ||
      current.state.pages.length >= current.input.maxPages
    ) {
      await update(
        scope,
        id,
        { ...current.state, lease: null },
        "failed",
        "The credential or configured page bound changed; start a new explicit preview.",
      );
      return null;
    }
    const state = {
      ...current.state,
      lease: {
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    };
    await update(scope, id, state, "starting");
    return { ...current, state };
  });
  if (!claimed.success) return claimed;
  if (!claimed.data) return { success: true, data: null };
  const current = claimed.data;
  const received = await resultify(async () => {
    await assertAutomationBinding(current);
    const key = value(await Credentials.resolveKey("hubspot"));
    if (!key || (await credential()) !== current.input.credentialVersion)
      throw new Error("HubSpot credential changed before the read.");
    return value(
      await (dependencies.readPage ?? HubSpot.readPage)({
        apiKey: key,
        object: current.state.object,
        after: current.state.after,
      }),
    );
  });
  return transaction(async (scope) => {
    const latest = await read(id, scope);
    if (
      latest.job.status !== "starting" ||
      latest.state.lease?.token !== current.state.lease?.token ||
      hubspotHash(latest.input) !== hubspotHash(current.input) ||
      hubspotHash(latest.state) !== hubspotHash(current.state)
    )
      throw new ConflictError(
        "The HubSpot read reservation changed; no result was applied.",
      );
    await assertAutomationBinding(latest, scope);
    const unchanged =
      (await credential(scope)) === current.input.credentialVersion;
    if (
      !unchanged ||
      !latest.state.lease ||
      Date.parse(latest.state.lease.expiresAt) <= Date.now()
    ) {
      await update(
        scope,
        id,
        { ...latest.state, lease: null },
        "uncertain",
        "The read context or lease changed. No page or exclusions were applied.",
      );
      return { status: "uncertain" as const };
    }
    if (!received.success) {
      await update(
        scope,
        id,
        { ...latest.state, lease: null },
        "failed",
        "HubSpot read failed. No automatic retry; prior exclusions and last-good pull are unchanged.",
      );
      return { status: "failed" as const };
    }
    const checked = resultify(() => {
      const response = hubspotPageSchema.parse(received.data.value);
      const now = new Date().toISOString();
      const next = response.paging?.next?.after ?? null;
      const complete = latest.state.object === "contacts" && !next;
      const state = hubspotPullStateSchema.parse({
        ...latest.state,
        object: next ? latest.state.object : "contacts",
        after: next,
        lease: null,
        pages: [
          ...latest.state.pages,
          {
            object: latest.state.object,
            after: latest.state.after,
            observedAt: now,
            response,
            responseHash: hubspotHash(response),
          },
        ],
        ...(complete ? { completedAt: now } : {}),
      });
      projectHubspotExclusions(latest.input, state);
      return state;
    });
    if (!checked.success) {
      await update(
        scope,
        id,
        { ...latest.state, lease: null },
        "failed",
        "HubSpot returned invalid or repeated page evidence; nothing was applied.",
      );
      return { status: "failed" as const };
    }
    const bounded =
      !checked.data.completedAt &&
      checked.data.pages.length >= latest.input.maxPages;
    const status = checked.data.completedAt
      ? "complete"
      : bounded
        ? "failed"
        : "pending";
    await update(
      scope,
      id,
      checked.data,
      status,
      bounded
        ? "HubSpot page limit reached before both collections completed; nothing was applied."
        : null,
    );
    return { status };
  });
};

export const preview = ({ job }: { job: string }) =>
  resultify(async () => {
    const current = await read(job);
    return {
      jobId: job,
      status: current.job.status,
      error: current.job.error,
      mode: "preview-only" as const,
      ...current.preview,
    };
  });

const applyWithin = async (
  scope: TransactionScope,
  actor: string,
  input: { job: string; expectedHash: string },
) => {
  const current = await read(input.job, scope);
  if (
    current.job.status !== "complete" ||
    !current.preview.complete ||
    current.state.lease ||
    current.job.error ||
    current.preview.previewHash !== input.expectedHash
  )
    throw new ConflictError(
      "Review a complete unchanged HubSpot preview before applying exclusions.",
    );
  if (current.state.applied)
    return { ...current.state.applied, repeated: true };
  await assertAutomationBinding(current, scope);
  if ((await credential(scope)) !== current.input.credentialVersion)
    throw new ConflictError(
      "The HubSpot credential changed after this preview.",
    );
  if (
    Date.now() - Date.parse(current.state.pages[0]!.observedAt) >
    HUBSPOT_STALE_MS
  )
    throw new ConflictError(
      "The HubSpot preview is more than three days old; review a new pull.",
    );
  // One atomic bounded insert, using the existing unique suppression key. Conflict must preserve the original reason/actor/date.
  const added = current.preview.entries.length
    ? await scope
        .insert(schema.outboundSuppression)
        .values(
          current.preview.entries.map((entry) => ({
            scope: entry.scope,
            value: entry.value,
            reason: `HubSpot existing contact; pull ${input.job}; ${entry.sources[0]!.object}/${entry.sources[0]!.id}`,
            createdBy: actor,
          })),
        )
        .onConflictDoNothing({
          target: [
            schema.outboundSuppression.scope,
            schema.outboundSuppression.value,
          ],
        })
        .returning({ id: schema.outboundSuppression.id })
    : [];
  const applied = {
    at: new Date().toISOString(),
    by: z.string().trim().min(1).max(200).parse(actor),
    previewHash: input.expectedHash,
    added: added.length,
    existing: current.preview.entries.length - added.length,
  };
  await update(scope, input.job, { ...current.state, applied }, "complete");
  return { ...applied, repeated: false };
};

/** Explicit checked application; scheduled application requires an enabled owner. */
export const apply = (
  actor: string,
  input: { job: string; expectedHash: string },
) => transaction((scope) => applyWithin(scope, actor, input));

/** One local lifecycle stage or one GET per cron invocation; never resumes a manual pull. */
export const runScheduled = async (
  { deadline }: { deadline: number },
  dependencies: { readPage?: typeof HubSpot.readPage } = {},
): Promise<Result<{ status: string; jobId?: string }, Error>> => {
  if (Date.now() + 25_000 > deadline)
    return { success: true, data: { status: "budget" } };
  const staged = await transaction(
    async (
      scope,
    ): Promise<{ status: string; jobId?: string; readJob?: string }> => {
      const configured = await automation(scope);
      if (!configured?.state.enabled) return { status: "disabled" };
      const metadata = value(
        await Credentials.metadata("hubspot", scope, true),
      );
      if (
        !metadata.configured ||
        metadata.version !== configured.state.credentialVersion
      ) {
        await disableWithin(
          scope,
          configured,
          "hubspot-schedule",
          "The HubSpot credential changed. Daily protection is disabled until a fresh applied preview is explicitly enabled.",
        );
        return { status: "credential-changed" };
      }
      const proof = await checkedEnableProof(scope, {
        job: configured.state.proof.jobId,
        expectedHash: configured.state.proof.previewHash,
      });
      if (
        proof.input.credentialVersion !== configured.state.credentialVersion ||
        proof.input.maxPages !== configured.state.maxPages
      )
        throw new ConflictError("The enabled HubSpot preview binding changed.");
      if (configured.state.currentJobId) {
        const current = await read(configured.state.currentJobId, scope);
        await assertAutomationBinding(current, scope);
        const observedAt = current.state.pages[0]?.observedAt;
        if (
          !current.state.applied &&
          (current.job.status === "pending" ||
            current.job.status === "complete") &&
          observedAt &&
          Date.now() - Date.parse(observedAt) > HUBSPOT_STALE_MS
        ) {
          const reason =
            "The daily HubSpot pull became older than three days before application. Its pages are retained; the next due pull starts from the beginning.";
          await update(scope, current.job.id, current.state, "failed", reason);
          await saveAutomation(scope, configured.job.id, {
            ...configured.state,
            currentJobId: null,
            reason,
          });
          return { status: "failed", jobId: current.job.id };
        }
        if (current.job.status === "pending")
          return { status: "read", readJob: current.job.id };
        if (current.job.status === "starting") {
          if (
            current.state.lease &&
            Date.parse(current.state.lease.expiresAt) <= Date.now()
          ) {
            await update(
              scope,
              current.job.id,
              { ...current.state, lease: null },
              "uncertain",
              "The scheduled read lease expired. This HTTP reservation will not be retried.",
            );
            return { status: "uncertain", jobId: current.job.id };
          }
          return { status: "busy", jobId: current.job.id };
        }
        if (current.job.status === "complete") {
          await applyWithin(scope, "hubspot-schedule", {
            job: current.job.id,
            expectedHash: current.preview.previewHash,
          });
          await saveAutomation(scope, configured.job.id, {
            ...configured.state,
            currentJobId: null,
            reason: null,
          });
          return { status: "applied", jobId: current.job.id };
        }
        if (
          current.job.status !== "failed" &&
          current.job.status !== "uncertain"
        )
          throw new ConflictError(
            "The scheduled HubSpot pull has an unsupported state.",
          );
        await saveAutomation(scope, configured.job.id, {
          ...configured.state,
          currentJobId: null,
          reason:
            current.job.error ??
            "The latest daily pull needs attention; prior exclusions remain.",
        });
        return { status: current.job.status, jobId: current.job.id };
      }
      if (Date.now() < Date.parse(configured.state.nextDueAt))
        return { status: "not-due" };
      const active = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: and(
              operation,
              sql`${schema.outboundIntegrationJob.status} in ('pending','starting')`,
            ),
            limit: 1,
          },
          { tx: scope },
        ),
      );
      if (active.length) return { status: "manual-pull-active" };
      const day = new Date().toISOString().slice(0, 10);
      const requestId = `hubspot-exclusions:daily:${configured.job.id}:${day}`;
      const existing = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: eq(schema.outboundIntegrationJob.requestId, requestId),
            limit: 1,
          },
          { tx: scope },
        ),
      )[0];
      if (existing)
        return { status: "daily-pull-already-recorded", jobId: existing.id };
      const input = hubspotPullInputSchema.parse({
        operation: HUBSPOT_PULL_OPERATION,
        requestedBy: "hubspot-schedule",
        credentialVersion: configured.state.credentialVersion,
        maxPages: configured.state.maxPages,
        mode: "preview-only",
        automation: {
          configurationId: configured.job.id,
          epoch: configured.state.epoch,
          day,
        },
      });
      const job = value(
        await Jobs.create(
          Environment.SERVER,
          {
            provider: "automation",
            requestId,
            input,
            status: "pending",
            output: {
              object: "companies",
              after: null,
              pages: [],
              lease: null,
            },
          },
          { tx: scope },
        ),
      );
      await saveAutomation(scope, configured.job.id, {
        ...configured.state,
        currentJobId: job.id,
        nextDueAt: new Date(Date.now() + HUBSPOT_REFRESH_MS).toISOString(),
      });
      return { status: "started", jobId: job.id };
    },
  );
  if (!staged.success) return staged;
  if (!staged.data.readJob) return { success: true, data: staged.data };
  if (Date.now() + 25_000 > deadline)
    return {
      success: true,
      data: { status: "budget", jobId: staged.data.readJob },
    };
  const result = await runPage({ job: staged.data.readJob }, dependencies);
  if (!result.success) return result;
  return {
    success: true,
    data: {
      status: result.data?.status ?? "unchanged",
      jobId: staged.data.readJob,
    },
  };
};

export const status = () =>
  resultify(async () => {
    const latest = value(
      await Jobs.find(Environment.SERVER, {
        where: operation,
        orderBy: [
          {
            column: schema.outboundIntegrationJob.createdAt,
            direction: "desc",
          },
        ],
        limit: 1,
      }),
    )[0];
    const good = value(
      await Jobs.find(Environment.SERVER, {
        where: and(
          operation,
          eq(schema.outboundIntegrationJob.status, "complete"),
          sql`${schema.outboundIntegrationJob.output}->'applied' is not null`,
        ),
        orderBy: [
          {
            column: sql`${schema.outboundIntegrationJob.output}->>'completedAt'`,
            direction: "desc",
          },
        ],
        limit: 1,
      }),
    )[0];
    const saved = good ? await read(good.id) : null;
    const lastGoodAt = saved?.state.pages[0]?.observedAt ?? null;
    const metadata = value(
      await Credentials.metadata("hubspot", undefined, true),
    );
    const credentialChanged = Boolean(
      saved && saved.input.credentialVersion !== metadata.version,
    );
    const configured = await automation();
    const automationCredentialChanged = Boolean(
      configured &&
        (!metadata.configured ||
          configured.state.credentialVersion !== metadata.version),
    );
    return {
      automatic: Boolean(
        configured?.state.enabled && !automationCredentialChanged,
      ),
      automation: configured
        ? {
            enabled: configured.state.enabled,
            active: configured.state.enabled && !automationCredentialChanged,
            nextDueAt: configured.state.nextDueAt,
            currentJobId: configured.state.currentJobId,
            reason: automationCredentialChanged
              ? "The credential changed; a fresh applied preview must be explicitly enabled."
              : configured.state.reason,
            proof: configured.state.proof,
          }
        : {
            enabled: false,
            active: false,
            nextDueAt: null,
            currentJobId: null,
            reason: "Daily protection has not been enabled.",
            proof: null,
          },
      configured: metadata.configured,
      credentialChanged,
      latest: latest
        ? { jobId: latest.id, status: latest.status, error: latest.error }
        : null,
      lastGood: saved
        ? {
            jobId: saved.job.id,
            observedAt: lastGoodAt,
            completedAt: saved.state.completedAt,
            appliedAt: saved.state.applied!.at,
            exclusions: saved.preview.entries.length,
            unaddressableRecords: saved.preview.unaddressableRecords,
            invalidValues: saved.preview.skipped.length,
          }
        : null,
      stale:
        !lastGoodAt ||
        credentialChanged ||
        Date.now() - Date.parse(lastGoodAt) > HUBSPOT_STALE_MS,
      notice:
        "Key save does not sync CRM data or enable a schedule. Explicit enable requires a fresh applied preview; enabled daily pulls add exclusions only after complete proof. Existing exclusions survive all read failures.",
    };
  });
