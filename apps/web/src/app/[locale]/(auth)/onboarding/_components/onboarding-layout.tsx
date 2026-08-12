"use client";

import {
  CheckIcon,
  CircleBoltIcon,
  FaceSearchIcon,
  PhotoIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useMessages, useTranslations } from "next-intl";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { usePathname } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";

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
    <div className="flex h-screen bg-primary">
      <Onboarding
        identifier={pathname}
        headline={headline}
        points={sidebarContent.points}
      />

      <main className="flex h-full flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-center border-accent-foreground border-b px-8">
          <div className="relative mx-auto flex w-full items-center justify-center gap-0 border-accent-foreground border-x py-2">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {steps.map((step, index) => {
              const isCompleted = index < current;
              const isCurrent = index === current;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.path}
                  className={cn(
                    "hidden items-center gap-1.5 sm:flex",
                    index !== 0 && "ml-1.5",
                  )}
                >
                  <div className="relative flex items-center gap-2 px-3 py-1.5">
                    {isCurrent && (
                      <motion.div
                        layoutId="step-active-bg"
                        className="absolute inset-0 bg-primary"
                        transition={Spring.Gentle}
                      />
                    )}

                    <AnimatePresence mode="wait" initial={false}>
                      {isCompleted ? (
                        <motion.span
                          key="check"
                          className={`relative z-10 transition-colors ${isCurrent ? "text-white" : "text-primary"}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={Spring.Snappy}
                        >
                          <CheckIcon className="size-4" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="icon"
                          className={`relative z-10 transition-colors ${isCurrent ? "text-white" : "text-foreground-dimmed/40"}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={Spring.Snappy}
                        >
                          <StepIcon className="size-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>

                    <span
                      className={`relative z-10 whitespace-nowrap font-medium text-sm transition-colors ${
                        isCurrent
                          ? "text-white"
                          : isCompleted
                            ? "text-primary"
                            : "text-foreground-dimmed/40"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="h-px w-5 overflow-hidden rounded-full bg-accent-foreground">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: isCompleted ? "100%" : "0%" }}
                        transition={{ ...Spring.Gentle, delay: 0.05 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: false positive
                  key={index}
                  className="h-2 rounded-full"
                  animate={{
                    width: index === current ? 42 : 16,
                    backgroundColor:
                      index <= current
                        ? "var(--color-primary)"
                        : "var(--color-accent-foreground)",
                  }}
                  transition={Spring.Gentle}
                />
              ))}
            </div>
            <span className="whitespace-nowrap font-light text-foreground-dimmed text-sm">
              {translate("stepProgress", {
                current: String(current + 1),
                total: String(steps.length),
              })}
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
};
