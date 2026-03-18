"use client";

import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
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
    className="flex flex-1 flex-col items-center justify-center px-6 py-12"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={Spring.Gentle}
  >
    {children}
    <div className="w-full max-w-2xl">
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
      <div className="mt-4 flex items-center justify-center">
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
  </motion.div>
);
