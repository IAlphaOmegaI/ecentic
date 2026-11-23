import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { prospectSchema } from "@/lib/outbound";
import {
  type ProspectProgress,
  prospectLifecycles,
} from "@/lib/outbound-prospect-progress";
import {
  PROSPECT_PAGE_SIZE,
  parseProspectQuery,
  prospectsHref,
} from "@/lib/outbound-prospects";
import { requireTestDatabase } from "./helpers/database";

describe("prospect list URLs", () => {
  test("round-trips every filter, punctuation and a shared page", () => {
    const query = parseProspectQuery({
      q: ["  100%_! Beauty & Co  ", "ignored"],
      status: ["held", "active"],
      lifecycle: "sent",
      linkedin: "connected",
      page: "2",
    });
    expect(query).toEqual({
      q: "100%_! Beauty & Co",
      status: "held",
      lifecycle: "sent",
      linkedin: "connected",
      page: 2,
    });
    const url = new URL(prospectsHref(query), "https://outbound.example");
    expect(url.pathname).toBe("/prospects");
    expect(parseProspectQuery(Object.fromEntries(url.searchParams))).toEqual(
      query,
    );
  });
  test.each(["-1", "0", "1.5", "Infinity", "invalid", "9007199254740992"])(
    "normalizes invalid page %s",
    (page) => {
      expect(parseProspectQuery({ page }).page).toBe(1);
    },
  );
  test("normalizes unknown filters and bounds searchable input", () => {
    expect(
      parseProspectQuery({
        status: "missing",
        lifecycle: "starting",
        linkedin: "active",
        page: [],
      }),
    ).toEqual({
      q: "",
      status: "all",
      lifecycle: "all",
      linkedin: "all",
      page: 1,
    });
    const query = parseProspectQuery({ q: `\u0000 ${"x".repeat(220)}` });
    expect(query.q).toHaveLength(200);
    expect(query.q).not.toContain("\u0000");
    expect(prospectsHref()).toBe("/prospects");
    const url = new URL(
      prospectsHref({ q: "https://example.com/?q=x#fragment" }),
      "https://outbound.example",
    );
    expect(url.pathname).toBe("/prospects");
    expect(url.hash).toBe("");
  });
});

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const modules: {
  database?: typeof import("@/server/database");
  prospects?: typeof import("@/server/app/outbound/prospects-read");
} = {};
const active = () => {
  if (!modules.database || !modules.prospects)
    throw new Error("Isolated prospect database was not initialized");
  return { ...modules.database, prospects: modules.prospects };
};
const required = <Value>(
  result: { success: true; data: Value } | { success: false; error: Error },
): Value => {
  if (!result.success) throw result.error;
  return result.data;
};
const identifier = (index: number) =>
  `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const timestamp = new Date("2026-11-21T09:00:00.000Z");
const messages = ([1, 2, 3] as const).map((step) => ({
  step,
  afterDays: (step - 1) * 3,
  subject: "Fixture subject",
  body: `heavy-body-${"x".repeat(4000)}`,
}));
const seeds = Array.from({ length: 67 }, (_, index) => {
  const domain = `prospect-${index + 1}.example`;
  return {
    id: identifier(index + 1),
    details: prospectSchema.parse({
      company:
        index === 65
          ? "100%_! Beauty"
          : `Fixture Brand ${String(index + 1).padStart(3, "0")}`,
      domain,
      country: "US",
      name: `Person ${index + 1}`,
      title: index === 65 ? "Head \\ Growth" : "Head of Growth",
      email: `person@${domain}`,
      linkedinUrl: index === 66 ? "https://www.linkedin.com/in/fixture" : "",
      evidence: `heavy-evidence-${"x".repeat(9000)}`,
    }),
  };
});
type ProspectInsert =
  typeof import("@/server/database").schema.outboundProspect.$inferInsert;
const update = async (index: number, values: Partial<ProspectInsert>) => {
  const { db, schema } = active();
  await db
    .update(schema.outboundProspect)
    .set(values)
    .where(eq(schema.outboundProspect.id, identifier(index)));
};
const job = async (
  index: number,
  status: "pending" | "starting" | "failed" | "uncertain" | "complete",
  options: {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    provider?: "automation" | "apollo";
  } = {},
) => {
  const { db, schema } = active();
  await db.insert(schema.outboundIntegrationJob).values({
    id: options.id,
    prospectId: identifier(index),
    provider: options.provider ?? "automation",
    status,
    input: { operation: "campaignAutomation", hidden: "heavy-job-input" },
    output: { hidden: "heavy-job-output" },
    createdAt: options.createdAt ?? timestamp,
    updatedAt: options.updatedAt ?? timestamp,
  });
};

describe.skipIf(!endpoint)(
  "prospect list isolated PostgreSQL projection",
  () => {
    beforeAll(async () => {
      Object.assign(process.env, {
        DATABASE_URL: requireTestDatabase(endpoint),
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
      });
      mock.module("server-only", () => ({}));
      modules.database = await import("@/server/database");
      modules.prospects = await import("@/server/app/outbound/prospects-read");
    });
    beforeEach(async () => {
      const { db, schema } = active();
      await db.execute(
        sql`truncate outbound_integration_job, outbound_prospect, outbound_person, outbound_company, outbound_suppression cascade`,
      );
      await db.insert(schema.outboundCompany).values(
        seeds.map(({ id, details }) => ({
          id,
          domain: details.domain,
          name: details.company,
          website: `https://${details.domain}`,
          country: "US",
          source: "fixture",
        })),
      );
      await db.insert(schema.outboundPerson).values(
        seeds.map(({ id, details }) => ({
          id,
          companyId: id,
          identityKey: id,
          name: details.name,
          email: details.email,
          title: details.title,
        })),
      );
      await db.insert(schema.outboundProspect).values(
        seeds.map(({ id, details }) => ({
          id,
          companyId: id,
          personId: id,
          details,
          messages,
          createdBy: "fixture",
          createdAt: timestamp,
          updatedAt: timestamp,
          linkedinStatus: "connected" as const,
        })),
      );
      await db.insert(schema.outboundSuppression).values({
        scope: "domain",
        value: "not-in-this-projection.example",
        reason: "heavy-suppression-reason",
        createdBy: "fixture",
      });
    });
    test("returns every page beyond50 with stable ties and clamps requested pages", async () => {
      const { prospects } = active();
      const first = required(await prospects.list());
      const second = required(await prospects.list({ page: 2 }));
      expect(first).toMatchObject({
        total: 67,
        page: 1,
        pageSize: PROSPECT_PAGE_SIZE,
      });
      expect(first.rows.map((row) => row.id)).toEqual(
        seeds.slice(0, 50).map((row) => row.id),
      );
      expect(second.rows.map((row) => row.id)).toEqual(
        seeds.slice(50).map((row) => row.id),
      );
      expect(
        new Set([...first.rows, ...second.rows].map((row) => row.id)).size,
      ).toBe(67);
      expect(
        required(await prospects.list({ page: Number.MAX_SAFE_INTEGER })),
      ).toEqual(second);
      expect(
        required(await prospects.list({ q: "does-not-exist", page: 90 })),
      ).toEqual({ rows: [], total: 0, page: 1, pageSize: 50 });
      await update(67, { updatedAt: new Date(timestamp.getTime() + 1000) });
      expect(required(await prospects.list()).rows[0]?.id).toBe(identifier(67));
    });
    test("searches literal SQL wildcard punctuation across the full set", async () => {
      const { prospects } = active();
      for (const q of ["%", "_", "!", "100%_!", "100%_! beauty", "\\"]) {
        const result = required(await prospects.list({ q }));
        expect(result.total).toBe(1);
        expect(result.rows[0]?.id).toBe(identifier(66));
      }
    });
    test("filters status and LinkedIn before pagination, and combines lifecycle search conditions", async () => {
      const { prospects } = active();
      await update(61, { status: "held" });
      await update(67, { status: "held" });
      expect(
        required(await prospects.list({ status: "held" })).rows.map(
          (row) => row.id,
        ),
      ).toEqual([identifier(61), identifier(67)]);
      expect(
        required(await prospects.list({ linkedin: "connected" })).rows.map(
          (row) => row.id,
        ),
      ).toEqual([identifier(67)]);
      expect(
        required(
          await prospects.list({ status: "held", linkedin: "connected" }),
        ).total,
      ).toBe(1);
      expect(
        required(
          await prospects.list({ lifecycle: "held", q: "does-not-exist" }),
        ).total,
      ).toBe(0);
      await job(66, "pending");
      const researching = required(
        await prospects.list({ lifecycle: "researching", q: "100%_!" }),
      );
      expect(researching.total).toBe(1);
      expect(researching.rows[0]?.id).toBe(identifier(66));
    });
    test("derives all lifecycle labels from the latest automation job by creation time and ID", async () => {
      const { prospects } = active();
      const scheduled = {
        status: "active" as const,
        sentStep: 1,
        approvalHash: "approved",
        nextSendAt: timestamp,
      };
      await update(1, scheduled);
      await job(1, "pending");
      await job(2, "failed", {
        createdAt: new Date(timestamp.getTime() - 1000),
        updatedAt: new Date(timestamp.getTime() + 5000),
      });
      await job(2, "complete");
      await job(3, "uncertain");
      await job(3, "complete", {
        provider: "apollo",
        createdAt: new Date(timestamp.getTime() + 1000),
      });
      await update(4, { status: "held" });
      await job(4, "complete");
      await update(5, { status: "replied", sentStep: 1 });
      await update(6, { ...scheduled, approvalHash: "" });
      await update(7, { ...scheduled, sentStep: 3 });
      await update(8, { ...scheduled, sentStep: 0, nextSendAt: null });
      await update(9, { ...scheduled, status: "approved", sentStep: 0 });
      await job(10, "failed", { id: "latest-tie-a" });
      await job(10, "complete", { id: "latest-tie-b" });
      await job(11, "complete", { id: "latest-tie-c" });
      await job(11, "starting", { id: "latest-tie-d" });
      await update(12, { ...scheduled, sentStep: 0, messages: [] });
      const rows = required(await prospects.list()).rows;
      const scenarios: {
        index: number;
        status: ProspectInsert["status"];
        sentStep: number;
        approvalHash: string | null;
        nextSendAt: string | null;
        research: ProspectProgress["research"];
        messageCount?: number;
      }[] = [
        {
          index: 1,
          status: "active",
          sentStep: 1,
          approvalHash: "approved",
          nextSendAt: timestamp.toISOString(),
          research: "queued",
        },
        {
          index: 2,
          status: "candidate",
          sentStep: 0,
          approvalHash: null,
          nextSendAt: null,
          research: "complete",
        },
        {
          index: 3,
          status: "candidate",
          sentStep: 0,
          approvalHash: null,
          nextSendAt: null,
          research: "uncertain",
        },
        {
          index: 4,
          status: "held",
          sentStep: 0,
          approvalHash: null,
          nextSendAt: null,
          research: "complete",
        },
        {
          index: 5,
          status: "replied",
          sentStep: 1,
          approvalHash: null,
          nextSendAt: null,
          research: null,
        },
        {
          index: 6,
          status: "active",
          sentStep: 1,
          approvalHash: "",
          nextSendAt: timestamp.toISOString(),
          research: null,
        },
        {
          index: 7,
          status: "active",
          sentStep: 3,
          approvalHash: "approved",
          nextSendAt: timestamp.toISOString(),
          research: null,
        },
        {
          index: 8,
          status: "active",
          sentStep: 0,
          approvalHash: "approved",
          nextSendAt: null,
          research: null,
        },
        {
          index: 9,
          status: "approved",
          sentStep: 0,
          approvalHash: "approved",
          nextSendAt: timestamp.toISOString(),
          research: null,
        },
        {
          index: 10,
          status: "candidate",
          sentStep: 0,
          approvalHash: null,
          nextSendAt: null,
          research: "complete",
        },
        {
          index: 11,
          status: "candidate",
          sentStep: 0,
          approvalHash: null,
          nextSendAt: null,
          research: "running",
        },
        {
          index: 12,
          status: "active",
          sentStep: 0,
          approvalHash: "approved",
          nextSendAt: timestamp.toISOString(),
          research: null,
          messageCount: 0,
        },
      ];
      for (const scenario of scenarios) {
        const expected = prospectLifecycles(
          {
            status: scenario.status ?? "candidate",
            sentStep: scenario.sentStep,
            approvalHash: scenario.approvalHash,
            messages: messages.slice(0, scenario.messageCount ?? 3),
          },
          {
            prospectId: identifier(scenario.index),
            nextSendAt: scenario.nextSendAt,
            research: scenario.research,
          },
        );
        expect(
          rows.find((row) => row.id === identifier(scenario.index))?.lifecycles,
        ).toEqual(expected);
      }
      expect(
        required(await prospects.list({ lifecycle: "held" })).rows.map(
          (row) => row.id,
        ),
      ).toEqual([identifier(3), identifier(4)]);
      expect(
        required(await prospects.list({ lifecycle: "researching" })).rows.map(
          (row) => row.id,
        ),
      ).toEqual([identifier(1), identifier(11)]);
      expect(
        required(await prospects.list({ lifecycle: "scheduled" })).rows.map(
          (row) => row.id,
        ),
      ).toEqual([identifier(1), identifier(9)]);
    });
    test("returns only summary keys without bodies, evidence, jobs or suppressions", async () => {
      const { prospects } = active();
      await job(1, "pending");
      const result = required(await prospects.list());
      const keys = [
        "id",
        "company",
        "domain",
        "name",
        "title",
        "email",
        "status",
        "linkedinUrl",
        "linkedinStatus",
        "lifecycles",
      ].sort();
      for (const row of result.rows)
        expect(Object.keys(row).sort()).toEqual(keys);
      expect(JSON.stringify(result)).not.toContain("heavy-");
      expect(JSON.stringify(result).length).toBeLessThan(60000);
    });
  },
);
