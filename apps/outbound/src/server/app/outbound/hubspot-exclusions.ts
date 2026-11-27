import "server-only";
import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  HUBSPOT_PULL_OPERATION,
  HUBSPOT_STALE_MS,
  type HubspotPullState,
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

/** Apply only an explicitly reviewed complete snapshot. Existing exclusions and reasons never change. */
export const apply = (
  actor: string,
  input: { job: string; expectedHash: string },
) =>
  transaction(async (scope) => {
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
  });

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
    return {
      automatic: false,
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
        "Key save does not sync CRM data. Explicit preview and hash-bound apply are required; existing exclusions survive all read failures.",
    };
  });
