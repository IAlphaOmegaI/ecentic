import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";

mock.module("server-only", () => ({}));
const Shopping = await import("@/server/utils/outbound/live-shopping");

const now = Date.parse("2026-11-26T12:00:00.000Z");
const queueId = "d7ec7c99-c818-453f-9a70-785a817b2b8b";
const artifactId = "2a834ca5-84b1-40b5-b22b-125c9d8a6d63";
const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
const job = {
  id: queueId,
  submittedAt: new Date(now).toISOString(),
  query: Shopping.preparedQuerySchema.parse({
    product: {
      name: "Synthetic Tote",
      url: "https://synthetic.test/products/tote",
    },
    category: "bags",
    country: "US",
    surface: "google_ai_mode",
    prompt: "large linen bags",
  }),
};
const response = () => ({
  job_id: queueId,
  status: "done",
  scraper: "google_ai_mode",
  prompt: job.query.prompt,
  country: "US",
  created_at: job.submittedAt,
  completed_at: job.submittedAt,
  result: {
    job_id: artifactId,
    scraper: "google_ai_mode",
    status: "done",
    prompt: job.query.prompt,
    country: "US",
    cached: false,
    result_markdown:
      "Synthetic response. [Other tote](https://other.test/tote).",
    markdown_url: `https://scrapellm.com/md/${artifactId}.md`,
    citations: [{ url: "https://other.test/tote", title: "Other tote" }],
  },
});
const capture = async () => {
  const result = await Shopping.pollQuery(
    { apiKey: "synthetic-no-network", job },
    {
      now: () => now,
      request: async () => ({
        success: true,
        data: Response.json(response()),
      }),
    },
  );
  if (!result.success) throw result.error;
  if (result.data.status !== "captured")
    throw new Error("Expected a complete synthetic response.");
  return result.data.capture;
};

describe("separate provider queue and scrape artifact identities", () => {
  test("accepts distinct IDs while replaying the exact outer job and full response", async () => {
    const answer = await capture();
    expect(answer.job.id).toBe(queueId);
    expect(queueId).not.toBe(artifactId);
    expect(answer.raw[0]?.url).toBe(
      `https://api.scrapellm.com/jobs/${queueId}`,
    );
    expect(answer.completeness?.status).toBe("complete");
    expect(
      Shopping.replayShoppingCapture(answer, now).completeness.status,
    ).toBe("complete");
  });

  test("still rejects wrong queue, query, country, surface, cache or execution dates", async () => {
    const original = await capture();
    const mutations: ((body: ReturnType<typeof response>) => void)[] = [
      (body) => {
        body.job_id = artifactId;
      },
      (body) => {
        body.prompt = "another query";
      },
      (body) => {
        body.result.prompt = "another query";
      },
      (body) => {
        body.country = "CA";
      },
      (body) => {
        body.result.country = "CA";
      },
      (body) => {
        body.scraper = "chatgpt";
      },
      (body) => {
        body.result.scraper = "chatgpt";
      },
      (body) => {
        body.result.cached = true;
      },
      (body) => {
        body.created_at = new Date(now - 86_400_000).toISOString();
      },
      (body) => {
        body.completed_at = new Date(now - 86_400_000).toISOString();
      },
    ];
    for (const mutate of mutations) {
      const body = response();
      mutate(body);
      const changed = structuredClone(original);
      const raw = changed.raw[0];
      if (!raw) throw new Error("Expected saved synthetic raw response.");
      raw.body = JSON.stringify(body);
      raw.sha256 = digest(raw.body);
      changed.source.artifact = `sha256:${raw.sha256}`;
      expect(
        Shopping.replayShoppingCapture(changed, now).completeness.status,
      ).not.toBe("complete");
    }
  });

  test("still rejects changed raw bytes, poll URL, answer or citation projection", async () => {
    const original = await capture();
    const mutations: ((answer: typeof original) => void)[] = [
      (answer) => {
        if (answer.raw[0]) answer.raw[0].body += " ";
      },
      (answer) => {
        if (answer.raw[0])
          answer.raw[0].url = `https://api.scrapellm.com/jobs/${artifactId}`;
      },
      (answer) => {
        answer.answer += " another product";
      },
      (answer) => {
        answer.links.push({
          url: "https://added.test",
          title: "Added",
          snippet: "",
        });
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(original);
      mutate(changed);
      expect(
        Shopping.replayShoppingCapture(changed, now).completeness.status,
      ).not.toBe("complete");
    }
  });
});
