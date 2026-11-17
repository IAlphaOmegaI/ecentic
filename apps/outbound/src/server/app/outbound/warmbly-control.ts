import "server-only";

import { resultify } from "@zenncore/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { registeredSender } from "@/lib/outbound";
import { type WarmupPlan, warmupPlanSchema } from "@/lib/outbound-warmup";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Warmbly from "@/server/utils/outbound/warmbly";
import { repository } from "@/server/utils/repository";
import * as Jobs from "./jobs";
import * as Credentials from "./provider-credentials";
import * as Store from "./store";

const Readiness = repository(schema.outboundMailboxReadiness);
const Inboxes = repository(schema.outboundInbox);
const NetworkJobs = repository(schema.outboundIntegrationJob);
const actionSchema = z.enum(["start", "pause", "resume", "stop"]);
export type Action = z.infer<typeof actionSchema>;
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const expectedState = (action: Action) =>
  action === "start" || action === "resume"
    ? "running"
    : action === "pause"
      ? "paused"
      : "off";
const capsMatch = (mailbox: Warmbly.WarmblyMailbox, plan: WarmupPlan) =>
  mailbox.initialDailyCap === plan.initialDailyCap &&
  mailbox.maximumDailyCap === plan.maximumDailyCap &&
  mailbox.dailyIncrease === plan.dailyIncrease;
const pending = () =>
  NetworkJobs.find(Environment.SERVER, {
    where: and(
      eq(schema.outboundIntegrationJob.provider, "warmbly"),
      inArray(schema.outboundIntegrationJob.status, [
        "starting",
        "pending",
        "uncertain",
      ]),
    ),
    orderBy: [
      { column: schema.outboundIntegrationJob.createdAt, direction: "asc" },
    ],
    limit: 20,
  });

export const saveKey = (actor: string, input: { apiKey: string }) =>
  Credentials.save(actor, { provider: "warmbly", apiKey: input.apiKey });

