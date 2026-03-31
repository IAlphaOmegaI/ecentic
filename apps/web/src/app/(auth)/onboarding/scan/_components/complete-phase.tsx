"use client";

import {
  ArrowLeftIcon,
  AwardIcon,
  LoaderIcon,
  ShareIcon,
  ShoppingCartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";
import type * as Simulate from "@/server/app/intelligence/simulate";

const models = [
  { id: "gpt4", label: "GPT-4", logo: "/images/chatgpt.svg" },
  { id: "claude", label: "Claude", logo: "/images/claude.svg" },
  { id: "gemini", label: "Gemini", logo: "/images/gemini.svg" },
  { id: "perplexity", label: "Perplexity", logo: "/images/perplexity.svg" },
] as const;

export namespace CompletePhase {
  export type Props = {
    wins: number;
    losses: number;
    winRates: Record<string, { wins: number; losses: number; rate: number }>;
    topFinding: Simulate.TopFinding | null;
    products: number;
    scanId: string | null;
  };
}

export const CompletePhase = ({
  wins,
  losses,
  winRates,
  topFinding,
  products: finalProductCount,
  scanId,
}: CompletePhase.Props) => {
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const message = (() => {
    switch (true) {
      case winRate < 30:
        return "AI agents are choosing your competitors most of the time. Let's fix that.";
      case winRate < 60:
        return "You're competitive, but there's significant room to win more. Let's see where.";
      default:
        return "You're ahead of most competitors. Let's make sure you stay there.";
    }
  })();

  const color = (() => {
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
      className="flex h-full flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={Spring.Gentle}
    >
      <Motion.Stagger
        stagger={0.05}
        className="flex h-full flex-col overflow-y-auto"
      >
        <Motion.Item className="border-accent-foreground border-b px-8">
          <div className="border-accent-foreground border-x p-6">
            <h1 className="font-medium text-4xl text-foreground">
              Scan complete.
            </h1>
            <p className="font-light text-2xl text-foreground-dimmed">
              {message}
            </p>
          </div>
        </Motion.Item>

        <Motion.Item className="border-accent-foreground border-b px-8 h-auto">
          <motion.div
            className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-x"
            variants={Stagger.Container(0.06)}
            initial="hidden"
            animate="visible"
          >
            {models.map(({ id, label, logo }, index) => {
              const rates = winRates[id];
              const rate = rates?.rate ?? 0;
              return (
                <motion.div
                  key={id}
                  className="flex aspect-square flex-col bg-background-dimmed p-4"
                  variants={Stagger.Item}
                >
                  <Image
                    src={logo}
                    alt={label}
                    width={48}
                    height={48}
                    className="mb-4"
                  />
                  <span className="mt-auto font-medium text-lg text-foreground">
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-light text-success text-sm leading-tight">
                      {rates?.wins ?? 0} W
                    </span>
                    <span className="text-foreground-dimmed/30 text-sm leading-tight">
                      —
                    </span>
                    <span className="font-light text-error text-sm leading-tight">
                      {rates?.losses ?? 0} L
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-accent-foreground">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{
                          ...Spring.Gentle,
                          delay: 0.35 + index * 0.1,
                        }}
                      />
                    </div>
                    <span className="font-light text-foreground-dimmed">
                      {rate}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </Motion.Item>

        {topFinding && (
          <Motion.Item className="border-accent-foreground border-b px-8">
            <div className="border-primary/20 border-x bg-primary/5 p-6">
              <p className="mb-1.5 font-medium text-primary uppercase tracking-widest">
                Top Finding
              </p>
              <p className="font-light text-foreground">
                {topFinding.name} loses on{" "}
                <span className="font-medium text-foreground">
                  {topFinding.missingAttributes.join(" and ")}
                </span>{" "}
                — {topFinding.impactDescription} Costs you{" "}
                {topFinding.lossPercentage}% of simulations.
              </p>
            </div>
          </Motion.Item>
        )}

        <Motion.Item className="border-accent-foreground border-b px-8 h-auto">
          <div className="grid grid-cols-2 gap-px border-accent-foreground border-x bg-accent-foreground">
            <div className="flex items-center gap-2 bg-background-dimmed p-4">
              <div className="flex items-center gap-2">
                <AwardIcon className="size-12 text-foreground" />
                <div>
                  <p className={cn("font-medium text-2xl", color)}>
                    {winRate}%
                  </p>
                  <p className="font-light text-foreground-dimmed">Win rate</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background-dimmed p-4">
              <ShoppingCartIcon className="size-12 text-primary" />
              <div>
                <p className="font-medium text-2xl text-primary">
                  {finalProductCount}
                </p>
                <p className="font-light text-foreground-dimmed">Products</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background-dimmed p-4">
              <TrendUpIcon className="size-12 text-success" />
              <div>
                <p className="font-medium text-2xl text-success">{wins}</p>
                <p className="font-light text-foreground-dimmed">Wins</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background-dimmed p-4">
              <TrendDownIcon className="size-12 text-error" />
              <div>
                <p className="font-medium text-2xl text-error">{losses}</p>
                <p className="font-light text-foreground-dimmed">Losses</p>
              </div>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item className="mt-auto px-8">
          <div className="flex items-center justify-between border-accent-foreground border-x p-6">
            <Button
              variant="outline"
              color="accent"
              type="button"
              render={<Link href="/onboarding/scan" />}
            >
              <Back />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                color="accent"
                type="button"
                render={<Link href={scanId ? `/share/${scanId}` : "#"} />}
              >
                <Share />
              </Button>
              <Button
                variant="flat"
                color="primary"
                type="button"
                render={<Link href="/onboarding/buy" />}
              >
                <Buy />
              </Button>
            </div>
          </div>
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back to scan
    </>
  );
};

const Share = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Share
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ShareIcon className="size-4" />
      )}
    </>
  );
};

const Buy = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ShoppingCartIcon className="size-4" />
      )}
      Buy Now
    </>
  );
};
