import "server-only";

import { resultify } from "@zenncore/utils";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  mailboxConnected,
  registeredSender,
  senderPool,
  splitList,
} from "@/lib/outbound";
import {
  assessMailboxReadiness,
  defaultWarmupPlan,
  type MailboxCheck,
  planWarmup,
  type WarmupPlan,
  warmupPlanSchema,
} from "@/lib/outbound-warmup";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Direct from "@/server/utils/outbound/direct-mailbox";
import * as Google from "@/server/utils/outbound/google";
import * as Readiness from "@/server/utils/outbound/sender-readiness";
import { repository } from "@/server/utils/repository";
import * as Store from "./store";

const ReadinessRecords = repository(schema.outboundMailboxReadiness);
const Inboxes = repository(schema.outboundInbox);
type Inbox = typeof schema.outboundInbox.$inferSelect;
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const synchronized = (inbox?: Inbox) =>
  Boolean(
    inbox?.lastSyncedAt &&
      !inbox.syncMode &&
      Date.now() - inbox.lastSyncedAt.getTime() <= 10 * 60_000,
  );
const readInbox = async (email: string, transaction?: TransactionScope) =>
  value(
    await Inboxes.find(
      Environment.SERVER,
      {
        where: eq(schema.outboundInbox.email, email),
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0];
const transaction = <Data>(
  operation: (scope: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (scope) => {
      await scope.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(scope);
    }),
  );

export type MailboxReadinessRow = {
  email: string;
  active: boolean;
  connected: boolean;
  synchronized: boolean;
  enabled: boolean;
  policyDailyCap: number;
  inboxDailyCap: number;
  planSaved: boolean;
  plan: WarmupPlan;
  dkimSelectors: string[];
  check: MailboxCheck | null;
  preview: ReturnType<typeof planWarmup>;
};
export const getWorkspace = () =>
  resultify(async (): Promise<{ mailboxes: MailboxReadinessRow[] }> => {
    const [policy, inboxes, records] = await Promise.all([
      Store.policy(),
      Inboxes.find(Environment.SERVER),
      ReadinessRecords.find(Environment.SERVER),
    ]);
    const connected = value(inboxes);
    const saved = value(records);
    const active = senderPool(policy.settings);
    const emails = [
      ...new Set([
        ...active,
        ...splitList(policy.settings.inactiveSenderEmails).map((email) =>
          email.toLowerCase(),
        ),
      ]),
    ];
    return {
      mailboxes: emails.map((email) => {
        const inbox = connected.find(
          (entry) => entry.email.toLowerCase() === email,
        );
        const record = saved.find((entry) => entry.id === email);
        const plan = record?.plan ?? defaultWarmupPlan;
        return {
          email,
          active: active.includes(email),
          connected: Boolean(inbox && mailboxConnected(inbox)),
          synchronized: synchronized(inbox),
          enabled: inbox?.enabled ?? false,
          policyDailyCap: policy.settings.dailyCap,
          inboxDailyCap: inbox?.dailyCap ?? policy.settings.dailyCap,
          planSaved: Boolean(record),
          plan,
          dkimSelectors: record?.dkimSelectors ?? [],
          check: record?.lastCheck ?? null,
          preview: planWarmup(plan, {
            healthyDays: 0,
            policyDailyCap: policy.settings.dailyCap,
            inboxDailyCap: inbox?.dailyCap ?? policy.settings.dailyCap,
            usedLast24Hours: 0,
            reservedFollowups: 0,
            providerHold: Boolean(inbox?.error),
          }),
        };
      }),
    };
  });

const verifyConnection = async (
  inbox?: Inbox,
): Promise<MailboxCheck["connection"]> => {
  if (!inbox || !mailboxConnected(inbox)) return "missing";
  if (inbox.transport === "google-app-password") {
    const verified = await Direct.verify({
      email: inbox.email,
      appPassword: inbox.appPassword ?? "",
    });
    return verified.success &&
      verified.data.email.toLowerCase() === inbox.email.toLowerCase()
      ? "verified"
      : "failed";
  }
  const access =
    inbox.accessToken &&
    inbox.accessTokenExpiresAt &&
    inbox.accessTokenExpiresAt.getTime() > Date.now() + 60_000
      ? inbox.accessToken
      : await Google.refreshToken({
          refreshToken: inbox.refreshToken ?? "",
        }).then((token) => (token.success ? token.data.accessToken : null));
  if (!access) return "failed";
  const profile = await Google.getProfile({ accessToken: access });
  return profile.success &&
    profile.data.emailAddress.toLowerCase() === inbox.email.toLowerCase()
    ? "verified"
    : "failed";
};

export const checkMailbox = (
  actor: string,
  input: { email: string; dkimSelectors: string[] },
) =>
  resultify(async (): Promise<MailboxCheck> => {
    const parsed = z
      .object({
        email: emailSchema,
        dkimSelectors: z.array(z.string().trim().min(1).max(100)).max(8),
      })
      .strict()
      .parse(input);
    const policy = await Store.policy();
    if (!registeredSender(parsed.email, policy.settings))
      throw new ValidationError(
        "Save this exact inbox in the Playbook before checking it.",
      );
    const inbox = await readInbox(parsed.email);
    const [dns, connection] = await Promise.all([
      Readiness.checkSendingDomain({
        domain: parsed.email.split("@")[1] ?? "",
        dkimSelectors: parsed.dkimSelectors,
      }),
      verifyConnection(inbox),
    ]);
    const domain = value(dns);
    return value(
      await transaction(async (scope) => {
        const currentPolicy = await Store.policy(scope);
        const current = await readInbox(parsed.email, scope);
        if (
          !registeredSender(parsed.email, currentPolicy.settings) ||
          current?.id !== inbox?.id ||
          current?.connectionVersion !== inbox?.connectionVersion
        )
          throw new ConflictError(
            "The mailbox connection changed during the check. Run it again.",
          );
        const check: MailboxCheck = {
          domain,
          connection,
          checkedAt: new Date().toISOString(),
          connectionVersion: current?.connectionVersion ?? null,
          synchronized: synchronized(current),
          historyConfirmed: currentPolicy.settings.historyConfirmed,
          senderTested: currentPolicy.settings.senderTested,
          report: assessMailboxReadiness({
            domain,
            connected: connection === "verified",
            synchronized: synchronized(current),
            providerError: connection === "failed",
            historyConfirmed: currentPolicy.settings.historyConfirmed,
            senderTested: currentPolicy.settings.senderTested,
          }),
        };
        const previous = value(
          await ReadinessRecords.get(Environment.SERVER, parsed.email, {
            tx: scope,
          }),
        );
        value(
          await ReadinessRecords.upsert(
            Environment.SERVER,
            {
              id: parsed.email,
              plan: previous?.plan ?? defaultWarmupPlan,
              lastCheck: check,
              dkimSelectors: parsed.dkimSelectors,
              checkedAt: new Date(check.checkedAt),
              updatedBy: actor,
              updatedAt: new Date(),
            },
            { target: [schema.outboundMailboxReadiness.id], tx: scope },
          ),
        );
        return check;
      }),
    );
  });

export const savePlan = (
  actor: string,
  input: { email: string; plan: WarmupPlan },
) =>
  transaction(async (scope) => {
    const parsed = z
      .object({ email: emailSchema, plan: warmupPlanSchema })
      .strict()
      .parse(input);
    const policy = await Store.policy(scope);
    if (!registeredSender(parsed.email, policy.settings))
      throw new ValidationError(
        "Save this exact inbox in the Playbook before configuring a plan.",
      );
    if (parsed.plan.enabled)
      throw new ValidationError(
        "Save the plan with warmup off. Connect Warmbly before starting network warmup.",
      );
    const inbox = await readInbox(parsed.email, scope);
    const maximum = Math.min(
      policy.settings.dailyCap,
      inbox?.dailyCap ?? policy.settings.dailyCap,
    );
    if (parsed.plan.maximumDailyCap > maximum)
      throw new ValidationError(
        "The warmup ceiling must fit the Playbook and mailbox limits.",
      );
    const previous = value(
      await ReadinessRecords.get(Environment.SERVER, parsed.email, {
        tx: scope,
      }),
    );
    value(
      await ReadinessRecords.upsert(
        Environment.SERVER,
        {
          id: parsed.email,
          plan: parsed.plan,
          lastCheck: previous?.lastCheck ?? null,
          dkimSelectors: previous?.dkimSelectors ?? [],
          checkedAt: previous?.checkedAt ?? null,
          updatedBy: actor,
          updatedAt: new Date(),
        },
        { target: [schema.outboundMailboxReadiness.id], tx: scope },
      ),
    );
    return { plan: parsed.plan };
  });
