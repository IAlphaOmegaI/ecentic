"use client";

import { CheckIcon } from "@zenncore/icons";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Onboarding } from "@/components/onboarding";

const steps = [
  { label: "Connect Store", path: "/onboarding/connect" },
  { label: "Select Products", path: "/onboarding/products" },
  { label: "Add Competitors", path: "/onboarding/competitors" },
  { label: "Run Scan", path: "/onboarding/scan" },
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
      "Generate a read-only key from your WooCommerce settings",
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
      "GPT-4, Claude & Gemini simulate real shopping queries",
      "We score every product against your competitors",
      "You'll know exactly what to fix before leaving this page",
    ],
  },
} as const;

export default ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const current = steps.findIndex((step) => pathname.startsWith(step.path));

  const content =
    sidebar[pathname as keyof typeof sidebar] ?? sidebar["/onboarding/connect"];

  return (
    <div className="flex min-h-screen bg-primary">
      <Onboarding
        identifier={pathname}
        headline={content.headline}
        points={content.points}
      />

      <main className="flex flex-1 flex-col overflow-hidden bg-background md:rounded-l-xl">
        <div className="border-accent-foreground border-b bg-background-rich px-6 py-4">
          <div className="hidden items-center gap-1 sm:flex">
            {steps.map((step, index) => {
              const isCompleted = index < current;
              const isCurrent = index === current;

              return (
                <div key={step.path} className="flex items-center gap-1">
                  <div className="relative">
                    {isCurrent && (
                      <div className="absolute inset-0 bg-primary" />
                    )}
                    <div
                      className={`relative z-10 flex items-center gap-1.5 px-3 py-1 font-medium text-xs transition-colors ${
                        isCurrent
                          ? "text-white"
                          : isCompleted
                            ? "text-primary"
                            : "text-foreground-dimmed opacity-40"
                      }`}
                    >
                      <span className="relative flex size-4 items-center justify-center overflow-hidden text-xs">
                        {isCompleted ? (
                          <span className="absolute">
                            <CheckIcon className="size-3 text-foreground-dimmed" />
                          </span>
                        ) : (
                          <span className="absolute">{index + 1}</span>
                        )}
                      </span>
                      {step.label}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className="h-px w-4"
                      style={{
                        backgroundColor: isCompleted
                          ? "rgb(21,114,250)"
                          : "var(--color-accent-foreground)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <span className="font-light text-foreground-dimmed text-xs">
              Step {current + 1} of {steps.length}
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
};
