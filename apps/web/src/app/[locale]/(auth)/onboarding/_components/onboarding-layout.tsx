"use client";

import { useMessages, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { usePathname } from "@/i18n/navigation";
import {
  OnboardingRoadmap,
  OnboardingRoadmapFigure,
} from "./onboarding-roadmap";

const stepPaths = [
  {
    key: "catalog",
    path: "/onboarding/connect",
  },
  { key: "products", path: "/onboarding/products" },
  {
    key: "competitors",
    path: "/onboarding/competitors",
  },
  { key: "scan", path: "/onboarding/scan" },
] as const;

type SidebarKey =
  | "connect"
  | "shopify"
  | "woocommerce"
  | "feed"
  | "products"
  | "competitors"
  | "scan";

const resolveSidebarKey = (pathname: string): SidebarKey => {
  switch (true) {
    case pathname.startsWith("/onboarding/connect/shopify"):
      return "shopify";
    case pathname.startsWith("/onboarding/connect/woocommerce"):
      return "woocommerce";
    case pathname.startsWith("/onboarding/connect/feed"):
    case pathname.startsWith("/onboarding/connect/csv"):
      return "feed";
    case pathname.startsWith("/onboarding/products"):
      return "products";
    case pathname.startsWith("/onboarding/competitors"):
      return "competitors";
    case pathname.startsWith("/onboarding/scan"):
      return "scan";
    default:
      return "connect";
  }
};

export const OnboardingLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const translate = useTranslations("onboarding.layout");
  const messages = useMessages();

  const steps = stepPaths.map((step) => ({
    ...step,
    label: translate(`steps.${step.key}`),
  }));

  const current = steps.findIndex((step) => pathname.startsWith(step.path));

  const sidebarKey = resolveSidebarKey(pathname);
  const sidebarContent = messages.onboarding.layout.sidebar[sidebarKey];

  const headline = (
    <>
      {sidebarContent.headline.line1}
      <br />
      {sidebarContent.headline.line2}
    </>
  );

  return (
    <div className="flex h-dvh min-h-0 bg-background-rich">
      <Onboarding
        identifier={pathname}
        headline={headline}
        points={sidebarContent.points}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background-rich">
        <nav
          aria-label={translate("stepProgress", {
            current: String(current + 1),
            total: String(steps.length),
          })}
          className="relative shrink-0 border-accent-foreground border-b"
        >
          <div className="flex min-h-10 items-center justify-between gap-4 px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <div className="md:hidden">
                <OnboardingRoadmapFigure
                  index={current}
                  active
                  className="h-12 w-16"
                />
              </div>
              <div className="min-w-0 py-2">
                <p className="font-semibold text-foreground-rich md:hidden">
                  {steps[current]?.label}
                </p>
                <p className="text-foreground-dimmed text-sm">
                  {translate("stepProgress", {
                    current: String(current + 1),
                    total: String(steps.length),
                  })}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
          <OnboardingRoadmap steps={steps} current={current} />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        </nav>
        {children}
      </main>
    </div>
  );
};
