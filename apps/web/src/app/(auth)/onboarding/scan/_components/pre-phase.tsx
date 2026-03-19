"use client";

import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Spring } from "@/lib/animations";

export namespace PrePhase {
  export type Props = {
    children: ReactNode;
    onRun: () => void;
    isRunning: boolean;
  };
}

export const PrePhase = ({ children, onRun, isRunning }: PrePhase.Props) => (
  <motion.div
    key="pre"
    className="flex flex-1 flex-col overflow-hidden"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={Spring.Gentle}
  >
    <div className="mx-8 flex flex-1 flex-col border-x border-accent-foreground">
      {/* Content — model grids, stats, etc. from scan/page.tsx */}
      <div className="-mx-8 flex-1 overflow-y-auto border-y border-accent-foreground">
        <div className="mx-8 py-8">
          {children}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-6">
      <Button
        variant="flat"
        color="primary"
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className="w-full py-3.5 font-medium text-base"
      >
        Run Simulation
      </Button>
      <div className="mt-3 flex items-center justify-center">
        <Button
          variant="ghost"
          color="neutral"
          type="button"
          className="text-foreground-dimmed text-sm"
          render={<Link href="/onboarding/competitors" />}
        >
          Back
        </Button>
      </div>
    </div>
  </div>
  </motion.div>
);
