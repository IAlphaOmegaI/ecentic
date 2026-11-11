"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import Image from "next/image";
import { useEffect, useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { useDocument } from "@/hooks/use-document";
import { Link } from "@/i18n/navigation";

const connectionProviders = [
  "shopify",
  "woocommerce",
  "googleMerchant",
] as const;

const simulationProviders = ["chatgpt", "claude", "gemini"] as const;
const referralProviders = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
] as const;

const ProviderBranch = ({
  providers,
}: {
  providers: readonly ProviderKey[];
}) => (
  <div className="w-full">
    <div className="flex items-center justify-around gap-6">
      {providers.map((provider) => (
        <div
          key={provider}
          className="flex h-14 min-w-0 flex-1 items-center justify-center"
        >
          <ProviderLogo
            provider={provider}
            decorative
            className="h-9 max-w-[92px] rounded-none object-center"
          />
        </div>
      ))}
    </div>
    <div className="mx-auto mt-2 flex w-2/3 justify-between border-primary-text/35 border-b">
      {providers.map((provider) => (
        <span key={provider} className="h-8 w-px bg-primary-text/35" />
      ))}
    </div>
    <div className="mx-auto h-8 w-px bg-primary-text/35" />
  </div>
);

const Record = ({ outlined = false }: { outlined?: boolean }) => (
  <div
    data-outlined={outlined || undefined}
    className="relative flex h-28 w-22 flex-col gap-3 border border-primary-text/50 bg-primary-text px-4 pt-6 text-background-rich data-outlined:bg-transparent data-outlined:text-primary-text"
  >
    <span className="block w-8 border-current border-t-2" />
    <span className="block w-full border-current border-t opacity-50" />
    <span className="block w-2/3 border-current border-t opacity-50" />
    <span className="absolute right-3 bottom-2 font-mono text-xs">{"{}"}</span>
  </div>
);

const Diagram = ({ section }: { section: MarketingPage.Section }) => {
  const items = section.items ?? [];

  switch (section.id) {
    case "connect":
      return (
        <div
          aria-hidden="true"
          className="flex min-h-[320px] flex-col items-center justify-center px-8 py-8"
        >
          <ProviderBranch providers={connectionProviders} />
          <Image
            src="/images/trademark.svg"
            width={1022}
            height={257}
            alt=""
            className="h-auto w-32"
          />
          <div className="h-8 w-px bg-primary-text/35" />
          <div className="flex items-center gap-5 font-mono text-foreground-dimmed text-xs">
            <span>XML / JSON</span>
            <span className="h-4 w-px bg-primary-text/25" />
            <span>CSV</span>
            <span className="h-4 w-px bg-primary-text/25" />
            <span>HTTPS</span>
          </div>
        </div>
      );
    case "simulate":
      return (
        <div
          aria-hidden="true"
          className="flex min-h-[320px] flex-col items-center justify-center px-8 py-8"
        >
          <ProviderBranch providers={simulationProviders} />
          <div className="flex items-center gap-6">
            <Record />
            <span className="text-3xl text-primary-text">×</span>
            <Record outlined />
          </div>
          <p className="mt-6 max-w-[30ch] text-center text-foreground-dimmed text-sm">
            {items[2]?.title}
          </p>
        </div>
      );
    case "fix":
      return (
        <div
          aria-hidden="true"
          className="flex min-h-[320px] flex-col items-center justify-center px-8 py-8"
        >
          <div className="grid w-full grid-cols-2 gap-6 text-center">
            {[items[0], items[1]].map((item) => (
              <div
                key={item?.title}
                className="flex min-w-0 flex-col items-center"
              >
                <Record outlined />
                <p className="mt-4 text-foreground-rich text-sm">
                  {item?.title}
                </p>
                <div className="mt-4 h-8 w-px bg-primary-text/35" />
              </div>
            ))}
          </div>
          <div className="h-px w-1/2 bg-primary-text/35" />
          <div className="h-8 w-px bg-primary-text/35" />
          <div className="flex items-center justify-center gap-10">
            <ProviderLogo
              provider="shopify"
              decorative
              className="h-9 rounded-none"
            />
            <ProviderLogo
              provider="woocommerce"
              decorative
              className="h-7 rounded-none"
            />
          </div>
        </div>
      );
    case "sell":
      return (
        <div
          aria-hidden="true"
          className="relative flex min-h-[320px] flex-col items-center justify-end overflow-hidden px-8 py-8"
        >
          <div className="absolute inset-x-0 top-0 h-[260px] text-primary-text/75">
            <EvolvingAscii artwork="cart" />
          </div>
          <ProviderLogo
            provider="woocommerce"
            decorative
            className="relative mt-[240px] h-7 rounded-none"
          />
        </div>
      );
    case "track":
      return (
        <div
          aria-hidden="true"
          className="flex min-h-[320px] flex-col items-center justify-center px-8 py-8"
        >
          <ProviderBranch providers={referralProviders} />
          <ProviderLogo
            provider="shopify"
            decorative
            className="h-12 rounded-none"
          />
          <div className="mt-6 flex w-full items-center gap-3 font-mono text-primary-text/60 text-xs">
            <span className="h-px flex-1 bg-primary-text/25" />
            <span>↳</span>
            <span className="h-px flex-1 bg-primary-text/25" />
            <span>↳</span>
            <span className="h-px flex-1 bg-primary-text/25" />
          </div>
          <p className="mt-4 max-w-[30ch] text-center text-foreground-dimmed text-sm">
            {items[0]?.title}
          </p>
        </div>
      );
    default:
      return null;
  }
};