const stageSchema = z.enum([
  "prepared",
  "configuring",
  "configured",
  "dispatching",
  "confirming",
]);
type Stage = z.infer<typeof stageSchema>;
/** A live worker owns this lock through its network calls. Process/connection exit releases it. */
const withLease = <Data>(
  operation: (lease: TransactionScope) => Promise<Data>,
) =>
  db.transaction(async (lease) => {
    const rows = await lease.execute<{ acquired: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtext('ecentic-outbound-warmbly')) as acquired`,
    );
    if (!rows[0]?.acquired) return { acquired: false as const };
    return { acquired: true as const, data: await operation(lease) };
  });
const checkpoint = async (
  lease: TransactionScope,
  job: string,
  stage: Stage,
) => {
  // The lock's connection must still be alive before another external mutation.
  await lease.execute(sql`select 1`);
  value(await Jobs.update(job, { output: { stage } }));
  await lease.execute(sql`select 1`);
};

const reconcile = async (
  jobs: Jobs.Job[],
  settings: Awaited<ReturnType<typeof Store.policy>>["settings"],
  lease: TransactionScope,
) => {
  for (const job of jobs) {
    const request = z
      .object({
        email: z.email(),
        id: z.string().uuid(),
        action: actionSchema,
        plan: warmupPlanSchema.nullable(),
      })
      .safeParse(job.input);
    if (!request.success || !registeredSender(request.data.email, settings))
      continue;
    await lease.execute(sql`select 1`);
    const parsedStage = stageSchema.safeParse(
      job.output?.["stage"] ?? job.input["initialStage"],
    );
    // Older journals did not record stages; their lifecycle outcome stays uncertain.
    const stage = parsedStage.success ? parsedStage.data : "dispatching";
    if (stage === "prepared" || stage === "configured") {
      value(
        await Jobs.update(job.id, {
          status: "failed",
          error:
            "Warmup setup stopped before sending a lifecycle request. Review and start it again.",
          output: { stage },
        }),
      );
      continue;
    }
    // Obtaining the execution lock proves no local worker still owns this job.
    if (job.status === "starting" || job.status === "pending")
      value(
        await Jobs.update(job.id, {
          status: "uncertain",
          error:
            "Warmbly outcome needs a status refresh before another action.",
        }),
      );
    const remote = await Warmbly.getMailboxWarmup({ id: request.data.id });
    if (!remote.success || remote.data.email !== request.data.email) continue;
    if (stage === "configuring") {
      if (request.data.plan && capsMatch(remote.data, request.data.plan))
        value(
          await Jobs.update(job.id, {
            status: "failed",
            output: { stage: "configured", mailbox: remote.data },
            error:
              "Warmup settings were saved, but warmup was not started. Review and start it explicitly.",
          }),
        );
      continue;
    }
    if (
      remote.data.state !== expectedState(request.data.action) ||
      (request.data.plan && !capsMatch(remote.data, request.data.plan))
    )
      continue;
    value(
      await Jobs.update(job.id, {
        status: "complete",
        output: { stage: "confirming", mailbox: remote.data },
        error: null,
      }),
    );
  }
};

export const getNetwork = (input: { cursor?: string } = {}) =>
  resultify(async () => {
    const parsed = z
      .object({ cursor: z.string().min(1).max(2000).optional() })
      .strict()
      .parse(input);
    const [metadata, policy] = await Promise.all([
      Credentials.metadata("warmbly"),
      Store.policy(),
    ]);
    const configuration = value(metadata);
    const page = configuration.configured
      ? value(await Warmbly.getMailboxes({ cursor: parsed.cursor, limit: 50 }))
      : { mailboxes: [], hasMore: false, nextCursor: null };
    const mailboxes = page.mailboxes.filter(
      (mailbox) =>
        mailbox.email && registeredSender(mailbox.email, policy.settings),
    );
    if (configuration.configured)
      await withLease(async (lease) =>
        reconcile(value(await pending()), policy.settings, lease),
      );
    const remaining = value(await pending());
    return {
      configured: configuration.configured,
      mailboxes,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
      pendingJobs: remaining.map((job) => ({
        id: job.id,
        email:
          typeof job.input["email"] === "string" ? job.input["email"] : null,
        action:
          typeof job.input["action"] === "string" ? job.input["action"] : null,
        status: job.status,
        error: job.error,
      })),
    };
  });

const prepare = (email: string, starting: boolean) =>
  db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    const policy = await Store.policy(transaction);
    if (!registeredSender(email, policy.settings))
      throw new ValidationError(
        "Save this exact mailbox in the Playbook before managing its warmup.",
      );
    const inbox = value(
      await Inboxes.find(
        Environment.SERVER,
        { where: eq(schema.outboundInbox.email, email), limit: 1 },
        { tx: transaction },
      ),
    )[0];
    const readiness = value(
      await Readiness.get(Environment.SERVER, email, { tx: transaction }),
    );
    if (starting && !readiness)
      throw new ValidationError(
        "Save a warmup plan and run a mailbox check before starting warmup.",
      );
    const plan = starting ? warmupPlanSchema.parse(readiness?.plan) : null;
    if (starting) {
      const check = readiness?.lastCheck;
      const age = Date.now() - Date.parse(check?.checkedAt ?? "");
      if (
        !inbox ||
        !check ||
        check.connection !== "verified" ||
        check.connectionVersion !== inbox.connectionVersion ||
        !Number.isFinite(age) ||
        age < 0 ||
        age >= 24 * 3600_000 ||
        [
          check.domain.mx,
          check.domain.spf,
          check.domain.dkim,
          check.domain.dmarc,
        ].some((record) => record.state !== "present")
      )
        throw new ValidationError(
          "Run a fresh mailbox check and resolve MX, SPF, DKIM and DMARC before starting warmup.",
        );
      if (
        plan &&
        plan.maximumDailyCap >
          Math.min(policy.settings.dailyCap, inbox.dailyCap)
      )
        throw new ValidationError(
          "The warmup ceiling exceeds the Playbook or mailbox limit.",
        );
    }
    // Warmbly traffic is external to the local ledger. Disable local delivery first.
    if (inbox)
      value(
        await Inboxes.update(
          Environment.SERVER,
          inbox.id,
          { enabled: false, updatedAt: new Date() },
          { tx: transaction },
        ),
      );
    return plan;
  });

export const control = (actor: string, input: { id: string; action: Action }) =>
  resultify(async () => {
    const execution = await withLease(async (lease) => {
      const parsed = z
        .object({ id: z.string().uuid(), action: actionSchema })
        .strict()
        .parse(input);
      const mailbox = value(await Warmbly.getMailboxWarmup({ id: parsed.id }));
      const policy = await Store.policy();
      if (!mailbox.email || !registeredSender(mailbox.email, policy.settings))
        throw new ValidationError(
          "This Warmbly mailbox is not registered in the Playbook.",
        );
      // An explicit read can finish an earlier uncertain receipt; never replay its mutation.
      await reconcile(value(await pending()), policy.settings, lease);
      const starting = parsed.action === "start" || parsed.action === "resume";
      if (
        (parsed.action === "start" && mailbox.state !== "off") ||
        (parsed.action === "resume" && mailbox.state !== "paused")
      )
        throw new ValidationError(
          "Refresh Warmbly status before choosing start or resume for this mailbox.",
        );
      if (
        (parsed.action === "pause" || parsed.action === "stop") &&
        mailbox.state === expectedState(parsed.action)
      ) {
        await prepare(mailbox.email, false);
        return { mailbox, job: null };
      }
      if (parsed.action === "pause" && mailbox.state !== "running")
        throw new ValidationError(
          "Only a running Warmbly mailbox can be paused.",
        );
      if (starting && mailbox.status !== "active")
        throw new ValidationError(
          "The mailbox must be active in Warmbly before starting warmup.",
        );
      const plan = await prepare(mailbox.email, starting);
      const job = value(
        await Jobs.reserve("warmbly", null, {
          email: mailbox.email,
          ...parsed,
          plan,
          actor,
          initialStage: "prepared",
        }),
      );
      const receipt: { accepted: boolean; attempted: boolean; stage: Stage } = {
        accepted: false,
        attempted: false,
        stage: "prepared",
      };
      const performed = await resultify(async () => {
        await checkpoint(lease, job.id, "prepared");
        if (plan) {
          await checkpoint(lease, job.id, "configuring");
          receipt.stage = "configuring";
          const configured = value(
            await Warmbly.configureMailboxWarmup({ id: parsed.id, plan }),
          );
          receipt.stage = "configured";
          await checkpoint(lease, job.id, "configured");
          const observed = capsMatch(configured, plan)
            ? configured
            : value(await Warmbly.getMailboxWarmup({ id: parsed.id }));
          if (observed.email !== mailbox.email || !capsMatch(observed, plan))
            throw new ConflictError(
              "Warmbly has not confirmed the configured ramp. Refresh its status before retrying.",
            );
        }
        const currentPlan = await prepare(mailbox.email as string, starting);
        if (JSON.stringify(currentPlan) !== JSON.stringify(plan))
          throw new ConflictError(
            "The warmup plan changed during setup. Refresh before starting it.",
          );
        await checkpoint(lease, job.id, "dispatching");
        receipt.stage = "dispatching";
        receipt.attempted = true;
        value(await Warmbly.changeMailboxWarmup(parsed));
        receipt.accepted = true;
        receipt.stage = "confirming";
        await checkpoint(lease, job.id, "confirming");
        const observed = value(
          await Warmbly.getMailboxWarmup({ id: parsed.id }),
        );
        if (
          observed.email !== mailbox.email ||
          observed.state !== expectedState(parsed.action) ||
          (plan && !capsMatch(observed, plan))
        )
          throw new ConflictError(
            "Warmbly has not confirmed the requested state. Refresh to reconcile it before retrying.",
          );
        return observed;
      });
      if (!performed.success) {
        const rejected =
          !receipt.accepted &&
          "code" in performed.error &&
          ["access", "input", "quota", "rate-limit"].includes(
            String(performed.error.code),
          );
        const localAbort =
          !receipt.attempted && receipt.stage !== "configuring";
        // Explicit rejection is retryable after correction; interrupted/ambiguous outcomes need a read.
        value(
          await Jobs.update(job.id, {
            status: rejected || localAbort ? "failed" : "uncertain",
            error: localAbort
              ? "Warmup setup stopped before sending a lifecycle request. Review and start it again."
              : rejected
                ? "Warmbly declined this action. Check the account permissions and limits."
                : "Warmbly outcome needs a status refresh before another action.",
            output: { stage: receipt.stage },
          }),
        );
        throw performed.error;
      }
      value(
        await Jobs.update(job.id, {
          status: "complete",
          output: { stage: "confirming", mailbox: performed.data },
          error: null,
        }),
      );
      return { mailbox: performed.data, job: job.id };
    });
    if (!execution.acquired)
      throw new ConflictError(
        "A Warmbly operation is still running. Refresh its status before another action.",
      );
    return execution.data;
  });
