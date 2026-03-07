"use client";

import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

const steps = [
  { label: "Connect Store", path: "/onboarding/connect" },
  { label: "Select Products", path: "/onboarding/select-products" },
  { label: "Add Competitors", path: "/onboarding/competitors" },
  { label: "Run Scan", path: "/onboarding/first-scan" },
] as const;

const sidebarContent = {
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
  "/onboarding/select-products": {
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
  "/onboarding/first-scan": {
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
  const currentIndex = steps.findIndex((step) => step.path === pathname);

  const content =
    sidebarContent[pathname as keyof typeof sidebarContent] ??
    sidebarContent["/onboarding/connect"];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex lg:w-1/2 sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <Image
          src="/images/onboarding-photo.png"
          alt=""
          fill
          className="object-contain object-bottom opacity-20"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
          <Image
            src="/images/wordmark.svg"
            alt="écentic"
            width={120}
            height={32}
            className="h-auto w-28 brightness-0 invert"
          />
          <div className="flex flex-1 items-end pb-2">
            <h2 className="font-medium text-6xl text-white leading-none mb-6">
              {content.headline}
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {content.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <CheckIcon className="size-3 text-white" />
                  </div>
                  <p className="font-light text-sm text-white/90">{point}</p>
                </div>
              ))}
            </div>
            <p className="font-light text-sm text-white/50">
              Free to start. No credit card required.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b border-accent-foreground bg-background-rich px-6 py-4">
          <div className="hidden items-center gap-1 sm:flex">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.path} className="flex items-center gap-1">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-all duration-300 ease-in-out ${
                      isCurrent
                        ? "bg-primary text-white scale-105"
                        : isCompleted
                          ? "text-primary scale-100"
                          : "text-foreground-dimmed opacity-40 scale-100"
                    }`}
                  >
                    <span className="relative flex size-4 items-center justify-center overflow-hidden text-xs">
                      <span
                        className={`absolute transition-all duration-300 ease-in-out ${
                          isCompleted
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-3 opacity-0"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`absolute transition-all duration-300 ease-in-out ${
                          !isCompleted
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </span>
                    {step.label}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-px w-4 transition-colors duration-500 ${
                        isCompleted ? "bg-primary" : "bg-accent-foreground"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <span className="font-light text-foreground-dimmed text-xs">
              Step {currentIndex + 1} of {steps.length}
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};
