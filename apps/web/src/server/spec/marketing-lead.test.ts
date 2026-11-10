import { describe, expect, test } from "bun:test";
import { marketingLeadSchema } from "@/lib/marketing-lead";
import {
  deliverMarketingLead,
  leadEmailText,
  leadIdempotencyKey,
} from "../utils/marketing-lead";

const demo = {
  kind: "demo",
  locale: "en",
  topic: "enterprise-demo",
  name: "Sample Person",
  email: "sample@example.com",
  company: "Example Store",
  website: "example.com",
  businessType: "brand",
  catalogSize: "under-1000",
  markets: "Spain",
  goals: "Compare a sample category.",
  aiChannel: "chatgpt",
};

describe("marketing lead delivery", () => {
  test("rejects incomplete or invalid submissions before delivery", async () => {
    const sends: unknown[] = [];
    const dependencies = {
      permission: async () => "allowed" as const,
      send: async (lead: unknown) => {
        sends.push(lead);
        return true;
      },
    };
    expect(
      await deliverMarketingLead({ ...demo, email: "invalid" }, dependencies),
    ).toBe("invalid");
    expect(
      await deliverMarketingLead(
        { ...demo, website: "javascript:alert(1)" },
        dependencies,
      ),
    ).toBe("invalid");
    expect(
      await deliverMarketingLead({ ...demo, goals: "" }, dependencies),
    ).toBe("invalid");
    expect(sends).toHaveLength(0);
  });
  test("does not send when the shared limiter is exhausted or unavailable", async () => {
    const sends: unknown[] = [];
    const send = async (lead: unknown) => {
      sends.push(lead);
      return true;
    };
    expect(
      await deliverMarketingLead(demo, {
        permission: async () => "limited",
        send,
      }),
    ).toBe("limited");
    expect(
      await deliverMarketingLead(demo, {
        permission: async () => "unavailable",
        send,
      }),
    ).toBe("unavailable");
    expect(sends).toHaveLength(0);
  });
  test("reports success only after the sender confirms delivery", async () => {
    expect(
      await deliverMarketingLead(demo, {
        permission: async () => "allowed",
        send: async () => false,
      }),
    ).toBe("unavailable");
    expect(
      await deliverMarketingLead(demo, {
        permission: async () => "allowed",
        send: async () => {
          throw new Error("test transport failure");
        },
      }),
    ).toBe("unavailable");
    expect(
      await deliverMarketingLead(demo, {
        permission: async () => "allowed",
        send: async () => true,
      }),
    ).toBe("sent");
  });
  test("normalizes validated details and gives identical retries the same opaque key", () => {
    const lead = marketingLeadSchema.parse({
      ...demo,
      name: " Sample Person ",
      email: "SAMPLE@example.com",
      ignored: "discard",
    });
    expect(lead.name).toBe("Sample Person");
    expect(lead.email).toBe("sample@example.com");
    expect(lead).not.toHaveProperty("ignored");
    expect(leadIdempotencyKey(lead)).toBe(
      leadIdempotencyKey(marketingLeadSchema.parse(demo)),
    );
    expect(leadIdempotencyKey(lead)).not.toContain("sample@example.com");
    expect(leadEmailText(lead)).toContain("goals: Compare a sample category.");
  });
  test("accepts each supported request shape and refuses unknown enum values", () => {
    const common = {
      locale: "es",
      topic: "test",
      name: "Sample",
      email: "sample@example.com",
      company: "Example",
    };
    expect(
      marketingLeadSchema.safeParse({
        ...common,
        kind: "interest",
        catalogSize: "under-1000",
      }).success,
    ).toBe(true);
    expect(
      marketingLeadSchema.safeParse({ ...common, kind: "interest" }).success,
    ).toBe(false);
    expect(
      marketingLeadSchema.safeParse({
        ...common,
        kind: "integration",
        tool: "Test platform",
        catalogSize: "1000-10000",
      }).success,
    ).toBe(true);
    expect(
      marketingLeadSchema.safeParse({
        ...common,
        kind: "partner",
        website: "example.com",
        track: "agency",
        stores: "12",
        note: "",
      }).success,
    ).toBe(true);
    expect(
      marketingLeadSchema.safeParse({ ...demo, aiChannel: "unrecognized" })
        .success,
    ).toBe(false);
  });
});
