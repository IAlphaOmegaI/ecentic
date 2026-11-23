"use client";

import {
  ArrowRightIcon,
  CheckBadgeIcon,
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
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Sheet,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@zenncore/web/components/sheet";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
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

export const WorkspaceMark = ({ onNavigate }: WorkspaceMark.Props) => (
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

export namespace WorkspaceMark {
  export type Props = { onNavigate?: () => void };
}

export const Navigation = () => (
  <aside className="relative hidden min-h-0 w-60 shrink-0 flex-col overflow-hidden bg-emphasis font-normal text-background-rich md:flex">
    <div className="flex h-16 shrink-0 items-center px-4">
      <WorkspaceMark />
    </div>
    <Suspense fallback={<NavigationLinks />}>
      <ActiveNavigationLinks />
    </Suspense>
  </aside>
);

const ActiveNavigationLinks = (props: WorkspaceMark.Props) => (
  <NavigationLinks pathname={usePathname()} {...props} />
);

export const NavigationLink = ({
  section,
  current,
  onNavigate,
  nested = false,
}: NavigationLink.Props) => {
  const translate = useTranslations("outbound");
  const Icon = icons[section];
  const active =
    current === section || (section === "replies" && current === "sent");

  return (
    <Link
      href={sectionHref(section)}
      onClick={onNavigate}
      aria-current={current === section ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 motion-reduce:transition-none",
        active
          ? nested
            ? "bg-background-rich/10 font-semibold text-background-rich"
            : "inset-shadow-background-rich/30 inset-shadow-sm bg-background-rich bg-linear-to-b from-primary-text/90 to-primary-text font-semibold text-background-rich"
          : "font-medium text-background-rich/65 hover:bg-background-rich/8 hover:text-background-rich",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          section === "linkedin" && "fill-current",
        )}
      />
      <span className="min-w-0 flex-1 leading-snug">
        {translate(
          nested && section === "prospects"
            ? "nav.allProspects"
            : `nav.${section}`,
        )}
      </span>
    </Link>
  );
};
export namespace NavigationLink {
  export type Props = WorkspaceMark.Props & {
    section: Section;
    current?: Section;
    nested?: boolean;
  };
}

export const NavigationLinks = ({
  pathname,
  onNavigate,
}: NavigationLinks.Props) => {
  const translate = useTranslations("outbound");
  const current = pathname === undefined ? undefined : sectionFor(pathname);
  const prospectFamily =
    current === "prospects" || current === "review" || current === "linkedin";
  const [expanded, setExpanded] = useState<
    NonNullable<Accordion.Props["value"]>
  >(prospectFamily ? ["prospects"] : []);

  useEffect(() => {
    if (pathname && prospectFamily) setExpanded(["prospects"]);
  }, [pathname, prospectFamily]);

  return (
    <nav
      aria-label={translate("page.title")}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ScrollArea
        className="min-h-0 flex-1"
        viewportProps={{
          role: "region",
          tabIndex: 0,
          "aria-label": translate("chrome.groups.workspace"),
        }}
        classList={{
          viewport: "focus-visible:outline-primary",
          scrollBar: {
            root: "bg-background-rich/10",
            thumb: "bg-background-rich/30",
          },
        }}
      >
        <div className="flex min-h-full flex-col">
          <div className="shrink-0 space-y-2 px-2 py-4">
            <p className="px-4 pb-2 font-medium text-background-rich/45 text-xs">
              {translate("chrome.groups.workspace")}
            </p>
            {groups[0].sections.map((section) =>
              section === "prospects" ? (
                <Accordion
                  key={section}
                  value={expanded}
                  onValueChange={setExpanded}
                >
                  <AccordionItem value="prospects" className="border-0">
                    <AccordionTrigger
                      className="min-h-10 items-center gap-2 px-4 py-2"
                      classList={{
                        trigger: {
                          root: cn(
                            "rounded-lg text-sm leading-snug focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 motion-reduce:transition-none",
                            prospectFamily
                              ? "inset-shadow-background-rich/30 inset-shadow-sm bg-background-rich bg-linear-to-b from-primary-text/90 to-primary-text font-semibold text-background-rich"
                              : "font-medium text-background-rich/65 hover:bg-background-rich/8 hover:text-background-rich",
                          ),
                          icon: "mr-0 size-4 shrink-0 transition-transform duration-150 group-data-panel-open:rotate-180 motion-reduce:transition-none",
                        },
                      }}
                    >
                      <FaceSearchIcon aria-hidden className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        {translate("nav.prospects")}
                      </span>
                    </AccordionTrigger>
                    <AccordionPanel className="duration-200 motion-reduce:transition-none">
                      <div className="mt-2 ml-6 space-y-2 border-background-rich/15 border-l pl-2">
                        {(["prospects", "review", "linkedin"] as const).map(
                          (secondary) => (
                            <NavigationLink
                              key={secondary}
                              section={secondary}
                              current={current}
                              onNavigate={onNavigate}
                              nested
                            />
                          ),
                        )}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              ) : (
                <NavigationLink
                  key={section}
                  section={section}
                  current={current}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
          <div className="mt-auto shrink-0 space-y-2 border-background-rich/10 border-t px-2 py-4">
            <p className="px-4 pb-2 font-medium text-background-rich/45 text-xs">
              {translate("chrome.groups.settings")}
            </p>
            {groups[1].sections.map((section) => (
              <NavigationLink
                key={section}
                section={section}
                current={current}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </nav>
  );
};
export namespace NavigationLinks {
  export type Props = WorkspaceMark.Props & { pathname?: string };
}

const MobileNavigation = () => {
  const translate = useTranslations("outbound");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" color="neutral" tone="inverse" size="icon" />
        }
        aria-label={translate("chrome.menu.open")}
      >
        <MenuIcon aria-hidden />
      </SheetTrigger>
      <SheetPopup
        side="left"
        closeLabel={translate("chrome.menu.close")}
        className="h-dvh max-h-none w-80 max-w-full origin-left gap-0 overflow-hidden rounded-r-lg border-0 p-0 transition-transform ease-out data-closed:duration-150 data-open:duration-200 motion-reduce:transition-none motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-starting-style:translate-x-0"
        classList={{
          root: "bg-emphasis font-normal text-background-rich",
          backdrop:
            "z-50 bg-emphasis/40 backdrop-blur-sm motion-reduce:transition-none",
          close: {
            root: "top-4 right-4 flex size-8 items-center justify-center rounded-lg text-background-rich/70 opacity-100 hover:bg-background-rich/10 hover:text-background-rich",
          },
        }}
      >
        <SheetHeader className="h-16 shrink-0 justify-center px-4 py-0">
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

export const WorkspaceHeader = () => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-4 bg-emphasis px-4 font-normal text-background-rich sm:px-6">
    <div className="min-w-0 flex-1">
      <div className="w-fit md:hidden">
        <Suspense>
          <MobileNavigation />
        </Suspense>
      </div>
    </div>
    <Suspense
      fallback={
        <span
          aria-hidden
          className="h-10 w-16 shrink-0 rounded-lg bg-background-rich/10 lg:w-28"
        />
      }
    >
      <AccountControl />
    </Suspense>
  </header>
);
