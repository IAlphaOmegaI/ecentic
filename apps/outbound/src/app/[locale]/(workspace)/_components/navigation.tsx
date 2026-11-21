"use client";

import {
  ArrowRightIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  CommerceBookOpenIcon,
  CommerceCityBuildingIcon,
  CommercePlug_3SparkleIcon,
  EnvelopeIcon,
  FaceSearchIcon,
  LinkedinIcon,
  MenuIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
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
import { Suspense, useState } from "react";
import { AccountControl } from "@/components/account-control";
import { Link, usePathname } from "@/i18n/navigation";

export const sections = [
  "overview",
  "campaigns",
  "prospects",
  "review",
  "linkedin",
  "sent",
  "replies",
  "playbook",
  "integrations",
  "warmup",
] as const;
export type Section = (typeof sections)[number];
export const sectionHref = (section: Section) =>
  section === "overview" ? "/" : `/${section}`;

const groups = [
  {
    key: "workspace",
    sections: ["overview", "campaigns", "prospects", "replies"],
  },
  { key: "settings", sections: ["playbook", "integrations", "warmup"] },
] as const;

const icons = {
  overview: SquareChartIcon,
  campaigns: CommerceCityBuildingIcon,
  prospects: FaceSearchIcon,
  review: CheckBadgeIcon,
  linkedin: LinkedinIcon,
  sent: ArrowRightIcon,
  replies: EnvelopeIcon,
  playbook: CommerceBookOpenIcon,
  integrations: CommercePlug_3SparkleIcon,
  warmup: ShieldCheckIcon,
};

const sectionFor = (pathname: string) =>
  sections.find((section) => {
    const href = sectionHref(section);
    return (
      pathname === href ||
      (section !== "overview" && pathname.startsWith(`${href}/`))
    );
  });

const WorkspaceMark = ({ onNavigate }: { onNavigate?: () => void }) => (
  <Link
    href="/"
    onClick={onNavigate}
    aria-label="ecentic"
    className="w-35 rounded-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
  >
    <Image
      src="/images/marketing/trademark-on-dark.svg"
      alt="ecentic"
      width={140}
      height={35}
      className="h-auto w-full"
      priority
    />
  </Link>
);

export const Navigation = () => (
  <aside className="relative hidden min-h-0 w-60 shrink-0 flex-col overflow-hidden bg-emphasis font-normal text-background-rich md:flex">
    <div className="flex h-16 shrink-0 items-center px-5">
      <WorkspaceMark />
    </div>
    <Suspense fallback={<NavigationLinks />}>
      <ActiveNavigationLinks />
    </Suspense>
  </aside>
);

const ActiveNavigationLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
  <NavigationLinks pathname={usePathname()} onNavigate={onNavigate} />
);

