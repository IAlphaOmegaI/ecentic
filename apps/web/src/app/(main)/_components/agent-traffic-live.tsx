"use client";

import NumberFlow, { NumberFlowElement } from "@number-flow/react";
import { cn } from "@zenncore/utils";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

type AgentModel = {
  name: string;
  category: string;
  visits: number;
  color: string;
};

const DEMO_AGENTS: AgentModel[] = [
  {
    name: "ChatGPT / GPT-4",
    category: "Agentic browser",
    visits: 3847,
    color: "bg-emerald-500",
  },
  {
    name: "Claude",
    category: "Agentic browser",
    visits: 2914,
    color: "bg-orange-400",
  },
  {
    name: "Gemini",
    category: "Agentic browser",
    visits: 2103,
    color: "bg-blue-500",
  },
  {
    name: "Perplexity",
    category: "Search agent",
    visits: 1658,
    color: "bg-purple-500",
  },
  {
    name: "Google AI Overview",
    category: "Search crawler",
    visits: 892,
    color: "bg-yellow-500",
  },
];

const total = DEMO_AGENTS.reduce((sum, a) => sum + a.visits, 0);

const AnimatedCount = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<NumberFlowElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
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
  }, [target]);

  return <NumberFlow value={count} ref={ref} animated={inView} />;
};

export const AgentTrafficLive = () => (
  <section className="border-accent-foreground border-y p-4 md:p-6">
    <div className="mb-3 flex items-center gap-2">
      <span className="size-2.5 animate-pulse rounded-full bg-primary" />
      <p className="font-medium text-primary text-xs uppercase tracking-[0.2em]">
        Live agent traffic — écentic.ai, last 30 days
      </p>
    </div>
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="font-body text-3xl text-foreground leading-tight md:text-5xl">
          AI agents are already shopping your store.
        </h2>
        <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
          écentic detects which models visit, when they crawl, and whether your
          listings pass their evaluation. Most merchants have no idea this is
          happening.
        </p>
        <p className="mt-3 font-semibold text-4xl text-foreground tabular-nums">
          <AnimatedCount target={total} />
          <span className="ml-2 font-light text-foreground-dimmed text-base">
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
                <div>
                  <span className="font-medium text-foreground">
                    {agent.name}
                  </span>
                  <span className="ml-2 text-foreground-dimmed">
                    {agent.category}
                  </span>
                </div>
                <span className="font-medium text-foreground tabular-nums">
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
