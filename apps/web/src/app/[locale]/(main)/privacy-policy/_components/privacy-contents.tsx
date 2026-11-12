"use client";

import {
  BanIcon,
  BookIcon,
  ClockIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  EnvelopeIcon,
  EyeIcon,
  GearIcon,
  ShareIcon,
  UserIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { useEffect, useState } from "react";
import { useDocument } from "@/hooks/use-document";

const sectionIcons = {
  "01": UserIcon,
  "02": GearIcon,
  "03": CommerceBasketShoppingIcon,
  "04": CommerceGlobePointerIcon,
  "05": ShareIcon,
  "06": CommerceFileShieldIcon,
  "07": BanIcon,
  "08": EyeIcon,
  "09": CommerceFilePenIcon,
  "10": ClockIcon,
  "11": EnvelopeIcon,
} as const;

const ContentsLinks = ({
  label,
  items,
  active,
  onNavigate,
}: PrivacyContents.Props & {
  active: string;
  onNavigate: (href: string) => void;
}) => (
  <nav aria-label={label}>
    <ol className="flex flex-col gap-1 px-4 pb-6 max-sm:px-2">
      {items.map((item) => {
        const Icon = sectionIcons[item.number as keyof typeof sectionIcons];
        return (
          <li key={item.number} className="relative min-w-0">
            <a
              href={item.href}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                onNavigate(item.href);
              }}
              aria-current={active === item.number ? "location" : undefined}
              className={cn(
                "relative grid min-h-12 grid-cols-[16px_minmax(0,1fr)_20px] items-start gap-3 rounded-r-md border-transparent border-l-2 px-4 py-3 text-sm leading-5 transition-colors hover:bg-primary/5 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 motion-reduce:transition-none",
                active === item.number
                  ? "border-primary bg-linear-to-r from-primary/10 to-transparent font-medium text-primary-text"
                  : "text-foreground-dimmed",
              )}
            >
              <Icon aria-hidden className="mt-0.5 size-4" />
              <span className="min-w-0">{item.title}</span>
              <span aria-hidden className="text-right text-xs opacity-65">
                {item.number}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  </nav>
);

export const PrivacyContents = ({ label, items }: PrivacyContents.Props) => {
  const { document, window } = useDocument();
  const [active, setActive] = useState(items[0]?.number ?? "01");
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (!document || !window) return;
    const sections = items.flatMap((item) => {
      const element = document.getElementById(item.href.slice(1));
      return element ? [{ number: item.number, element }] : [];
    });
    const update = () => {
      const pageInset =
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).scrollPaddingTop,
        ) || 0;
      const current = [...sections].reverse().find(({ element }) => {
        const sectionInset =
          Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) ||
          0;
        return (
          element.getBoundingClientRect().top <= pageInset + sectionInset + 2
        );
      });
      setActive(current?.number ?? items[0]?.number ?? "01");
    };
    const pending = { frame: 0 };
    const schedule = () => {
      if (pending.frame) return;
      pending.frame = window.requestAnimationFrame(() => {
        pending.frame = 0;
        update();
      });
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(pending.frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [document, window, items]);

  return (
    <div
      data-privacy-navigation
      className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-4 px-8 pt-8 pb-6">
          <h2 className="flex items-center gap-3 text-xl!">
            <BookIcon aria-hidden className="size-4 text-primary-text" />
            {label}
          </h2>
          <span
            aria-hidden
            className="text-foreground-dimmed text-xs tabular-nums"
          >
            {active} / {String(items.length).padStart(2, "0")}
          </span>
        </div>
        <ContentsLinks
          label={label}
          items={items}
          active={active}
          onNavigate={() => {}}
        />
      </div>
      <Accordion
        value={expanded}
        onValueChange={(value) =>
          setExpanded(value.filter((entry) => typeof entry === "string"))
        }
        className="lg:hidden"
      >
        <AccordionItem value="contents" className="border-b-0">
          <AccordionTrigger
            classList={{
              root: "px-8 max-sm:px-4",
              trigger: {
                root: "py-6 text-lg",
                icon: "size-4 shrink-0",
              },
            }}
          >
            <span className="flex items-center gap-4">
              <BookIcon aria-hidden className="size-4 text-primary-text" />
              {label}
            </span>
          </AccordionTrigger>
          <AccordionPanel
            className={cn("transition-none", expanded.length === 0 && "hidden")}
          >
            <ContentsLinks
              label={label}
              items={items}
              active={active}
              onNavigate={(href) => {
                if (!window || !document) return;
                // Let the native link navigate before removing its accordion panel.
                window.requestAnimationFrame(() => {
                  setExpanded([]);
                  window.requestAnimationFrame(() => {
                    const destination = document.getElementById(href.slice(1));
                    destination?.scrollIntoView({
                      block: "start",
                      behavior: "instant",
                    });
                    destination?.focus({ preventScroll: true });
                  });
                });
              }}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export namespace PrivacyContents {
  export type Props = {
    label: string;
    items: readonly {
      number: string;
      title: string;
      href: string;
    }[];
  };
}
