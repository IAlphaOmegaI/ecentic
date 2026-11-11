import { cn } from "@zenncore/utils";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";

/** Holders separate overlapping identities; standalone provider marks stay bare. */
export const PlatformProviderStack = ({
  providers,
  className,
}: {
  providers: readonly ProviderKey[];
  className?: string;
}) => (
  <div className={cn("flex items-center justify-center -space-x-3", className)}>
    {providers.map((provider, index) => (
      <span
        key={provider}
        className="relative grid size-16 shrink-0 place-items-center rounded-full border border-accent-foreground bg-background-rich p-3.5 shadow-[0_6px_12px_-10px_var(--color-emphasis)] max-sm:size-14 max-sm:p-3"
        style={{ zIndex: providers.length - index }}
      >
        <ProviderLogo
          provider={provider}
          decorative
          className="max-h-10 w-full rounded-none object-center"
        />
      </span>
    ))}
  </div>
);
