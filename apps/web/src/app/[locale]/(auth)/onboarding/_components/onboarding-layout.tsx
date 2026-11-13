"use client";

import {
  CheckIcon,
  CircleBoltIcon,
  FaceSearchIcon,
  PhotoIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useMessages, useTranslations } from "next-intl";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { usePathname } from "@/i18n/navigation";

const stepPaths = [
  {
    key: "catalog",
    path: "/onboarding/connect",
    icon: ShoppingCartIcon,
  },
  { key: "products", path: "/onboarding/products", icon: PhotoIcon },
  {
    key: "competitors",
    path: "/onboarding/competitors",
    icon: FaceSearchIcon,
  },
  { key: "scan", path: "/onboarding/scan", icon: CircleBoltIcon },
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
          <ol className="hidden grid-cols-4 md:grid">
            {steps.map((step, index) => {
              const isCompleted = index < current;
              const isCurrent = index === current;
              const StepIcon = isCompleted ? CheckIcon : step.icon;
              return (
                <li
                  key={step.path}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "relative flex min-h-24 min-w-0 items-center gap-4 border-accent-foreground border-r px-4 py-4 last:border-r-0 xl:px-6",
                    isCurrent &&
                      "bg-linear-to-br from-primary/12 to-background-rich",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 font-heading font-medium text-2xl tabular-nums",
                      isCurrent || isCompleted
                        ? "text-primary-text"
                        : "text-foreground-dimmed/60",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <StepIcon
                      aria-hidden="true"
                      className={cn(
                        "size-4",
                        isCurrent || isCompleted
                          ? "text-primary-text"
                          : "text-foreground-dimmed",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        isCurrent
                          ? "font-semibold text-foreground-rich"
                          : "font-medium text-foreground-dimmed",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5",
                      isCurrent
                        ? "bg-primary"
                        : isCompleted
                          ? "bg-primary/40"
                          : "bg-transparent",
                    )}
                  />
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between gap-4 px-6 py-4 md:hidden">
            <div className="min-w-0">
              <p className="font-semibold text-foreground-rich">
                {steps[current]?.label}
              </p>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate("stepProgress", {
                  current: String(current + 1),
                  total: String(steps.length),
                })}
              </p>
            </div>
            <div className="flex gap-2" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.path}
                  className={cn(
                    "size-2 rounded-full",
                    index <= current ? "bg-primary" : "bg-accent-foreground",
                    index === current && "ring-4 ring-primary/10",
                  )}
                />
              ))}
            </div>
          </div>
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        </nav>
        {children}
      </main>
    </div>
  );
};
