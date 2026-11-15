import type * as Scan from "@/server/app/scan";

const providers = {
  gpt4: { label: "ChatGPT", logo: "/images/chatgpt.svg" },
  gpt: { label: "ChatGPT", logo: "/images/chatgpt.svg" },
  claude: { label: "Claude", logo: "/images/claude.svg" },
  gemini: { label: "Gemini", logo: "/images/gemini.svg" },
  perplexity: { label: "Perplexity", logo: "/images/perplexity.svg" },
} as const;

export const shareOutcome = (wins: number, losses: number) => {
  const total = wins + losses;
  return { total, rate: total > 0 ? Math.round((wins / total) * 100) : null };
};

/** Only recorded outcomes can establish a provider win rate. */
export const shareProviderRows = (modelRates: Scan.ShareData["modelRates"]) =>
  Object.entries(modelRates)
    .filter(([, result]) => result.wins + result.losses > 0)
    .map(([id, result]) => ({
      id,
      ...result,
      ...(id in providers
        ? providers[id as keyof typeof providers]
        : { label: id, logo: null }),
    }));
