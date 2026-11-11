"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "./use-interactive";

export const StepPlayer = ({
  steps,
  label,
  labels,
  playback = false,
  interval = 2500,
  activateOnFocus = false,
  selected,
  onStepChange,
  announcement,
  className,
}: StepPlayer.Props) => {
  const { ready, reduced } = useInteractive();
  const { document, window } = useDocument();
  const [selection, setSelection] = useState(steps[0]?.id ?? "");
  const [frame, setFrame] = useState({ id: "", index: 0 });
  const [playing, setPlaying] = useState(false);
  const active =
    steps.find((step) => step.id === (selected ?? selection)) ?? steps[0];
  const timeline = steps.flatMap((step) =>
    Array.from({ length: step.frames?.length || 1 }, (_, index) => ({
      id: step.id,
      index,
    })),
  );
  const position = Math.max(
    0,
    timeline.findIndex(
      (item) =>
        item.id === active?.id &&
        item.index === (frame.id === active?.id ? frame.index : 0),
    ),
  );
  const last = position === timeline.length - 1;
  const current = timeline[position];
  const currentFrame = active?.frames?.[current?.index ?? 0];
  const enhanced = ready && !reduced;
  const select = useCallback(
    (id: string, index = 0) => {
      setSelection(id);
      setFrame({ id, index });
      onStepChange?.(id);
    },
    [onStepChange],
  );

  useEffect(() => {
    if (!enhanced) setPlaying(false);
  }, [enhanced]);

  useEffect(() => {
    if (!document || !playing) return;
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    pause();
    return () => document.removeEventListener("visibilitychange", pause);
  }, [document, playing]);

  useEffect(() => {
    if (!window || !enhanced || !playing || !playback) return;
    const next = timeline[position + 1];
    if (!next) {
      setPlaying(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      select(next.id, next.index);
      if (position + 1 === timeline.length - 1) setPlaying(false);
    }, interval);
    return () => window.clearTimeout(timeout);
  }, [
    window,
    enhanced,
    playing,
    playback,
    interval,
    position,
    select,
    timeline,
  ]);

  if (!active) return null;
  const navigate = (offset: number) => {
    setPlaying(false);
    const next = timeline[position + offset];
    if (next) select(next.id, next.index);
  };

  return (
    <div
      className={cn("min-w-0", className)}
      data-step-player=""
      data-enhanced={enhanced}
      data-playing={playing}
      data-step={active.id}
      data-frame={current?.index ?? 0}
    >
      {enhanced ? (
        <Tabs
          value={active.id}
          onValueChange={(value) => {
            if (typeof value !== "string") return;
            setPlaying(false);
            select(value);
          }}
        >
          <TabsList
            aria-label={label}
            activateOnFocus={activateOnFocus}
            className="grid w-full grid-cols-2 overflow-visible rounded-none border-0 border-accent-foreground border-y bg-transparent sm:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]"
            style={{ "--step-count": steps.length } as CSSProperties}
          >
            {steps.map((step, index) => (
              <Tab
                key={step.id}
                value={step.id}
                className={cn(
                  "relative h-auto min-h-20 min-w-0 items-start justify-start gap-2 rounded-none border-accent-foreground border-t-0 border-r-0 border-b border-l px-4 py-4 text-left text-foreground text-sm leading-snug outline-offset-[-1px] before:hidden hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-primary/40 data-[active]:text-foreground-rich data-selected:text-foreground-rich data-selected:outline-1 data-selected:outline-primary sm:border-b-0",
                  index % 2 === 0 && "border-l-0",
                  index >= Math.floor((steps.length - 1) / 2) * 2 &&
                    "border-b-0",
                  index > 0 && "sm:border-l",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full",
                    step.id === active.id
                      ? "bg-primary"
                      : "bg-foreground-dimmed/30",
                  )}
                />
                <span>
                  <span
                    className={cn(
                      "mb-2 block font-heading tabular-nums",
                      step.id === active.id
                        ? "text-primary-text"
                        : "text-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step.label}
                </span>
              </Tab>
            ))}
          </TabsList>
          {steps.map((step) => (
            <TabsPanel
              key={step.id}
              value={step.id}
              className="min-w-0 outline-none"
            >
              {step.id === active.id
                ? (currentFrame?.content ?? step.content)
                : step.content}
            </TabsPanel>
          ))}
          {playback && labels && (
            <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-t px-4 py-6 md:px-6">
              <Button
                onClick={() => {
                  if (last) select(steps[0]?.id ?? active.id);
                  setPlaying(!playing);
                }}
              >
                {playing ? labels.pause : labels.play}
              </Button>
              <Button
                color="neutral"
                disabled={position === 0}
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon aria-hidden className="size-4" />
                {labels.previous}
              </Button>
              <Button
                color="neutral"
                disabled={last}
                onClick={() => navigate(1)}
              >
                {labels.next}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          )}
        </Tabs>
      ) : (
        <ol aria-label={label} className="border-accent-foreground border-t">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="border-accent-foreground border-b last:border-b-0"
              data-static-step={step.id}
            >
              <h3 className="flex items-start gap-4 px-4 py-6 font-heading text-xl md:px-6">
                <span className="shrink-0 text-primary-text tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step.label}
              </h3>
              {step.content}
            </li>
          ))}
        </ol>
      )}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {enhanced
          ? (announcement ??
            currentFrame?.announcement ??
            active.announcement ??
            active.label)
          : ""}
      </p>
    </div>
  );
};

export namespace StepPlayer {
  export type Frame = { content: ReactNode; announcement?: string };
  export type Step = {
    id: string;
    label: string;
    content: ReactNode;
    announcement?: string;
    frames?: readonly Frame[];
  };
  export type Props = {
    steps: readonly Step[];
    label: string;
    labels?: { play: string; pause: string; previous: string; next: string };
    playback?: boolean;
    interval?: number;
    activateOnFocus?: boolean;
    selected?: string;
    onStepChange?: (id: string) => void;
    announcement?: string;
    className?: string;
  };
}
