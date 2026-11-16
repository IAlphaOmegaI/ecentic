import {
  BrandAppleIcon,
  BrandRedditIcon,
  BrandYoutubeIcon,
  CommerceBookOpenIcon,
  CommerceFilePenIcon,
  GlobeIcon,
  PhotoIcon,
  RobotIcon,
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

/** Real identity assets take precedence; generic sources use a subject icon. */
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
  const Icon = (() => {
    switch (true) {
      case key === "apple":
        return BrandAppleIcon;
      case key === "youtube" || key === "youtu.be":
        return BrandYoutubeIcon;
      case key === "reddit":
        return BrandRedditIcon;
      case kind === "source" &&
        /review|editorial|publication|article/.test(key):
        return CommerceBookOpenIcon;
      case kind === "source" &&
        /manufacturer|product page|specification|documentation/.test(key):
        return CommerceFilePenIcon;
      case kind === "source":
        return GlobeIcon;
      case kind === "engine":
        return RobotIcon;
      default:
        return PhotoIcon;
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
      ) : (
        <Icon className="size-full text-foreground-dimmed" />
      )}
    </span>
  );
};
