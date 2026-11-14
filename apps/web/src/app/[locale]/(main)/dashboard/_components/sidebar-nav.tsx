"use client";

import {
  BarChartIcon,
  GaugeIcon,
  GlobeIcon,
  MenuIcon,
  RadarIcon,
  ShoppingCartIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Sheet,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@zenncore/web/components/sheet";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  dashboardDestinations,
  dashboardDeveloperTools,
  dashboardSections,
  resolveDashboardDestination,
} from "@/lib/dashboard-destinations";

const destinationIcons = {
  overview: SquareChartIcon,
  products: ShoppingCartIcon,
  optimize: GaugeIcon,
  research: RadarIcon,
  channels: GlobeIcon,
  results: BarChartIcon,
} as const;

export namespace SidebarNav {
  export type Props = {
    store: string;
    productBadge: ReactNode;
    optimizationBadge: ReactNode;
  };
}

export const SidebarNav = ({ store, productBadge }: SidebarNav.Props) => {
  const pathname = usePathname();
  const translate = useTranslations("dashboard.workspace.nav");
  const base = `/dashboard/${store}`;
  const segment = pathname.slice(base.length);
  const active = resolveDashboardDestination(segment);
  const sections = useTranslations("dashboard.workspace.sections");
  const [expanded, setExpanded] = useState<
    NonNullable<Accordion.Props["value"]>
  >(active ? [active] : []);
  useEffect(() => {
    const destination = resolveDashboardDestination(
      pathname.slice(base.length),
    );
    setExpanded(destination ? [destination] : []);
  }, [pathname, base]);

  return (
    <nav
      aria-label={translate("label")}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <Accordion
        value={expanded}
        onValueChange={setExpanded}
        className="relative min-h-0 flex-1 justify-start gap-2 overflow-y-auto overscroll-contain pt-2 pb-6"
      >
        {dashboardDestinations.map((destination) => {
          const grouped =
            destination.key === "products" ||
            destination.key === "research" ||
            destination.key === "channels";
          if (!grouped)
            return (
              <NavLink
                key={destination.key}
                href={`${base}${destination.segment}`}
                active={active === destination.key}
                icon={destinationIcons[destination.key]}
                label={translate(destination.key)}
              />
            );
          const entries = dashboardSections[destination.key];
          const selected = [...entries]
            .reverse()
            .find(
              (entry) =>
                segment === entry.segment ||
                segment.startsWith(`${entry.segment}/`),
            );
          const Icon = destinationIcons[destination.key];
          const current = active === destination.key;
          return (
            <AccordionItem
              key={destination.key}
              value={destination.key}
              className="mx-3 w-auto shrink-0 border-0"
            >
              <AccordionTrigger
                classList={{
                  trigger: {
                    icon: "mr-0 size-4 shrink-0 transition-transform duration-200 ease-out group-data-panel-open:rotate-180 motion-reduce:transition-none",
                  },
                }}
                className={cn(
                  "group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  current
                    ? "inset-shadow-background-rich/30 inset-shadow-sm bg-background-rich bg-linear-to-b from-primary-text/90 to-primary-text font-semibold text-background-rich"
                    : "font-medium text-background-rich/75 hover:bg-background-rich/8 hover:text-background-rich",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 leading-snug">
                  {translate(destination.key)}
                </span>
                {destination.key === "products" && (
                  <span className="shrink-0 rounded-sm bg-background-rich/10 px-1.5 py-0.5 font-medium text-background-rich/80 text-xs tabular-nums">
                    {productBadge}
                  </span>
                )}
              </AccordionTrigger>
              <AccordionPanel className="bg-transparent transition-[height,opacity] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
                <div className="space-y-0.5 pt-1 pb-2 pl-8">
                  {entries.map((entry) => (
                    <Link
                      key={entry.key}
                      href={`${base}${entry.segment}`}
                      aria-current={
                        selected?.key === entry.key ? "page" : undefined
                      }
                      className={cn(
                        "flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                        selected?.key === entry.key
                          ? "bg-background-rich/12 font-semibold text-background-rich"
                          : "text-background-rich/65 hover:bg-background-rich/8 hover:text-background-rich",
                      )}
                    >
                      {sections(entry.key)}
                    </Link>
                  ))}
                  {destination.key === "channels" && (
                    <div className="mt-2 border-background-rich/10 border-t pt-2">
                      <p className="px-3 pt-1 pb-2 font-medium text-background-rich/50 text-xs">
                        {sections("developer")}
                      </p>
                      {dashboardDeveloperTools.map((entry) => (
                        <Link
                          key={entry.key}
                          href={`${base}${entry.segment}`}
                          aria-current={
                            segment === entry.segment ? "page" : undefined
                          }
                          className={cn(
                            "flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                            segment === entry.segment
                              ? "bg-background-rich/12 font-semibold text-background-rich"
                              : "text-background-rich/65 hover:bg-background-rich/8 hover:text-background-rich",
                          )}
                        >
                          {sections(entry.key)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-emphasis to-transparent"
      />
    </nav>
  );
};

const NavLink = ({
  href,
  active,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: ReactNode;
}) => (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "group relative mx-3 flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
      active
        ? "inset-shadow-background-rich/30 inset-shadow-sm bg-background-rich bg-linear-to-b from-primary-text/90 to-primary-text font-semibold text-background-rich"
        : "font-medium text-background-rich/75 hover:bg-background-rich/8 hover:text-background-rich",
    )}
  >
    <Icon
      aria-hidden
      className={cn(
        "size-5 shrink-0",
        active ? "text-background-rich" : "text-background-rich/65",
      )}
    />
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="shrink-0 rounded-sm bg-background-rich/10 px-1.5 py-0.5 font-medium text-background-rich/80 text-xs tabular-nums">
          {badge}
        </span>
      )}
    </span>
  </Link>
);

export const MobileSidebar = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const previousPathname = useRef(pathname);
  const translate = useTranslations("nav.menu");
  const translateStores = useTranslations("dashboard.stores");

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  return (
    <div className="shrink-0 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              color="emphasis"
              size="icon"
              className="rounded-lg text-background-rich/80 hover:bg-background-rich/10 hover:text-background-rich"
            />
          }
          aria-label={translate("action.primary")}
        >
          <MenuIcon aria-hidden className="size-5" />
        </SheetTrigger>
        <SheetPopup
          side="left"
          closeLabel={translate("action.quaternary")}
          className="h-dvh max-h-none w-80 max-w-full origin-center gap-0 overflow-hidden rounded-r-lg border-0 bg-emphasis font-normal text-background-rich transition-[opacity,transform,filter] ease-out data-ending-style:translate-x-0 data-starting-style:translate-x-0 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:blur-sm data-starting-style:blur-sm data-closed:duration-100 data-open:duration-150 motion-reduce:transition-none"
          classList={{
            backdrop: "z-50 bg-emphasis/40 backdrop-blur-sm",
            close: {
              root: "top-4 right-4 flex size-8 items-center justify-center rounded-lg text-background-rich/70 opacity-100 hover:bg-background-rich/10 hover:text-background-rich",
            },
          }}
        >
          <SheetHeader className="h-16 shrink-0 justify-center px-5 py-0">
            <SheetTitle className="sr-only">{translate("label")}</SheetTitle>
            <Link
              href="/dashboard"
              aria-label={translateStores("allStores")}
              className="w-35 rounded-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
            >
              <Image
                src="/images/marketing/trademark-on-dark.svg"
                alt="ecentic"
                width={140}
                height={35}
                className="h-auto w-full"
              />
            </Link>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SheetPopup>
      </Sheet>
    </div>
  );
};
