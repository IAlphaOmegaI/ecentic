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
import { usePathname } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Spring } from "@/lib/animations";

const steps = [
  {
    label: "Catalog",
    path: "/onboarding/connect",
    icon: ShoppingCartIcon,
  },
  { label: "Select Products", path: "/onboarding/products", icon: PhotoIcon },
  {
    label: "Competitors",
    path: "/onboarding/competitors",
    icon: FaceSearchIcon,
  },
  { label: "Run Scan", path: "/onboarding/scan", icon: CircleBoltIcon },
] as const;

const sidebar = {
  "/onboarding/connect": {
    headline: (
      <>
        Connect your
        <br />
        catalog.
      </>
    ),
    points: [
      "Paste your store URL and we sync your products instantly",
      "Works with Shopify, WooCommerce, and custom feeds",
      "Your catalog stays live and always up to date",
    ],
  },
  "/onboarding/connect/shopify": {
    headline: (
      <>
        Shopify
        <br />
        OAuth.
      </>
    ),
    points: [
      "One-click authorization — we never see your password",
      "Read-only access to your product catalog",
      "Products stay in sync automatically",
    ],
  },
  "/onboarding/connect/woocommerce": {
    headline: (
      <>
        WooCommerce
        <br />
        API keys.
      </>
    ),
    points: [
      "Generate a REST API key in WooCommerce (read/write to publish listing updates from ecentic, or read-only for sync only)",
      "Paste three fields and we handle the rest",
      "Your credentials are encrypted and stored securely",
    ],
  },
  "/onboarding/connect/feed": {
    headline: (
      <>
        Product
        <br />
        feed.
      </>
    ),
    points: [
      "Works with Google Shopping XML and JSON feeds",
      "We auto-detect the format and parse every product",
      "Re-sync anytime to pick up changes",
    ],
  },
  "/onboarding/products": {
    headline: (
      <>
        Pick your
        <br />
        best.
      </>
    ),
    points: [
      "Choose which products to run through AI agent simulations",
      "Focus on your top sellers or most competitive SKUs",
      "You can add more products any time",
    ],
  },
  "/onboarding/competitors": {
    headline: (
      <>
        Know your
        <br />
        rivals.
      </>
    ),
    points: [
      "Add competitors so we benchmark you head-to-head",
      "See exactly who agents pick over you and why",
      "Track the gap and close it faster",
    ],
  },
  "/onboarding/scan": {
    headline: (
      <>
        See who's
        <br />
        winning.
      </>
    ),
    points: [
      "GPT-4, Claude, Gemini & Perplexity simulate real shopping queries",
      "We score every product against your competitors",
      "You'll know exactly what to fix before leaving this page",
    ],
  },
} as const;

export const OnboardingLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const current = steps.findIndex((step) => pathname.startsWith(step.path));

  const content =
    sidebar[pathname as keyof typeof sidebar] ?? sidebar["/onboarding/connect"];

  return (
    <div className="flex h-screen bg-primary">
      <Onboarding
        identifier={pathname}
        headline={content.headline}
        points={content.points}
      />

      <main className="flex h-full flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-center border-accent-foreground border-b px-8">
          <div className="relative mx-auto flex w-full items-center justify-center gap-0 border-accent-foreground border-x py-2">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
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
              Step {current + 1} of {steps.length}
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
};
