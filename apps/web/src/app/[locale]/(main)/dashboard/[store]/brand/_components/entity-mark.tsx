import {
  BrandAppleIcon,
  BrandRedditIcon,
  BrandYoutubeIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";

const identities: Record<string, ProviderKey> = {
  chatgpt: "chatgpt",
  openai: "chatgpt",
  gpt: "chatgpt",
  claude: "claude",
  anthropic: "claude",
  gemini: "gemini",
  google: "google",
  perplexity: "perplexity",
  copilot: "copilot",
  microsoft: "microsoft",
  amazon: "amazon",
};

const localMarks: Record<string, string> = {
  sony: "sony",
  samsung: "samsung",
  ikea: "ikea",
  nike: "nike",
  adidas: "adidas",
  dior: "dior",
  starbucks: "starbucks",
  hilton: "hilton",
  airbnb: "airbnb",
  fitbit: "fitbit",
};

const favicons: Record<string, string> = {
  bose: "bose",
  soundcore: "soundcore",
  "anker soundcore": "soundcore",
  "anker / soundcore": "soundcore",
  jbl: "jbl",
  jabra: "jabra",
  beats: "beatsbydre",
  "beats by dre": "beatsbydre",
  beatsbydre: "beatsbydre",
  sennheiser: "sennheiser",
  rtings: "rtings",
  techradar: "techradar",
  theverge: "theverge",
  "the verge": "theverge",
  wirecutter: "wirecutter",
  "nytimes.com/wirecutter": "wirecutter",
};

/** Genuine local identity assets; unknown labels stay initials instead of invented logos. */
export const EntityMark = ({
  name,
  kind = "brand",
  className,
}: {
  name: string;
  kind?: "brand" | "source" | "engine";
  className?: string;
}) => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  const key = normalized.replace(/\.(com|ai|org|net)$/, "");
  const provider = Object.hasOwn(identities, key) ? identities[key] : undefined;
  const mark = Object.hasOwn(localMarks, key) ? localMarks[key] : undefined;
  const favicon = Object.hasOwn(favicons, key) ? favicons[key] : undefined;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase();
  const Icon = (() => {
    switch (true) {
      case key === "apple":
        return BrandAppleIcon;
      case key === "youtube" || key === "youtu.be":
        return BrandYoutubeIcon;
      case key === "reddit":
        return BrandRedditIcon;
      default:
        return null;
    }
  })();
  return (
    <span
      aria-hidden
      data-identity-kind={kind}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-foreground bg-background-rich p-1.5 text-foreground",
        className,
      )}
    >
      {provider ? (
        <ProviderLogo
          provider={provider}
          decorative
          className="size-full max-h-full rounded-none object-center"
        />
      ) : favicon ? (
        <Image
          src={`/images/brand-identities/${favicon}.png`}
          alt=""
          width={36}
          height={36}
          className="size-full object-contain"
          unoptimized
        />
      ) : mark ? (
        <Image
          src={`/images/sector-references/${mark}.svg`}
          alt=""
          width={36}
          height={36}
          className="size-full object-contain"
          unoptimized
        />
      ) : Icon ? (
        <Icon className="size-full" />
      ) : (
        <span className="font-semibold text-foreground-dimmed text-xs">
          {initials}
        </span>
      )}
    </span>
  );
};
