import type { ProviderKey } from "@/content/provider-logos";

const SOURCES: {
  name: string;
  provider?: ProviderKey;
  types: readonly string[];
}[] = [
  {
    name: "ChatGPT / OpenAI",
    provider: "chatgpt",
    types: [
      "chatgpt-referral",
      "chatgpt-user",
      "chatgpt-agent",
      "gptbot",
      "oai-searchbot",
    ],
  },
  {
    name: "Claude / Anthropic",
    provider: "claude",
    types: ["claude-referral", "claude-user", "claudebot", "claude-searchbot"],
  },
  {
    name: "Perplexity",
    provider: "perplexity",
    types: [
      "perplexity-referral",
      "perplexity-user",
      "perplexity-comet",
      "perplexitybot",
    ],
  },
  {
    name: "Google",
    provider: "google",
    types: ["gemini-referral", "google-extended", "googlebot"],
  },
  {
    name: "Microsoft Copilot",
    provider: "copilot",
    types: ["copilot-referral"],
  },
  { name: "You.com", types: ["you-referral"] },
  { name: "Amazon", provider: "amazon", types: ["amazonbot"] },
  { name: "ByteDance", types: ["bytespider"] },
];

type TrafficEntry = { agentType: string; count: number };

/** Shared by Overview and Results so referral/request boundaries stay identical. */
export const getTrafficBreakdown = (
  entries: readonly TrafficEntry[],
  otherLabel: string,
) => {
  const referrals = entries
    .filter((entry) => entry.agentType.endsWith("-referral"))
    .reduce((total, entry) => total + entry.count, 0);
  const probes = entries
    .filter((entry) => entry.agentType === "probe-ping")
    .reduce((total, entry) => total + entry.count, 0);
  const requests = entries
    .filter(
      (entry) =>
        !entry.agentType.endsWith("-referral") &&
        entry.agentType !== "probe-ping",
    )
    .reduce((total, entry) => total + entry.count, 0);
  const knownTypes = new Set(SOURCES.flatMap((source) => source.types));
  const sources = [
    ...SOURCES,
    {
      name: otherLabel,
      provider: undefined,
      types: entries
        .filter(
          (entry) =>
            !knownTypes.has(entry.agentType) &&
            entry.agentType !== "probe-ping",
        )
        .map((entry) => entry.agentType),
    },
  ]
    .map((source) => {
      const matching = entries.filter((entry) =>
        source.types.includes(entry.agentType),
      );
      return {
        name: source.name,
        provider: source.provider,
        referrals: matching
          .filter((entry) => entry.agentType.endsWith("-referral"))
          .reduce((total, entry) => total + entry.count, 0),
        requests: matching
          .filter((entry) => !entry.agentType.endsWith("-referral"))
          .reduce((total, entry) => total + entry.count, 0),
      };
    })
    .filter((source) => source.referrals + source.requests > 0)
    .sort(
      (first, second) =>
        second.referrals + second.requests - first.referrals - first.requests,
    );
  return { referrals, requests, probes, sources };
};
