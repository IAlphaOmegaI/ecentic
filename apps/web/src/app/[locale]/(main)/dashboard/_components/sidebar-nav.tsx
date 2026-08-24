"use client";

import {
  BarChartIcon,
  ChartCircularIcon,
  CircleBoltIcon,
  CodeIcon,
  EyeIcon,
  GaugeIcon,
  GearIcon,
  MegaphoneIcon,
  RadarIcon,
  RocketIcon,
  SearchIcon,
  ShieldCheckIcon,
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
import { useTranslations } from "next-intl";
import { type ComponentType, type ReactNode, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

const overview = {
  icon: SquareChartIcon,
  key: "overview",
  segment: "",
  exact: true,
} as const;

const groups = [
  {
    key: "catalog",
    items: [
      { icon: MegaphoneIcon, key: "brand", segment: "/brand", exact: false },
      {
        icon: ShoppingCartIcon,
        key: "products",
        segment: "/products",
        exact: false,
      },
      {
        icon: ShieldCheckIcon,
        key: "quality",
        segment: "/quality",
        exact: false,
      },
      { icon: GaugeIcon, key: "optimize", segment: "/optimize", exact: false },
    ],
  },
  {
    key: "intelligence",
    items: [
      {
        icon: ChartCircularIcon,
        key: "competitors",
        segment: "/competitors",
        exact: false,
      },
      {
        icon: RadarIcon,
        key: "simulations",
        segment: "/simulations",
        exact: false,
      },
      {
        icon: SearchIcon,
        key: "discovery",
        segment: "/discovery",
        exact: false,
      },
      {
        icon: EyeIcon,
        key: "visibility",
        segment: "/visibility",
        exact: false,
      },
    ],
  },
  {
    key: "channels",
    items: [
      {
        icon: RocketIcon,
        key: "googleShopping",
        segment: "/google-shopping",
        exact: false,
      },
      {
        icon: CodeIcon,
        key: "ucp",
        segment: "/ucp",
        exact: false,
        badge: "68%",
      },
      {
        icon: CircleBoltIcon,
        key: "ucpPlayground",
        segment: "/ucp-playground",
        exact: false,
      },
      {
        icon: BarChartIcon,
        key: "ucpComparison",
        segment: "/ucp-comparison",
        exact: false,
      },
    ],
  },
] as const;

type NavItem = (typeof groups)[number]["items"][number] | typeof overview;

export namespace SidebarNav {
  export type Props = {
    store: string;
    /** Streamed in — see the Sidebar's per-region Suspense boundaries. */
    productBadge: ReactNode;
    optimizationBadge: ReactNode;
  };
}

export const SidebarNav = ({
  store,
  productBadge,
  optimizationBadge,
}: SidebarNav.Props) => {
  const pathname = usePathname();
  const translateNav = useTranslations("dashboard.nav");
  const base = `/dashboard/${store}`;
  const [userOpen, setUserOpen] = useState<string[]>([]);

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const staticBadgeFor = (item: NavItem): string | undefined =>
    "badge" in item && item.badge !== undefined ? item.badge : undefined;

  const badgeFor = (item: NavItem): ReactNode => {
    switch (true) {
      case item.key === "products":
        return productBadge;
      case item.key === "optimize":
        return optimizationBadge;
      default:
        return staticBadgeFor(item);
    }
  };

  const activeGroup = groups.find((group) =>
    group.items.some((item) => isActive(`${base}${item.segment}`, item.exact)),
  )?.key;

  const open =
    activeGroup === undefined
      ? userOpen
      : [...new Set([...userOpen, activeGroup])];

  const groupLabel = {
    catalog: translateNav("groups.catalog"),
    intelligence: translateNav("groups.intelligence"),
    channels: translateNav("groups.channels"),
  } as const;

  return (
    <nav className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavLink
          href={base}
          active={isActive(base, overview.exact)}
          icon={overview.icon}
          label={translateNav("overview")}
          badge={badgeFor(overview)}
          staticBadge={staticBadgeFor(overview)}
        />

        <Accordion
          multiple
          hiddenUntilFound
          value={open}
          onValueChange={(value) => setUserOpen(value)}
          className="justify-start"
        >
          {groups.map((group) => (
            <AccordionItem
              key={group.key}
              value={group.key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <AccordionTrigger
                className="items-center gap-2 px-5 py-2 font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.06em] hover:text-foreground"
                classList={{
                  trigger: {
                    icon: "mr-0 size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
                  },
                }}
              >
                {groupLabel[group.key]}
              </AccordionTrigger>
              <AccordionPanel>
                {group.items.map((item) => (
                  <NavLink
                    key={item.key}
                    href={`${base}${item.segment}`}
                    active={isActive(`${base}${item.segment}`, item.exact)}
                    icon={item.icon}
                    label={translateNav(item.key)}
                    badge={badgeFor(item)}
                    staticBadge={staticBadgeFor(item)}
                  />
                ))}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="border-accent-foreground border-t">
        <NavLink
          href="/dashboard/settings"
          active={pathname.startsWith("/dashboard/settings")}
          icon={GearIcon}
          label={translateNav("settings")}
        />
      </div>
    </nav>
  );
};

const NavLink = ({
  href,
  active,
  icon: Icon,
  label,
  badge,
  staticBadge,
}: {
  href: string;
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: ReactNode;
  staticBadge?: string;
}) => (
  <Link
    href={href}
    className={cn(
      "group relative flex items-center gap-2.5 overflow-hidden border-l-[3px] px-5 py-2 text-sm",
      active
        ? "border-primary bg-primary/5 font-semibold text-primary"
        : "border-transparent font-normal text-foreground-dimmed hover:bg-background hover:text-foreground",
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span className="flex flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-semibold text-[11px] tabular-nums",
            (() => {
              if (staticBadge === undefined)
                return "bg-primary/10 text-primary";

              const percentage = Number.parseFloat(staticBadge);
              switch (true) {
                case Number.isNaN(percentage) || !staticBadge.includes("%"):
                  return "bg-primary/10 text-primary";
                case percentage >= 80:
                  return "bg-success/10 text-success";
                case percentage >= 50:
                  return "bg-warning/10 text-warning";
                default:
                  return "bg-error/10 text-error";
              }
            })(),
          )}
        >
          {badge}
        </span>
      )}
    </span>
  </Link>
);
