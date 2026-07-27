import { resultify } from "@zenncore/utils";
import type { ModelId } from "@/server/utils/ai";

// Shared contract between the /dev/ai-playground page and its route handler.
// Client-safe: types plus plain data, no server imports at runtime.

export const ENDPOINT = "/api/dev/ai-playground";

export type PlaygroundProvider =
  | "azure"
  | "anthropic"
  | "google"
  | "perplexity";

export type PlaygroundMode = "text" | "object";

export type PlaygroundModel = {
  id: ModelId;
  label: string;
  provider: PlaygroundProvider;
  note?: string;
};

export const PROVIDERS = {
  azure: { label: "Azure OpenAI", accent: "text-primary" },
  anthropic: { label: "Anthropic", accent: "text-warning" },
  google: { label: "Google", accent: "text-success" },
  perplexity: { label: "Perplexity", accent: "text-foreground-dimmed" },
} as const satisfies Record<
  PlaygroundProvider,
  { label: string; accent: string }
>;

// The ids the product features actually run on, so a playground run measures the
// same path production takes. `model()` in server/utils/ai routes by prefix and
// accepts anything else too — unlisted ids go through the custom-id box.
export const MODELS: PlaygroundModel[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "azure",
    note: "resolves to AZURE_DEPLOYMENT_GPT4O",
  },
  { id: "gpt-4", label: "GPT-4", provider: "azure" },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "anthropic",
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    provider: "google",
    note: "preview",
  },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google" },
  { id: "sonar", label: "Sonar", provider: "perplexity" },
  { id: "sonar-pro", label: "Sonar Pro", provider: "perplexity" },
];

// Mirrors the prefix routing inside `model()` so a custom id is labelled with the
// provider it will actually be billed to.
export const providerOf = (id: string): PlaygroundProvider => {
  const slash = id.indexOf("/");
  const prefix = slash === -1 ? id : id.slice(0, slash);

  switch (true) {
    case prefix === "anthropic" || prefix.startsWith("claude"):
      return "anthropic";
    case prefix === "google" || prefix.startsWith("gemini"):
      return "google";
    case prefix === "perplexity" || prefix.startsWith("sonar"):
      return "perplexity";
    default:
      return "azure";
  }
};

export const labelOf = (id: string): string =>
  MODELS.find((model) => model.id === id)?.label ?? id;

export type PlaygroundRun = {
  model: string;
  mode: PlaygroundMode;
  prompt: string;
  instructions?: string;
  // Raw JSON Schema text — parsed and validated by the route, object mode only.
  schema?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
};

export type PlaygroundUsage = {
  input?: number;
  output?: number;
  reasoning?: number;
  cached?: number;
  total?: number;
};

export type PlaygroundEvent =
  | { kind: "text"; delta: string }
  | { kind: "reasoning"; delta: string }
  | { kind: "object"; value: unknown }
  | { kind: "usage"; usage: PlaygroundUsage }
  | { kind: "finish"; reason: string }
  | { kind: "error"; message: string };

export const DEFAULT_INSTRUCTIONS =
  "You are an AI shopping agent comparing products for a buyer.";

export const DEFAULT_PROMPT =
  "A buyer wants a durable everyday backpack under $150. Name the two things you would check on a product listing before recommending it, and why.";

export const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {
    "verdict": { "type": "string", "enum": ["buy", "skip"] },
    "score": { "type": "number", "description": "0-100 confidence" },
    "reasons": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["verdict", "score", "reasons"],
  "additionalProperties": false
}`;

// The route answers in NDJSON — one JSON event per line — so every column owns an
// independent request and can be aborted on its own.
export async function* readEvents(
  response: Response,
): AsyncGenerator<PlaygroundEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  // Chunk boundaries land mid-line, so the tail carries over to the next read.
  const pending = { line: "" };

  const parse = (line: string): PlaygroundEvent | null => {
    if (!line.trim()) return null;
    const event = resultify(() => JSON.parse(line) as PlaygroundEvent);
    return event.success ? event.data : null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending.line += decoder.decode(value, { stream: true });
    const lines = pending.line.split("\n");
    pending.line = lines.pop() ?? "";

    for (const line of lines) {
      const event = parse(line);
      if (event) yield event;
    }
  }

  const last = parse(pending.line);
  if (last) yield last;
}
