import "server-only";

import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import * as HTTP from "@/server/utils/http";
import { IntegrationError } from "./http";
import {
  type AiCapture,
  type AiJob,
  aiCaptureSchema,
  aiJobSchema,
  type PreparedQuery,
  preparedQuerySchema,
  publicUrlSchema,
  type RawCapture,
} from "./live-shopping-contract";
import {
  type Dependencies,
  digest,
  keyValid,
  providerJson,
} from "./live-shopping-http";
import { shoppingPollUrl, shoppingQueryUrl } from "./scrapellm-cooldown";

type CaptureDependencies = Dependencies & { page?: typeof HTTP.page };
const failure = (
  message: string,
  receipt: Record<string, unknown> | null = null,
) => ({
  success: false as const,
  error: new IntegrationError(
    "scrapellm",
    "contract",
    message,
    502,
    null,
    null,
    receipt,
  ),
});

/** A shopper question is a request for an observation, never a claimed personal experience. */
export const prepareQuery = (input: {
  product: { name: string; url: string };
  category: string;
  country: string;
  surface?: PreparedQuery["surface"];
  shopperQuestion?: string;
}): Result<PreparedQuery, IntegrationError> => {
  const query = preparedQuerySchema.safeParse({
    product: input.product,
    category: input.category,
    country: input.country.toUpperCase(),
    surface: input.surface ?? "google_ai_mode",
    prompt:
      input.shopperQuestion?.trim() ||
      `Where can I buy ${input.product.name} in ${input.country.toUpperCase()}, what is its current price, and which variants are available? Compare it with similar ${input.category} products and link to the product pages.`,
  });
  if (
    !query.success ||
    (query.data.surface === "google_ai_mode" &&
      ["JP", "TW"].includes(query.data.country))
  )
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "input",
        "Check the product, shopper question, country and supported AI surface.",
        422,
      ),
    };
  return { success: true, data: query.data };
};

export const startQuery = async (
  {
    apiKey,
    query: input,
    deadline,
  }: { apiKey: string; query: PreparedQuery; deadline?: number },
  dependencies: Dependencies = {},
): Promise<Result<AiJob, IntegrationError>> => {
  if (!keyValid(apiKey))
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "configuration",
        "Save a ScrapeLLM API key before starting research.",
        409,
      ),
    };
  const query = preparedQuerySchema.safeParse(input);
  if (
    !query.success ||
    (query.data.surface === "google_ai_mode" &&
      ["JP", "TW"].includes(query.data.country))
  )
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "input",
        "The saved shopper query is invalid.",
        422,
      ),
    };
  const submittedAt = new Date((dependencies.now ?? Date.now)()).toISOString();
  const response = await providerJson(
    "scrapellm",
    shoppingQueryUrl(query.data),
    {
      method: "POST",
      headers: { "X-API-Key": apiKey },
    },
    { deadline, billable: true },
    dependencies,
  );
  if (!response.success) return response;
  const parsed = z
    .object({ job_id: z.string().uuid(), status: z.literal("pending") })
    .safeParse(response.data.value);
  if (!parsed.success || response.data.raw.status !== 202)
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "uncertain",
        "The provider did not return a usable job identifier. Reconcile this submission before retrying.",
        502,
        null,
        null,
        { response: response.data.raw },
      ),
    };
  return {
    success: true,
    data: { id: parsed.data.job_id, query: query.data, submittedAt },
  };
};

const payloadSchema = z
  .object({
    scraper: z.enum(["google_ai_mode", "chatgpt"]),
    status: z.literal("done"),
    prompt: z.string().optional(),
    country: z.string().optional(),
    result: z.string().nullish(),
    result_markdown: z.string().nullish(),
    markdown_url: z.string().nullish(),
    raw_url: z.string().nullish(),
    cached: z.boolean(),
    citations: z.array(z.unknown()).optional(),
    links: z.array(z.unknown()).optional(),
  })
  .passthrough();
const jobResponseSchema = z
  .object({
    job_id: z.string().uuid(),
    status: z.enum(["pending", "done", "failed"]),
    scraper: z.string(),
    prompt: z.string().optional(),
    country: z.string().optional(),
    created_at: z.string().optional(),
    completed_at: z.string().nullish(),
    result: z.unknown().optional(),
  })
  .passthrough();