const NavigationLinks = ({
  pathname,
  onNavigate,
}: {
  pathname?: string;
  onNavigate?: () => void;
}) => {
  const translate = useTranslations("outbound");
  const current = pathname === undefined ? undefined : sectionFor(pathname);
  const prospectFamily =
    current === "prospects" || current === "review" || current === "linkedin";
  return (
    <nav
      aria-label={translate("page.title")}
      className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pt-3 pb-5"
    >
      {groups.map((group) => (
        <div
          key={group.key}
          className={cn(
            "shrink-0",
            group.key === "settings" &&
              "mt-auto border-background-rich/10 border-t pt-5",
          )}
        >
          <p className="mb-2 px-6 font-medium text-background-rich/45 text-xs">
            {translate(`chrome.groups.${group.key}`)}
          </p>
          <div className="space-y-1">
            {group.sections.map((section) => {
              const Icon = icons[section];
              const active =
                current === section ||
                (section === "prospects" && prospectFamily) ||
                (section === "replies" && current === "sent");
              return (
                <div key={section}>
                  <Link
                    href={sectionHref(section)}
                    onClick={onNavigate}
                    aria-current={current === section ? "page" : undefined}
                    className={cn(
                      "group relative mx-3 flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 motion-reduce:transition-none",
                      active
                        ? "inset-shadow-background-rich/30 inset-shadow-sm bg-background-rich bg-linear-to-b from-primary-text/90 to-primary-text font-semibold text-background-rich"
                        : "font-medium text-background-rich/75 hover:bg-background-rich/8 hover:text-background-rich",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-5 shrink-0",
                        active
                          ? "text-background-rich"
                          : "text-background-rich/65",
                      )}
                    />
                    <span className="min-w-0 flex-1 leading-snug">
                      {translate(`nav.${section}`)}
                    </span>
                  </Link>
                  {section === "prospects" && prospectFamily && (
                    <div className="mt-1 mr-3 ml-9 space-y-1 border-background-rich/15 border-l pl-2">
                      {(["review", "linkedin"] as const).map((secondary) => {
                        const SecondaryIcon = icons[secondary];
                        return (
                          <Link
                            key={secondary}
                            href={sectionHref(secondary)}
                            onClick={onNavigate}
                            aria-current={
                              current === secondary ? "page" : undefined
                            }
                            className={cn(
                              "flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none",
                              current === secondary
                                ? "bg-background-rich/10 font-semibold text-background-rich"
                                : "text-background-rich/60 hover:bg-background-rich/8 hover:text-background-rich",
                            )}
                          >
                            <SecondaryIcon
                              aria-hidden
                              className={cn(
                                "size-4 shrink-0",
                                secondary === "linkedin" && "fill-current",
                              )}
                            />
                            {translate(`nav.${secondary}`)}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

const MobileNavigation = () => {
  const translate = useTranslations("outbound");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon"
            className="shrink-0 rounded-lg text-background-rich/80 hover:bg-background-rich/10 hover:text-background-rich md:hidden"
          />
        }
        aria-label={translate("chrome.menu.open")}
      >
        <MenuIcon aria-hidden className="size-5" />
      </SheetTrigger>
      <SheetPopup
        side="left"
        closeLabel={translate("chrome.menu.close")}
        className="h-dvh max-h-none w-80 max-w-full origin-center gap-0 overflow-hidden rounded-r-lg border-0 bg-emphasis p-0 font-normal text-background-rich transition-[opacity,transform,filter] ease-out data-ending-style:translate-x-0 data-starting-style:translate-x-0 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:blur-sm data-starting-style:blur-sm data-closed:duration-100 data-open:duration-150 motion-reduce:transition-none"
        classList={{
          backdrop: "z-50 bg-emphasis/40 backdrop-blur-sm",
          close: {
            root: "top-4 right-4 flex size-8 items-center justify-center rounded-lg text-background-rich/70 opacity-100 hover:bg-background-rich/10 hover:text-background-rich",
          },
        }}
      >
        <SheetHeader className="h-16 shrink-0 justify-center px-5 py-0">
          <SheetTitle className="sr-only">{translate("page.title")}</SheetTitle>
          <WorkspaceMark onNavigate={() => setOpen(false)} />
        </SheetHeader>
        <Suspense
          fallback={<NavigationLinks onNavigate={() => setOpen(false)} />}
        >
          <ActiveNavigationLinks onNavigate={() => setOpen(false)} />
        </Suspense>
      </SheetPopup>
    </Sheet>
  );
};

const CurrentDestination = () => {
  const pathname = usePathname();
  const translate = useTranslations("outbound");
  const section = sectionFor(pathname);
  return (
    <span className="truncate font-medium text-background-rich text-sm">
      {section ? translate(`nav.${section}`) : translate("page.title")}
    </span>
  );
};

export const WorkspaceHeader = () => {
  const translate = useTranslations("outbound");
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-emphasis px-3 font-normal text-background-rich sm:gap-6 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <MobileNavigation />
        <nav
          aria-label={translate("chrome.breadcrumb.label")}
          className="flex min-w-0 items-center gap-3"
        >
          <Link
            href="/"
            className="hidden rounded-sm text-background-rich/55 text-sm transition-colors hover:text-background-rich focus-visible:outline-2 focus-visible:outline-primary sm:inline"
          >
            {translate("page.title")}
          </Link>
          <ChevronRightIcon
            aria-hidden
            className="hidden size-3.5 shrink-0 text-background-rich/35 sm:block"
          />
          <Suspense
            fallback={
              <span
                aria-hidden
                className="h-4 w-24 rounded-sm bg-background-rich/10"
              />
            }
          >
            <CurrentDestination />
          </Suspense>
        </nav>
      </div>
      <Suspense
        fallback={
          <span
            aria-hidden
            className="h-10 w-14 shrink-0 rounded-lg bg-background-rich/10 lg:w-28"
          />
        }
      >
        <AccountControl />
      </Suspense>
    </header>
  );
};
