"use client";

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

const sidebarMessages = {
  "/onboarding/connect":
    "Let's connect your catalog so agents can find your products.",
  "/onboarding/select-products":
    "Pick the products you want to test against AI agents.",
  "/onboarding/competitors":
    "Who are you competing against? We'll find out who's winning.",
  "/onboarding/first-scan":
    "Running your products through the gauntlet. This is going to be eye-opening.",
} as const;

export default ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const currentIndex = steps.findIndex((step) => step.path === pathname);

  const sidebarMessage =
    sidebarMessages[pathname as keyof typeof sidebarMessages] ??
    sidebarMessages["/onboarding/connect"];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-accent-foreground border-b bg-background-rich px-6 py-4">
        <Link href="/">
          <Image
            src="/images/trademark.svg"
            alt="écentic"
            width={100}
            height={28}
            className="h-auto w-24"
          />
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.path} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isCompleted
                        ? "text-foreground-dimmed"
                        : "text-foreground-dimmed opacity-40"
                  }`}
                >
                  <span
                    className={`flex size-4 items-center justify-center text-xs ${
                      isCompleted
                        ? "text-foreground-dimmed"
                        : isCurrent
                          ? "text-white"
                          : "text-foreground-dimmed"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </span>
                  {step.label}
                </div>
                {index < steps.length - 1 && (
                  <div className="h-px w-4 bg-accent-foreground" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 sm:hidden">
          <span className="text-foreground-dimmed text-xs">
            Step {currentIndex + 1} of {steps.length}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 flex-col justify-between border-accent-foreground border-r bg-background-rich p-8 lg:flex">
          <p className="font-light text-foreground-dimmed text-sm leading-relaxed">
            {sidebarMessage}
          </p>
          <p className="font-light text-foreground-dimmed text-xs">
            écentic — Infrastructure for the agent economy.
          </p>
        </aside>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
};
