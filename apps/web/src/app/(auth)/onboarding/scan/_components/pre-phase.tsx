"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
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
    {children}

    <Motion.Item className="mt-auto px-8">
      <div className="flex items-center justify-between border-accent-foreground border-x p-6">
        <Button
          variant="outline"
          color="accent"
          type="button"
          render={<Link href="/onboarding/competitors" />}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <Button
          variant="flat"
          color="primary"
          type="button"
          onClick={onRun}
          disabled={isRunning}
        >
          Run Simulation
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </Motion.Item>
  </motion.div>
);
