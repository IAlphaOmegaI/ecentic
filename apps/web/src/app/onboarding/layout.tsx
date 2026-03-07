"use client";

import { CheckIcon } from "@zenncore/icons";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { spring, staggerContainer, staggerItem } from "@/lib/animations";

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
      <motion.aside
        className="hidden lg:flex lg:w-1/2 sticky top-0 h-screen overflow-hidden"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={spring.gentle}
      >
        <div className="absolute inset-0 bg-primary" />
        <Image
          src="/images/onboarding-photo.png"
          alt=""
          fill
          className="object-contain object-bottom opacity-20"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.15 }}
          >
            <Image
              src="/images/wordmark.svg"
              alt="écentic"
              width={120}
              height={32}
              className="h-auto w-28 brightness-0 invert"
            />
          </motion.div>

          <div className="flex flex-1 items-end pb-2">
            <AnimatePresence mode="wait">
              <motion.h2
                key={pathname}
                className="font-medium text-6xl text-white leading-none mb-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={spring.gentle}
              >
                {content.headline}
              </motion.h2>
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname + "-points"}
                className="flex flex-col gap-3"
                variants={staggerContainer(0.08)}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                {content.points.map((point) => (
                  <motion.div
                    key={point}
                    className="flex items-start gap-3"
                    variants={staggerItem}
                  >
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <CheckIcon className="size-3 text-white" />
                    </div>
                    <p className="font-light text-sm text-white/90">{point}</p>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
            <p className="font-light text-sm text-white/50">
              Free to start. No credit card required.
            </p>
          </div>
        </div>
      </motion.aside>

      <main className="flex flex-1 flex-col">
        <motion.div
          className="border-b border-accent-foreground bg-background-rich px-6 py-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.snappy, delay: 0.1 }}
        >
          <div className="hidden items-center gap-1 sm:flex">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.path} className="flex items-center gap-1">
                  <div className="relative">
                    {isCurrent && (
                      <motion.div
                        layoutId="onboarding-step-active"
                        className="absolute inset-0 bg-primary"
                        transition={spring.snappy}
                      />
                    )}
                    <div
                      className={`relative z-10 flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
                        isCurrent
                          ? "text-white"
                          : isCompleted
                            ? "text-primary"
                            : "text-foreground-dimmed opacity-40"
                      }`}
                    >
                      <span className="relative flex size-4 items-center justify-center overflow-hidden text-xs">
                        <AnimatePresence mode="wait">
                          {isCompleted ? (
                            <motion.span
                              key="check"
                              className="absolute"
                              initial={{ y: -8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 8, opacity: 0 }}
                              transition={spring.snappy}
                            >
                              ✓
                            </motion.span>
                          ) : (
                            <motion.span
                              key="num"
                              className="absolute"
                              initial={{ y: -8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 8, opacity: 0 }}
                              transition={spring.snappy}
                            >
                              {index + 1}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      {step.label}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <motion.div
                      className="h-px w-4"
                      animate={{
                        backgroundColor: isCompleted
                          ? "rgb(21,114,250)"
                          : "var(--color-accent-foreground)",
                      }}
                      transition={{ duration: 0.4 }}
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
        </motion.div>

        {children}
      </main>
    </div>
  );
};
