"use client";

import { cn } from "@zenncore/utils";
import Image from "next/image";
import { type CSSProperties, type ReactNode, useState } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";
import { EvolvingAscii } from "./evolving-ascii";
import { useInteractive } from "./interactive/use-interactive";
import { type ProviderKey, ProviderLogo } from "./provider-logo";

/** A route into the catalog, rather than a claim that every provider is a live integration. */
export const ProviderArc = ({
  items,
  label,
  center,
  className,
  artwork,
}: ProviderArc.Props) => {
  const { ready, reduced } = useInteractive();
  const [active, setActive] = useState<ProviderKey | null>(null);
  const split = Math.ceil(items.length / 2);

  if (!items.length) return null;

  return (
    <div
      data-provider-arc=""
      className={cn(
        "relative isolate min-w-0 border-accent-foreground border-t bg-background",
        className,
      )}
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden bg-radial-[at_50%_100%] from-primary/7 via-primary/2 to-transparent"
      >
        {artwork && (
          <div className="absolute inset-x-[17%] -top-20 bottom-4 text-primary/25 [mask-image:linear-gradient(180deg,black_30%,transparent_100%)] max-lg:inset-0 max-lg:opacity-50">
            <EvolvingAscii artwork={artwork} fit="contain" />
          </div>
        )}
        <svg
          viewBox="0 0 1200 360"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-4 hidden h-[360px] w-full text-primary/25 lg:block"
        >
          <path
            d="M 0 50 Q 250 212.5 500 239.583 M 700 239.583 Q 950 212.5 1200 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="relative z-1 flex flex-col items-center gap-5 px-4 pt-8 pb-7 lg:absolute lg:top-[224px] lg:left-1/2 lg:w-52 lg:-translate-x-1/2 lg:p-0">
        <Image
          src="/images/trademark.svg"
          alt="ecentic"
          width={1022}
          height={257}
          className="h-auto w-36 max-w-full lg:w-40"
        />
        {center}
      </div>
      <ul
        aria-label={label}
        className="relative m-0 grid list-none grid-cols-3 gap-x-1 gap-y-8 px-3 pt-4 pb-10 sm:px-5 lg:block lg:h-[360px] lg:p-0 min-[381px]:grid-cols-4"
      >
        {items.map((item, index) => {
          const position = (() => {
            const side = index < split ? 0 : 1;
            const count = side === 0 ? split : items.length - split;
            const offset = side === 0 ? index : index - split;
            const progress = count < 2 ? 0.5 : offset / (count - 1);
            const horizontal =
              side === 0 ? 7 + progress * 30 : 63 + progress * 30;
            const fraction = horizontal / 100;
            return {
              horizontal,
              vertical: 66 + 780 * fraction * (1 - fraction) - 100,
              mobile: index % 4 === 1 || index % 4 === 2 ? 14 : 0,
            };
          })();
          const name = item.label ?? providerLogos[item.provider].name;
          const selected = active === item.provider;

          return (
            <li
              key={item.provider}
              className="relative top-(--provider-mobile-small) min-w-0 lg:absolute lg:top-(--provider-top) lg:left-(--provider-left) lg:w-[104px] lg:-translate-x-1/2 min-[381px]:top-(--provider-mobile)"
              style={
                {
                  "--provider-left": `${position.horizontal}%`,
                  "--provider-top": `${position.vertical}px`,
                  "--provider-mobile": `${position.mobile}px`,
                  "--provider-mobile-small": index % 3 === 1 ? "14px" : "0px",
                } as CSSProperties
              }
            >
              <Link
                href={item.href}
                aria-label={name}
                className="group/provider relative flex min-h-24 min-w-0 flex-col items-center justify-start text-center text-foreground-dimmed outline-offset-8 hover:text-primary-text focus-visible:text-primary-text"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setActive(item.provider);
                }}
                onPointerLeave={() => setActive(null)}
              >
                <Motion.Item
                  initial={false}
                  animate={{
                    transform:
                      ready && !reduced && selected
                        ? "translateY(-5px)"
                        : "translateY(0px)",
                  }}
                  transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
                  className="flex min-w-0 flex-col items-center gap-3"
                >
                  <span className="flex h-11 w-full items-center justify-center lg:h-12">
                    <ProviderLogo
                      provider={item.provider}
                      decorative
                      fallback="none"
                      className={cn(
                        "h-auto max-h-10 max-w-[62px] shrink-0 rounded-none object-center sm:max-w-20 lg:max-h-11 lg:max-w-[92px]",
                        providerLogos[item.provider].width /
                          providerLogos[item.provider].height >
                          6 && "min-w-24 lg:min-w-28",
                      )}
                    />
                  </span>
                  <span className="max-w-full text-[11px] leading-tight sm:text-xs">
                    {name}
                  </span>
                </Motion.Item>
                <span
                  aria-hidden
                  className="absolute top-24 left-1/2 hidden h-2 w-2 -translate-x-1/2 text-primary/45 group-hover/provider:text-primary group-focus-visible/provider:text-primary lg:block"
                >
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-current" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export namespace ProviderArc {
  export type Props = {
    items: readonly {
      provider: ProviderKey;
      href: string;
      label?: string;
    }[];
    label: string;
    center?: ReactNode;
    artwork?: EvolvingAscii.Kind;
    className?: string;
  };
}
