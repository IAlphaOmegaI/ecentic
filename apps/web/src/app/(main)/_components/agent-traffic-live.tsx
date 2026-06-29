"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@zenncore/utils";
import { useInView } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type AgentModel = {
  name: string;
  category: string;
  visits: number;
  color: string;
  logo: string;
};

const DEMO_AGENTS: AgentModel[] = [
  {
    name: "ChatGPT / GPT-4",
    category: "Agentic browser",
    visits: 3847,
    color: "bg-emerald-500",
    logo: "/images/chatgpt.svg",
  },
  {
    name: "Claude",
    category: "Agentic browser",
    visits: 2914,
    color: "bg-orange-400",
    logo: "/images/claude.svg",
  },
  {
    name: "Gemini",
    category: "Agentic browser",
    visits: 2103,
    color: "bg-blue-500",
    logo: "/images/gemini.svg",
  },
  {
    name: "Perplexity",
    category: "Search agent",
    visits: 1658,
    color: "bg-purple-500",
    logo: "/images/perplexity.svg",
  },
  {
    name: "Google AI Overview",
    category: "Search crawler",
    visits: 892,
    color: "bg-yellow-500",
    logo: "/images/google.svg",
  },
];

const total = DEMO_AGENTS.reduce((sum, a) => sum + a.visits, 0);

const AnimatedCount = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, inView]);

  return (
    <span ref={ref}>
      <NumberFlow value={count} />
    </span>
  );
};

export const AgentTrafficLive = () => (
  <section className="border-accent-foreground border-y p-4 md:p-6">
    <div className="mb-3 flex items-center gap-2">
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <span className="absolute size-full animate-ping rounded-full bg-primary opacity-40" />
        <span className="relative size-2.5 rounded-full bg-primary" />
      </span>
      <p className="font-light text-primary text-xl">
        Live agent traffic — ecentic.ai, last 30 days
      </p>
    </div>
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="font-body text-3xl text-foreground leading-tight md:text-5xl">
          AI agents are already shopping your store.
        </h2>
        <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
          ecentic detects which models visit, when they crawl, and whether your
          listings pass their evaluation. Most merchants have no idea this is
          happening.
        </p>
        <p className="mt-3 font-semibold text-4xl text-primary tabular-nums">
          <AnimatedCount target={total} />
          <span className="ml-2 font-light text-base text-foreground-dimmed">
            agent visits detected
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DEMO_AGENTS.map((agent) => {
          const pct = Math.round((agent.visits / total) * 100);
          return (
            <div key={agent.name}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={agent.logo}
                    alt={agent.name}
                    width={20}
                    height={20}
                    className="size-5 shrink-0"
                    unoptimized
                  />
                  <span className="font-medium text-foreground">
                    {agent.name}
                  </span>
                  <span className="text-foreground-dimmed text-sm">
                    {agent.category}
                  </span>
                </div>
                <span className="font-medium text-primary tabular-nums">
                  {agent.visits.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full bg-accent-foreground">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    agent.color,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
