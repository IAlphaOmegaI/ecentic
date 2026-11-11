"use client";

import { CursorRaysIcon, FileSearchIcon, QuoteIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useEffect, useRef, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { MarketingPage } from "@/components/marketing/page";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { useDocument } from "@/hooks/use-document";

const icons = [FileSearchIcon, CursorRaysIcon, QuoteIcon] as const;

export const SimulateRoadmap = ({ items, labels }: SimulateRoadmap.Props) => {
  const { ready, reduced } = useInteractive();
  const { window, document } = useDocument();
  const container = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const enhanced = ready && !reduced;

  useEffect(() => {
    if (!enhanced) setPlaying(false);
  }, [enhanced]);

  useEffect(() => {
    if (!enhanced || !window || !document || !container.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35,
        );
        if (!visible) {
          setPlaying(false);
          return;
        }
        if (started.current || document.hidden) return;
        started.current = true;
        setPlaying(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [enhanced, window, document]);

  useEffect(() => {
    if (!document) return;
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [document]);

  useEffect(() => {
    if (!enhanced || !playing || !window) return;
    const timer = window.setTimeout(() => {
      if (current >= items.length - 1) {
        setPlaying(false);
        return;
      }
      setCurrent(current + 1);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [enhanced, playing, current, items.length, window]);

  return (
    <div
      ref={container}
      data-simulate-roadmap=""
      data-playing={enhanced && playing}
      data-current={current}
      className="relative flex h-full flex-col bg-linear-to-br from-primary/6 via-background to-background"
    >
      <div className="flex items-center justify-between gap-4 border-accent-foreground border-b px-8 py-6 max-sm:px-4">
        <p className="font-medium text-foreground-rich text-sm">
          {labels.title}
        </p>
        {enhanced && (
          <Button
            variant="ghost"
            color="neutral"
            onClick={() => {
              started.current = true;
              if (current === items.length - 1) setCurrent(0);
              setPlaying(!playing);
            }}
          >
            {playing ? labels.pause : labels.play}
          </Button>
        )}
      </div>
      <ol aria-label={labels.title} className="flex flex-1 flex-col">
        {items.map((item, index) => {
          const Icon = icons[index % icons.length] ?? FileSearchIcon;
          const active = enhanced && index === current;
          return (
            <li
              key={item.title}
              className="relative grid flex-1 grid-cols-[72px_1fr] border-accent-foreground border-b last:border-b-0 max-sm:grid-cols-[56px_1fr]"
            >
              <div className="relative flex justify-center border-accent-foreground border-r pt-8 before:absolute before:inset-y-0 before:left-1/2 before:border-accent-foreground before:border-l">
                <span className="relative z-1 h-fit bg-background py-2">
                  {enhanced ? (
                    <Button
                      color={active ? "primary" : "neutral"}
                      aria-label={`${labels.stages[index]}: ${item.title}`}
                      aria-pressed={active}
                      onClick={() => {
                        started.current = true;
                        setPlaying(false);
                        setCurrent(index);
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </Button>
                  ) : (
                    <span className="px-2 font-heading text-2xl text-primary-text">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative px-6 py-8 max-sm:px-4">
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
                <Motion.Item
                  initial={false}
                  animate={{
                    transform:
                      active || !enhanced
                        ? "translateX(0px)"
                        : "translateX(2px)",
                  }}
                  transition={{ duration: enhanced ? 0.2 : 0 }}
                >
                  <div className="mb-4 flex items-center gap-4 text-primary-text">
                    <Icon aria-hidden className="size-6" />
                    <span className="font-medium text-sm">
                      {labels.stages[index]}
                    </span>
                  </div>
                  <h3 className={cn("text-xl", active && "text-primary-text")}>
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-[34ch] text-foreground-dimmed leading-relaxed">
                    {item.body}
                  </p>
                </Motion.Item>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
export namespace SimulateRoadmap {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    labels: {
      title: string;
      stages: readonly string[];
      play: string;
      pause: string;
    };
  };
}
