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
          className="relative shrink-0 border-accent-foreground border-b px-6 py-6 sm:px-8"
        >
          <ol className="hidden items-center md:flex">
            {steps.map((step, index) => {
              const isCompleted = index < current;
              const isCurrent = index === current;
              const StepIcon = isCompleted ? CheckIcon : step.icon;
              return (
                <li
                  key={step.path}
                  aria-current={isCurrent ? "step" : undefined}
                  className="flex min-w-0 flex-1 items-center last:flex-none"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isCurrent
                        ? "font-medium text-foreground-rich"
                        : "text-foreground-dimmed",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md border",
                        isCurrent
                          ? "border-primary bg-primary/10 text-primary-text"
                          : isCompleted
                            ? "border-primary/20 bg-primary/5 text-primary-text"
                            : "border-accent-foreground",
                      )}
                    >
                      <StepIcon aria-hidden="true" className="size-4" />
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mx-4 h-px min-w-2 flex-1",
                        isCompleted ? "bg-primary" : "bg-accent-foreground",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between gap-4 md:hidden">
            <div className="min-w-0">
              <p className="font-medium text-foreground-rich">
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
