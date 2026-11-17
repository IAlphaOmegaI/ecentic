import "server-only";

import { resultify } from "@zenncore/utils";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { deliveredBody } from "@/lib/outbound";
import {
  parseSentQuery,
  SENT_PAGE_SIZE,
  type SentDetail,
  type SentQueue,
  type SentRow,
  type SentSearchParams,
} from "@/lib/outbound-sent";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { repository, resultifyRead } from "@/server/utils/repository";
import { contentHash } from "./store";

const attempts = schema.outboundSendAttempt;
const prospects = schema.outboundProspect;
const revisions = schema.outboundRevision;
const campaigns = schema.outboundCampaign;
const Events = repository(schema.outboundEvent);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
) => {
  if (!result.success) throw result.error;
  return result.data;
};
const projection = {
  attempt: attempts,
  version: revisions,
  company: sql<string>`${prospects.details}->>'company'`,
  campaignId: prospects.campaignId,
  campaignName: campaigns.name,
  sequenceStatus: prospects.status,
  nextSendAt: prospects.nextSendAt,
};
const joined = () =>
  db
    .select(projection)
    .from(attempts)
    .innerJoin(prospects, eq(prospects.id, attempts.prospectId))
    .leftJoin(campaigns, eq(campaigns.id, prospects.campaignId))
    .leftJoin(
      revisions,
      and(
        eq(revisions.prospectId, attempts.prospectId),
        eq(revisions.revision, attempts.revision),
      ),
    );
type Joined = Awaited<ReturnType<typeof joined>>[number];
const validVersion = (row: Joined) => {
  const version = row.version;
  if (!version || version.contentHash !== row.attempt.contentHash) return null;
  const checked = resultify(() =>
    contentHash(version.messages, version.manifest),
  );
  return checked.success && checked.data === version.contentHash
    ? version
    : null;
};
const toRow = (row: Joined): SentRow => {
  const version = validVersion(row);
  const message = version?.messages.find(
    (message) => message.step === row.attempt.step,
  );
  return {
    id: row.attempt.id,
    prospectId: row.attempt.prospectId,
    company: row.company,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    recipient: message ? (version?.manifest.recipient ?? "") : "",
    sender: message ? (version?.manifest.sender ?? "") : "",
    subject: message?.subject ?? "",
    status: row.attempt.status,
    sequenceStatus: row.sequenceStatus,
    step: row.attempt.step,
    test: row.attempt.test,
    recordedAt: (
      row.attempt.completedAt ?? row.attempt.createdAt
    ).toISOString(),
    acceptedAt:
      row.attempt.status === "accepted"
        ? (row.attempt.completedAt?.toISOString() ?? null)
        : null,
    snapshotAvailable: Boolean(message),
  };
};

export const list = (input: SentSearchParams = {}) =>
  resultify(async (): Promise<SentQueue> => {
    const query = parseSentQuery(input);
    const search = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    const where = and(
      query.campaign ? eq(prospects.campaignId, query.campaign) : undefined,
      query.prospect ? eq(prospects.id, query.prospect) : undefined,
      query.status === "bounced"
        ? eq(prospects.status, "bounced")
        : query.status !== "all"
          ? eq(attempts.status, query.status)
          : undefined,
      query.kind !== "all"
        ? eq(attempts.test, query.kind === "test")
        : undefined,
      query.q
        ? or(
            ilike(sql`${revisions.manifest}->>'recipient'`, search),
            ilike(sql`${revisions.manifest}->>'sender'`, search),
            ilike(sql`${prospects.details}->>'company'`, search),
            ilike(campaigns.name, search),
            sql`exists (select 1 from jsonb_array_elements(${revisions.messages}) message where (message->>'step')::integer = ${attempts.step} and message->>'subject' ilike ${search})`,
          )
        : undefined,
    );
    const total =
      value(
        await resultifyRead(async () =>
          db
            .select({ total: count() })
            .from(attempts)
            .innerJoin(prospects, eq(prospects.id, attempts.prospectId))
            .leftJoin(campaigns, eq(campaigns.id, prospects.campaignId))
            .leftJoin(
              revisions,
              and(
                eq(revisions.prospectId, attempts.prospectId),
                eq(revisions.revision, attempts.revision),
              ),
            )
            .where(where),
        ),
      )[0]?.total ?? 0;
    const page = Math.min(
      query.page,
      Math.max(1, Math.ceil(total / SENT_PAGE_SIZE)),
    );
    const rows = value(
      await resultifyRead(async () =>
        joined()
          .where(where)
          .orderBy(desc(attempts.createdAt), desc(attempts.id))
          .limit(SENT_PAGE_SIZE)
          .offset((page - 1) * SENT_PAGE_SIZE),
      ),
    );
    return { rows: rows.map(toRow), total, page, pageSize: SENT_PAGE_SIZE };
  });

const eventKinds = {
  deliveryAccepted: "sent",
  deliveryFailed: "sendFailed",
  deliveryUncertain: "sendUncertain",
  reply: "reply",
  bounce: "bounce",
  optout: "optout",
} as const;
export const detail = (input: { id: string }) =>
  resultify(async (): Promise<SentDetail | null> => {
    const id = z.string().uuid().parse(input.id);
    const target = value(
      await resultifyRead(async () =>
        joined().where(eq(attempts.id, id)).limit(1),
      ),
    )[0];
    if (!target) return null;
    const [sequenceResult, eventResult] = await Promise.all([
      resultifyRead(async () =>
        joined()
          .where(eq(attempts.prospectId, target.attempt.prospectId))
          .orderBy(attempts.step, attempts.createdAt)
          .limit(100),
      ),
      Events.find(Environment.SERVER, {
        where: and(
          eq(schema.outboundEvent.prospectId, target.attempt.prospectId),
          inArray(schema.outboundEvent.kind, Object.keys(eventKinds)),
        ),
        orderBy: [
          { column: schema.outboundEvent.createdAt, direction: "desc" },
          { column: schema.outboundEvent.id, direction: "desc" },
        ],
        limit: 101,
      }),
    ]);
    const sequence = value(sequenceResult);
    const version = validVersion(target);
    const message = version?.messages.find(
      (message) => message.step === target.attempt.step,
    );
    const first =
      target.attempt.step === 1
        ? target
        : sequence.find(
            (row) =>
              row.attempt.step === 1 && row.attempt.status === "accepted",
          );
    const firstVersion = first ? validVersion(first) : null;
    const original = firstVersion?.messages.find(
      (message) => message.step === 1,
    );
    const body =
      message && original && firstVersion
        ? deliveredBody(message, original, firstVersion.manifest.postalAddress)
        : null;
    const events = value(eventResult);
    return {
      row: toRow(target),
      body,
      fromName: version?.manifest.fromName ?? null,
      messageId: target.attempt.messageId,
      providerMessageId: target.attempt.providerMessageId,
      sequence: sequence.map(toRow),
      nextSendAt: target.nextSendAt?.toISOString() ?? null,
      activity: events.slice(0, 100).map((event) => ({
        id: event.id,
        kind: eventKinds[event.kind as keyof typeof eventKinds],
        recordedAt: event.createdAt.toISOString(),
      })),
      activityLimited: events.length > 100,
    };
  });