const answerLinks = (
  payload: z.infer<typeof payloadSchema>,
  answer: string,
): AiCapture["links"] => {
  const entries = [...(payload.citations ?? []), ...(payload.links ?? [])];
  const structured = entries.flatMap((entry) => {
    const link = z
      .object({
        url: z.string(),
        title: z.string().optional(),
        text: z.string().optional(),
        snippet: z.string().optional(),
      })
      .safeParse(entry);
    if (!link.success || !publicUrlSchema.safeParse(link.data.url).success)
      return [];
    return [
      {
        url: link.data.url,
        title: (link.data.title ?? link.data.text ?? "").slice(0, 1000),
        snippet: (link.data.snippet ?? "").slice(0, 3000),
      },
    ];
  });
  const markdown = [
    ...answer.matchAll(/\[([^\]\n]{0,1000})\]\((https:\/\/[^\s)]+)\)/g),
  ].flatMap((match) =>
    match[2] && publicUrlSchema.safeParse(match[2]).success
      ? [{ url: match[2], title: match[1] ?? "", snippet: "" }]
      : [],
  );
  return [
    ...new Map(
      [...structured, ...markdown].map((entry) => [entry.url, entry]),
    ).values(),
  ].slice(0, 50);
};

// AI Mode embeds product photos as base64 HTML inside its Markdown. Keep the
// complete original in answer/raw, but do not let image bytes crowd exact text
// quotes out of the bounded source excerpt sent to the assessment model.
const sourceText = (answer: string) =>
  answer
    .replace(/<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*>/gi, "")
    .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/gi, "")
    .slice(0, 18000);

export const pollQuery = async (
  {
    apiKey,
    job: input,
    deadline,
  }: { apiKey: string; job: AiJob; deadline?: number },
  dependencies: CaptureDependencies = {},
): Promise<
  Result<
    { status: "pending" } | { status: "captured"; capture: AiCapture },
    IntegrationError
  >
> => {
  const job = aiJobSchema.safeParse(input);
  if (!job.success || !keyValid(apiKey))
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "input",
        "The saved research job or key is invalid.",
        422,
      ),
    };
  const response = await providerJson(
    "scrapellm",
    shoppingPollUrl(job.data),
    {
      headers: { "X-API-Key": apiKey },
    },
    { deadline },
    dependencies,
  );
  if (!response.success) return response;
  const parsed = jobResponseSchema.safeParse(response.data.value);
  if (
    !parsed.success ||
    parsed.data.job_id !== job.data.id ||
    parsed.data.scraper !== job.data.query.surface ||
    (parsed.data.prompt !== undefined &&
      parsed.data.prompt !== job.data.query.prompt) ||
    (parsed.data.country !== undefined &&
      parsed.data.country !== job.data.query.country)
  )
    return failure("The provider job does not match the saved shopper query.", {
      response: response.data.raw,
    });
  if (parsed.data.status === "pending")
    return { success: true, data: { status: "pending" } };
  if (parsed.data.status === "failed")
    return {
      success: false,
      error: new IntegrationError(
        "scrapellm",
        "unavailable",
        "The provider could not complete this shopper query.",
        502,
        null,
        "job_failed",
        { response: response.data.raw },
      ),
    };
  const payload = payloadSchema.safeParse(parsed.data.result);
  if (
    !payload.success ||
    payload.data.scraper !== job.data.query.surface ||
    (payload.data.prompt !== undefined &&
      payload.data.prompt !== job.data.query.prompt) ||
    (payload.data.country !== undefined &&
      payload.data.country !== job.data.query.country)
  )
    return failure("The AI answer has an unexpected or mismatched format.", {
      response: response.data.raw,
    });
  if (payload.data.cached)
    return failure(
      "The provider returned a cached answer. Fresh live research is required.",
      { response: response.data.raw },
    );
  const executed = Date.parse(parsed.data.completed_at ?? "");
  const now = dependencies.now ?? Date.now;
  if (
    !Number.isFinite(executed) ||
    executed < Date.parse(job.data.submittedAt) - 60_000 ||
    executed > now() + 60_000
  )
    return failure(
      "The actual completion time of the AI capture is missing or inconsistent.",
      { response: response.data.raw },
    );

  const hosted: RawCapture[] = [];
  const inline = payload.data.result_markdown?.trim();
  const markdown = await (async () => {
    if (inline) return inline;
    if (!payload.data.markdown_url) return null;
    const url = resultify(() => new URL(payload.data.markdown_url as string));
    if (
      !url.success ||
      url.data.origin !== "https://scrapellm.com" ||
      !/^\/md\/[a-zA-Z0-9_-]+\.md$/.test(url.data.pathname)
    )
      return null;
    const timeout = Math.min(10_000, (deadline ?? now() + 10_000) - now());
    if (timeout <= 0) return null;
    const page = await (dependencies.page ?? HTTP.page)(url.data.href, {
      timeout,
      limit: 200_000,
      strictGuard: true,
      accept: "text/markdown,text/plain",
    });
    if (
      !page.success ||
      page.data.status !== 200 ||
      page.data.url !== url.data.href
    )
      return null;
    hosted.push({
      url: page.data.url,
      status: page.data.status,
      receivedAt: new Date(now()).toISOString(),
      body: page.data.body,
      sha256: digest(page.data.body),
    });
    return page.data.body.trim();
  })();
  const answer = markdown || payload.data.result?.trim();
  if (!answer || answer.length > 200_000)
    return failure("The provider returned no bounded, readable AI answer.", {
      response: response.data.raw,
    });
  const sourceUrl = publicUrlSchema.safeParse(payload.data.raw_url);
  const observedUrl =
    sourceUrl.success &&
    (() => {
      const address = new URL(sourceUrl.data);
      return job.data.query.surface === "google_ai_mode"
        ? /^(?:www\.)?google\.[a-z.]+$/.test(address.hostname)
        : ["chatgpt.com", "chat.openai.com"].includes(address.hostname);
    })()
      ? sourceUrl.data
      : response.data.raw.url;
  const sourceRaw = hosted[0] ?? response.data.raw;
  const captured = aiCaptureSchema.safeParse({
    job: job.data,
    executedAt: new Date(executed).toISOString(),
    receivedAt: response.data.raw.receivedAt,
    answer,
    source: {
      id: `search-${job.data.id}`,
      kind: "search",
      capture: "provider",
      url: observedUrl,
      checkedAt: new Date(executed).toISOString(),
      content: sourceText(answer),
      artifact: `sha256:${sourceRaw.sha256}`,
    },
    links: answerLinks(payload.data, answer),
    cached: false,
    raw: [response.data.raw, ...hosted],
  });
  return captured.success
    ? { success: true, data: { status: "captured", capture: captured.data } }
    : failure("The AI capture did not pass the evidence contract.", {
        response: response.data.raw,
      });
};

