"use client";

import {
  CommerceChartActivity_2Icon,
  CommerceGlobePointerIcon,
  DownloadIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";

export const StoreAccess = ({ section, labels }: StoreAccess.Props) => {
  const [open, setOpen] = useState<string[]>(["import"]);
  const items = [
    {
      id: "import",
      title: labels.accessTitle,
      paragraphs: section.paragraphs?.slice(0, 1),
      icon: DownloadIcon,
      figure: "catalog",
    },
    {
      id: "permissions",
      title: labels.permissionsTitle,
      paragraphs: section.paragraphs?.slice(4, 5),
      icon: ShieldCheckIcon,
      figure: "inspection",
    },
    {
      id: "tracking",
      title: labels.trackingTitle,
      paragraphs: section.paragraphs?.slice(2, 4),
      icon: CommerceChartActivity_2Icon,
      figure: "relay",
    },
    {
      id: "merchantCenter",
      title: "Google Merchant Center",
      paragraphs: section.paragraphs?.slice(1, 2),
      icon: CommerceGlobePointerIcon,
      figure: "hub",
    },
    {
      id: "checkout",
      title: labels.checkoutTitle,
      paragraphs: section.paragraphs?.slice(5, 6),
      icon: ShoppingCartIcon,
      figure: "checkout",
    },
  ] as const;
  const selected = items.find((item) => item.id === open[0]) ?? items[0];

  return (
    <div
      data-store-access
      className="marketing-section-grid relative grid border-accent-foreground border-t md:grid-cols-[3fr_2fr]"
    >
      <MarketingEdgeCrosses />
      <Accordion
        value={open}
        onValueChange={(value) =>
          setOpen(value.filter((entry) => typeof entry === "string"))
        }
        className="min-w-0 justify-start"
      >
        {items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border-accent-foreground last:border-b-0"
          >
            <AccordionTrigger
              className="items-center px-4 py-6 font-heading text-2xl! text-foreground-rich leading-snug! tracking-tight hover:text-primary-text md:px-8"
              classList={{
                trigger: {
                  icon: "mr-0 size-4 shrink-0 text-primary-text motion-reduce:transition-none",
                },
              }}
            >
              <span className="flex min-w-0 items-center gap-4">
                <item.icon
                  className="size-6 shrink-0 text-primary-text"
                  aria-hidden
                />
                <span>{item.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionPanel
              keepMounted
              className="motion-reduce:transition-none"
            >
              <div className="space-y-4 px-4 pb-8 md:pr-8 md:pl-18">
                {item.paragraphs
                  ?.filter((paragraph) => paragraph.trim())
                  .map((paragraph) => (
                    <p
                      key={paragraph}
                      className="max-w-[62ch] text-foreground-dimmed leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="relative flex min-w-0 flex-col justify-center border-accent-foreground border-t bg-background-dimmed md:border-t-0 md:border-l">
        <CommerceFigure
          kind={selected.figure}
          surface="field"
          className="mx-auto max-w-[440px]"
        />
        <p
          aria-live="polite"
          className="px-8 pb-8 text-center font-heading text-foreground-rich text-xl"
        >
          {selected.title}
        </p>
      </div>
    </div>
  );
};

export namespace StoreAccess {
  export type Props = {
    section: MarketingPage.Section;
    labels: AppConfig["Messages"]["enterpriseSecurityDesign"];
  };
}