export const PlatformExplorer = ({
  sections,
  label,
}: PlatformExplorer.Props) => {
  const [selected, setSelected] = useState(sections[0]?.id ?? "connect");
  const { window } = useDocument();

  useEffect(() => {
    if (!window) return;
    const update = () => {
      const requested = window.location.hash.slice(1);
      if (!sections.some((section) => section.id === requested)) return;
      setSelected(requested);
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [sections, window]);

  return (
    <Tabs
      value={selected}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        setSelected(value);
        window?.history.replaceState(window.history.state, "", `#${value}`);
      }}
      data-platform-explorer
    >
      <div className="relative border-accent-foreground border-b px-7 py-6 max-sm:px-4 max-sm:py-4">
        <MarketingEdgeCrosses edge="bottom" />
        <TabsList aria-label={label} className="w-full">
          {sections.map((section, index) => (
            <Tab
              key={section.id}
              id={section.id}
              value={section.id}
              className="h-auto min-w-0 flex-1 scroll-mt-28 gap-3 px-3 py-4 text-base max-sm:flex-col max-sm:gap-1 max-sm:px-1 max-sm:py-3 max-sm:text-[13px]"
            >
              <span className="text-xs opacity-65">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{section.eyebrow?.replace(/^\[\d+\]\s*/, "")}</span>
            </Tab>
          ))}
          <TabsIndicator />
        </TabsList>
      </div>
      {sections.map((section) => (
        <TabsPanel
          key={section.id}
          value={section.id}
          data-platform-panel={section.id}
          keepMounted
          className="data-[hidden]:hidden"
        >
          <div className="grid grid-cols-[5fr_7fr] max-lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
            <div className="relative flex min-w-0 flex-col border-accent-foreground border-r max-lg:border-r-0 lg:row-span-2 lg:grid lg:grid-rows-subgrid">
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
              <div className="px-7 pt-10 pb-8 max-sm:px-4 max-sm:pt-8">
                <h2 className="text-[clamp(1.9rem,2.6vw,2.6rem)]">
                  {section.title}
                </h2>
                <p className="mt-5 text-foreground-dimmed leading-relaxed">
                  {section.description}
                </p>
                <MarketingActions actions={section.links ?? []} />
              </div>
              <div
                className="relative border-accent-foreground border-t bg-background-dimmed"
                data-platform-diagram={section.id}
              >
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 lg:hidden" />
                <Diagram section={section} />
              </div>
            </div>
            <Accordion
              defaultValue={[section.items?.[0]?.title ?? ""]}
              className="relative min-w-0 justify-start max-lg:border-accent-foreground max-lg:border-t lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:justify-stretch"
            >
              <MarketingEdgeCrosses className="lg:hidden" />
              {[
                section.items?.slice(
                  0,
                  Math.ceil((section.items?.length ?? 0) / 2),
                ) ?? [],
                section.items?.slice(
                  Math.ceil((section.items?.length ?? 0) / 2),
                ) ?? [],
              ].map((items, groupIndex) => (
                <div
                  key={items[0]?.title ?? groupIndex}
                  data-divider={groupIndex === 0 || undefined}
                  className="relative min-w-0 border-accent-foreground data-divider:border-b"
                >
                  {groupIndex === 0 && <MarketingEdgeCrosses edge="bottom" />}
                  {items.map((item, index) => (
                    <AccordionItem
                      key={item.title}
                      value={item.title}
                      className="relative border-accent-foreground last:border-b-0"
                    >
                      {index < items.length - 1 && (
                        <MarketingEdgeCrosses edge="bottom" />
                      )}
                      <AccordionTrigger
                        classList={{
                          root: "font-heading",
                          trigger: {
                            root: "items-center px-7 py-6 text-foreground-rich text-lg leading-snug hover:text-primary-text max-sm:px-4",
                            icon: "mr-0 size-4 shrink-0 text-primary-text transition-transform duration-200 group-data-panel-open:rotate-180",
                          },
                        }}
                      >
                        {item.title}
                      </AccordionTrigger>
                      <AccordionPanel keepMounted>
                        <div className="px-7 pb-6 max-sm:px-4">
                          <p className="max-w-[58ch] text-foreground-dimmed leading-relaxed">
                            {item.body}
                          </p>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="mt-5 inline-flex min-h-10 items-center gap-2 text-primary-text underline underline-offset-4"
                            >
                              {item.label ?? item.title}
                              <ArrowRightIcon className="size-4" />
                            </Link>
                          )}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

export namespace PlatformExplorer {
  export type Props = {
    sections: readonly MarketingPage.Section[];
    label: string;
  };
}
