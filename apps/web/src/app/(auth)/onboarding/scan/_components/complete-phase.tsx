"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";

const metadatas = [
  {
    id: "gpt4",
    label: "GPT-4",
    color: "text-blue-500",
    bgColor: "bg-blue-500",
  },
  {
    id: "claude",
    label: "Claude",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  {
    id: "gemini",
    label: "Gemini",
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
] as const;

export namespace CompletePhase {
  export type Props = {
    wins: number;
    losses: number;
    winRates: Record<string, { wins: number; losses: number; rate: number }>;
    topFinding: {
      name: string;
      missingAttributes: string[];
      impactDescription: string;
      lossPercentage: number;
    } | null;
    products: number;
  };
}

export const CompletePhase = ({
  wins,
  losses,
  winRates,
  topFinding,
  products: finalProductCount,
}: CompletePhase.Props) => {
  const router = useRouter();

  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const resultMessage = (() => {
    switch (true) {
      case winRate < 30:
        return "AI agents are choosing your competitors most of the time. Let's fix that.";
      case winRate < 60:
        return "You're competitive, but there's significant room to win more. Let's see where.";
      default:
        return "You're ahead of most competitors. Let's make sure you stay there.";
    }
  })();

  const resultColor = (() => {
    switch (true) {
      case winRate < 30:
        return "text-error";
      case winRate < 60:
        return "text-warning";
      default:
        return "text-success";
    }
  })();

  return (
    <motion.div
      key="complete"
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={Spring.Gentle}
    >
      <div className="mx-8 flex flex-1 flex-col border-x border-accent-foreground overflow-y-auto px-6 py-12">
      <Motion.Stagger stagger={0.08} className="mx-auto w-full max-w-2xl">
        <Motion.Up className="mb-8 grid grid-cols-[1fr_auto] gap-px border border-accent-foreground bg-accent-foreground">
          <div className="bg-background-rich px-6 py-8">
            <p className="mb-2 font-light text-foreground-dimmed text-xs uppercase tracking-widest">
              Overall Win Rate
            </p>
            <motion.p
              className={cn(
                "font-semibold text-[80px] leading-none",
                resultColor,
              )}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...Spring.Gentle, delay: 0.15 }}
            >
              {winRate}%
            </motion.p>
            <p className="mt-4 max-w-xs font-light text-foreground text-sm">
              {resultMessage}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
            {[
              { label: "Wins", value: wins, color: "text-success" },
              { label: "Losses", value: losses, color: "text-error" },
              {
                label: "Products",
                value: finalProductCount,
                color: "text-foreground",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="flex flex-1 flex-col items-center justify-center px-8 py-4"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...Spring.Snappy, delay: 0.2 + index * 0.07 }}
              >
                <span className={cn("font-semibold text-3xl", stat.color)}>
                  {stat.value}
                </span>
                <span className="mt-0.5 font-light text-foreground-dimmed text-xs">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </Motion.Up>

        <Motion.Up className="mb-4 border border-accent-foreground bg-background-rich">
          <div className="border-accent-foreground border-b px-4 py-3">
            <p className="font-medium text-foreground text-sm">
              Win rate by model
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-accent-foreground">
            {metadatas.map((meta, index) => {
              const rates = winRates[meta.id];
              const rate = rates?.rate ?? 0;
              return (
                <div key={meta.id} className="flex flex-col gap-3 px-4 py-4">
                  <div className="flex items-end justify-between">
                    <span className="font-light text-foreground-dimmed text-xs">
                      {meta.label}
                    </span>
                    <span className="font-semibold text-foreground text-lg">
                      {rate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-accent-foreground">
                    <motion.div
                      className={cn("h-full", meta.bgColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${rate}%` }}
                      transition={{
                        ...Spring.Gentle,
                        delay: 0.35 + index * 0.1,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Motion.Up>

        {topFinding && (
          <Motion.Up className="mb-8 border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="mb-1.5 font-medium text-primary text-xs uppercase tracking-widest">
              Top Finding
            </p>
            <p className="font-light text-foreground text-sm">
              {topFinding.name} loses on{" "}
              <span className="font-medium text-foreground">
                {topFinding.missingAttributes.join(" and ")}
              </span>{" "}
              — {topFinding.impactDescription} Costs you{" "}
              {topFinding.lossPercentage}% of simulations.
            </p>
          </Motion.Up>
        )}

        <motion.div
          className="flex flex-col gap-2"
          variants={Stagger.Container(0.07)}
        >
          <motion.div
            variants={Stagger.Item}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={Spring.Snappy}
          >
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center justify-center gap-2 py-3.5 font-medium text-base"
            >
              Go to Dashboard
              <ArrowRightIcon className="size-4" />
            </Button>
          </motion.div>
          <motion.button
            variants={Stagger.Item}
            type="button"
            className="w-full border border-accent-foreground bg-background-rich py-2.5 font-light text-foreground text-sm transition-colors hover:bg-background-dimmed"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={Spring.Snappy}
          >
            Share Results
          </motion.button>
        </motion.div>
      </Motion.Stagger>
      </div>
    </motion.div>
  );
};
