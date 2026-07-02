"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Spring } from "@/lib/animations";

export namespace PrePhase {
  export type Props = {
    children: ReactNode;
    onRun: () => void;
    canRun: boolean;
    isRunning: boolean;
  };
}

export const PrePhase = ({
  children,
  onRun,
  canRun,
  isRunning,
}: PrePhase.Props) => (
  <motion.div
    key="pre"
    className="flex flex-1 flex-col overflow-y-auto"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={Spring.Gentle}
  >
    {children}

    <Motion.Item className="mt-auto px-8">
      <div className="relative flex items-center justify-between border-accent-foreground border-x p-6">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Button
          color="accent"
          type="button"
          render={<Link href="/onboarding/competitors" />}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <Button
          color="primary"
          type="button"
          onClick={onRun}
          disabled={!canRun || isRunning}
        >
          Run Simulation
          {isRunning ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-4" />
          )}
        </Button>
      </div>
    </Motion.Item>
  </motion.div>
);
