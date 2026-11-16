import { cn } from "@zenncore/utils";
import Image from "next/image";
import { type ProviderKey, providerLogos } from "@/content/provider-logos";

export type { ProviderKey } from "@/content/provider-logos";

export const ProviderLogo = ({
  provider,
  className,
  decorative = false,
  fallback = "text",
  label,
}: ProviderLogo.Props) => {
  const artwork = providerLogos[provider];
  if (!artwork.src)
    return fallback === "none" ? null : (
      <span className={className} aria-hidden={decorative || undefined}>
        {label ?? artwork.name}
      </span>
    );
  return (
    <Image
      src={artwork.src}
      alt={decorative ? "" : (label ?? artwork.name)}
      width={artwork.width}
      height={artwork.height}
      className={cn(
        "h-10 w-auto max-w-full rounded-sm object-contain object-left",
        className,
      )}
      unoptimized
    />
  );
};

export namespace ProviderLogo {
  export type Props = {
    provider: ProviderKey;
    className?: string;
    decorative?: boolean;
    fallback?: "text" | "none";
    label?: string;
  };
}