export const validateScrapellmCredentials = async ({
  apiKey,
}: {
  apiKey: string;
  deadline?: number;
}): Promise<Result<{ verified: false; reason: string }, IntegrationError>> =>
  keyValid(apiKey)
    ? {
        success: true,
        data: {
          verified: false,
          reason:
            "Saved for the first research check; ScrapeLLM has no documented non-billable key verification endpoint.",
        },
      }
    : {
        success: false,
        error: new IntegrationError(
          "scrapellm",
          "input",
          "Paste the ScrapeLLM API key without spaces.",
          422,
        ),
      };

export const validateFirecrawlCredentials = async (
  { apiKey, deadline }: { apiKey: string; deadline?: number },
  dependencies: Dependencies = {},
): Promise<
  Result<{ verified: true; remainingCredits: number }, IntegrationError>
> => {
  if (!keyValid(apiKey))
    return {
      success: false,
      error: new IntegrationError(
        "firecrawl",
        "input",
        "Paste the Firecrawl API key without spaces.",
        422,
      ),
    };
  // Account usage is read-only and starts no scrape or browser session.
  const response = await providerJson(
    "firecrawl",
    "https://api.firecrawl.dev/v2/team/credit-usage",
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    { deadline },
    dependencies,
  );
  if (!response.success) return response;
  const parsed = z
    .object({
      success: z.literal(true),
      data: z.object({ remainingCredits: z.number().finite() }),
    })
    .safeParse(response.data.value);
  return parsed.success
    ? {
        success: true,
        data: {
          verified: true,
          remainingCredits: parsed.data.data.remainingCredits,
        },
      }
    : {
        success: false,
        error: new IntegrationError(
          "firecrawl",
          "contract",
          "Firecrawl did not return account credit information.",
        ),
      };
};

export {
  generateShopperQuery,
  type ShopperQueryDependencies,
  type ShopperQueryInput,
  type ShopperQuerySelection,
  shopperQueryExcerpts,
  validateShopperQuery,
} from "./shopper-query";
