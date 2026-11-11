"use client";

import { ArrowRightIcon, CommerceCode_3Icon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useEffect, useState } from "react";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { useDocument } from "@/hooks/use-document";
import { Link } from "@/i18n/navigation";
import { PlatformStageArtwork, platformStageIcons } from "./stage-artwork";

const StagePanel = ({ section }: { section: MarketingPage.Section }) => (
  <div className="relative grid min-w-0 border-[var(--rail-color)] border-t lg:grid-cols-[2fr_3fr]">
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <div className="relative isolate flex min-w-0 flex-col bg-linear-to-br from-primary-dimmed/70 via-emphasis-dimmed to-emphasis-dimmed lg:border-[var(--rail-color)] lg:border-r">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-1 bg-radial-[ellipse_at_50%_78%] from-primary/15 via-transparent to-transparent"
      />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
      <div className="px-7 pt-10 max-sm:px-5 max-sm:pt-8">
        <p className="mb-4 text-primary-rich text-sm">{section.eyebrow}</p>
        <h2 className="text-[clamp(1.9rem,2.6vw,2.6rem)] text-background-rich">
          {section.title}
        </h2>
        <p className="mt-5 text-background-rich/75 leading-relaxed">
          {section.description}
        </p>
        <MarketingActions actions={section.links ?? []} />
      </div>
      <div className="mt-auto pt-6">
        <PlatformStageArtwork kind={section.id ?? "connect"} />
      </div>
    </div>
    <div className="relative grid min-w-0 grid-cols-2 max-sm:grid-cols-1 max-lg:border-[var(--rail-color)] max-lg:border-t">
      {section.items?.map((item, index, items) => (
        <article
          key={item.title}
          className={cn(
            "relative flex min-w-0 flex-col border-[var(--rail-color)] border-b bg-emphasis-dimmed p-7 max-sm:p-5 sm:odd:border-r",
            index >= items.length - (items.length % 2 || 2) && "sm:border-b-0",
            index === items.length - 1 && "border-b-0",
            items.length % 2 === 1 &&
              index === items.length - 1 &&
              "sm:col-span-2 sm:border-r-0",
          )}
        >
          <Plus
            className={cn(
              "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
              index === 0 && "lg:hidden",
            )}
          />
          {(index % 2 === 1 || index === items.length - 1) && (
            <Plus
              className={cn(
                "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                index === 1 && "lg:hidden",
              )}
            />
          )}
          {index % 2 === 0 && index !== items.length - 1 && (
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 sm:hidden" />
          )}
          {items.length % 2 === 0 && index === items.length - 2 && (
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-sm:hidden" />
          )}
          {items.length % 2 === 1 && index === items.length - 1 && (
            <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-sm:hidden" />
          )}
          <h3 className="text-background-rich text-xl leading-snug">
            {item.title}
          </h3>
          <p className="mt-4 text-background-rich/70 text-sm leading-relaxed">
            {item.body}
          </p>
          {item.href && (
            <Link
              href={item.href}
              className="mt-auto flex min-h-12 items-center justify-between gap-3 pt-6 font-medium text-primary-rich text-sm transition-colors hover:text-background-rich focus-visible:outline-2 focus-visible:outline-primary-rich"
            >
              {item.label ?? item.title}
              <ArrowRightIcon className="size-4 shrink-0" />
            </Link>
          )}
        </article>
      ))}
    </div>
  </div>
);

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
      if (sections.some((section) => section.id === requested))
        setSelected(requested);
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [sections, window]);
  return (
    <>
      <Tabs
        value={selected}
        onValueChange={(value) => {
          if (typeof value !== "string") return;
          setSelected(value);
          window?.history.replaceState(window.history.state, "", `#${value}`);
        }}
        data-platform-explorer
        className="relative border-[var(--rail-color)] border-y"
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <TabsList
          aria-label={label}
          className="grid w-full grid-cols-5 overflow-visible rounded-none border-0 max-sm:grid-cols-2"
        >
          {sections.map((section, index) => {
            const Icon =
              platformStageIcons[
                section.id as keyof typeof platformStageIcons
              ] ?? CommerceCode_3Icon;
            return (
              <Tab
                key={section.id}
                id={section.id}
                value={section.id}
                className="group relative isolate h-auto min-h-52 min-w-0 scroll-mt-28 flex-col items-start justify-between gap-7 overflow-visible border-[var(--rail-color)] border-r bg-emphasis-dimmed p-6 text-left text-background-rich/75 transition-colors before:absolute hover:bg-emphasis hover:text-background-rich data-[active]:bg-linear-to-br data-[active]:from-primary-dimmed data-[active]:to-emphasis-dimmed data-[active]:text-background-rich max-sm:min-h-36 max-sm:gap-5 max-sm:border-b max-sm:p-5 max-sm:even:border-r-0 max-sm:last:col-span-2 max-sm:last:border-b-0 max-lg:min-h-40 max-lg:p-4"
              >
                <Plus
                  className={cn(
                    "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                    index === 1 && "max-sm:hidden",
                    index === 4 && "sm:hidden",
                  )}
                />
                {(index === 2 || index === 4) && (
                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 sm:hidden" />
                )}
                {index === 4 && (
                  <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:hidden" />
                )}
                {[0, 2, 3].includes(index) && (
                  <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-sm:hidden" />
                )}
                {index === 1 && (
                  <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 sm:max-lg:block" />
                )}
                <div
                  aria-hidden
                  className="flex w-full items-start justify-between gap-3"
                >
                  <span className="font-heading text-3xl text-background-rich/50 group-data-[active]:text-primary-rich">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="size-9 text-primary-rich/70 group-data-[active]:text-primary-rich" />
                </div>
                <span className="flex w-full items-center justify-between gap-3 font-heading text-xl max-sm:text-lg max-lg:text-base">
                  <span>{section.eyebrow?.replace(/^\[\d+\]\s*/, "")}</span>
                  <ArrowRightIcon
                    className="size-4 opacity-0 group-data-[active]:opacity-100 max-sm:block max-lg:hidden"
                    aria-hidden
                  />
                </span>
              </Tab>
            );
          })}
        </TabsList>
        {sections.map((section) => (
          <TabsPanel
            key={section.id}
            value={section.id}
            data-platform-panel={section.id}
            className="min-w-0 focus-visible:outline-2 focus-visible:outline-primary-rich focus-visible:-outline-offset-2"
          >
            <StagePanel section={section} />
          </TabsPanel>
        ))}
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      </Tabs>
      <noscript>
        <div className="border-[var(--rail-color)] border-t">
          {sections.slice(1).map((section) => (
            <StagePanel key={section.id} section={section} />
          ))}
        </div>
      </noscript>
    </>
  );
};
export namespace PlatformExplorer {
  export type Props = {
    sections: readonly MarketingPage.Section[];
    label: string;
  };
}
