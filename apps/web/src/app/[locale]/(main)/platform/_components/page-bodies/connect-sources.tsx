"use client";

import {
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { useEffect, useState } from "react";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingActions } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { useDocument } from "@/hooks/use-document";

export const ConnectSources = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const [open, setOpen] = useState<string[]>(["shopify"]);
  const { window } = useDocument();

  useEffect(() => {
    if (!window) return;
    const revealAnchor = () => {
      const anchor = window.location.hash.slice(1);
      if (!sections.some((section) => section.id === anchor)) return;
      setOpen((current) => Array.from(new Set([...current, anchor])));
    };
    revealAnchor();
    window.addEventListener("hashchange", revealAnchor);
    return () => window.removeEventListener("hashchange", revealAnchor);
  }, [sections, window]);

  return (
    <Accordion
      multiple
      value={open}
      onValueChange={(value) =>
        setOpen(value.filter((entry) => typeof entry === "string"))
      }
      className="min-w-0 justify-start border-[var(--rail-color)] border-t lg:border-t-0 lg:border-l"
    >
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          id={section.id}
          value={section.id}
          className="scroll-mt-24 border-[var(--rail-color)] last:border-b-0"
        >
          <AccordionTrigger
            className="min-h-24 items-center px-8 py-6 font-heading text-xl hover:text-primary-text focus-visible:outline-primary focus-visible:-outline-offset-4 max-sm:px-4"
            classList={{
              trigger: {
                icon: "mr-0 size-4 shrink-0 transition-transform motion-reduce:transition-none",
              },
            }}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              {section.id === "shopify" && (
                <ProviderLogo
                  provider="shopify"
                  decorative
                  className="h-8 w-8 shrink-0 rounded-none"
                />
              )}
              {section.id === "woocommerce" && (
                <ProviderLogo
                  provider="woocommerce"
                  decorative
                  className="h-6 w-12 shrink-0 rounded-none"
                />
              )}
              {section.id === "merchant-center" && (
                <ProviderLogo
                  provider="googleMerchant"
                  decorative
                  className="h-8 w-8 shrink-0 rounded-none"
                />
              )}
              {section.id === "product-feeds" && (
                <CommerceCode_3Icon
                  aria-hidden
                  className="size-8 shrink-0 text-primary"
                />
              )}
              {section.id === "csv" && (
                <CommerceFilePenIcon
                  aria-hidden
                  className="size-8 shrink-0 text-primary"
                />
              )}
              {section.id === "store-address" && (
                <CommerceGlobePointerIcon
                  aria-hidden
                  className="size-8 shrink-0 text-primary"
                />
              )}
              <span className="min-w-0 flex-1">{section.title}</span>
            </span>
          </AccordionTrigger>
          <AccordionPanel className="motion-reduce:transition-none">
            <div className="px-8 pb-8 max-sm:px-4">
              {section.description && <p>{section.description}</p>}
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="max-w-[55ch]">
                  {paragraph}
                </p>
              ))}
              {section.note && <p className="mt-4">{section.note}</p>}
              {section.links && <MarketingActions actions={section.links} />}
              {sectionChildren?.[section.id]}
            </div>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
