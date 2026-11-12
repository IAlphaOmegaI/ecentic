"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FileSearchIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useEffect, useRef, useState } from "react";
import { agentReplay } from "@/content/examples/agent-replay";
import { useDocument } from "@/hooks/use-document";
import {
  type ReplayCopy,
  type ReplayLabels,
  ReplayScene,
} from "./replay-scene";
import { useInteractive } from "./use-interactive";

const timeline = agentReplay.stages.flatMap((stage) =>
  Array.from(
    { length: stage === "fields" ? agentReplay.fields.length : 1 },
    (_, field) => ({ stage, field }),
  ),
);

export const ReplayConsole = ({
  copy,
  labels,
  locale,
  assistant,
}: {
  copy: ReplayCopy;
  labels: ReplayLabels;
  locale: string;
  assistant: string;
}) => {
  const { ready, reduced } = useInteractive();
  const { window, document } = useDocument();
  const container = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const enhanced = ready && !reduced;
  const current = timeline[position] ?? timeline[0];
  useEffect(() => {
    if (!enhanced) setPlaying(false);
  }, [enhanced]);
  useEffect(() => {
    if (!enhanced || !document || !container.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.3,
        );
        if (!visible) {
          setPlaying(false);
          return;
        }
        if (started.current || document.hidden) return;
        started.current = true;
        setPlaying(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [enhanced, document]);
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
    if (position >= timeline.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setPosition(position + 1), 2600);
    return () => window.clearTimeout(timer);
  }, [enhanced, playing, position, window]);
  const select = (next: number) => {
    started.current = true;
    setPlaying(false);
    setPosition(next);
  };
  if (!current) return null;
  return (
    <div
      ref={container}
      data-agent-replay=""
      data-playing={playing}
      data-step={current.stage}
      data-frame={current.field}
      data-enhanced={enhanced}
      data-nav-tone="dark"
      onPointerDownCapture={(event) => {
        started.current = true;
        if (
          event.target instanceof Element &&
          event.target.closest("[data-playback-toggle]")
        )
          return;
        setPlaying(false);
      }}
      onKeyDownCapture={(event) => {
        started.current = true;
        if (
          event.target instanceof Element &&
          event.target.closest("[data-playback-toggle]") &&
          (event.key === " " || event.key === "Enter")
        )
          return;
        setPlaying(false);
      }}
      onFocusCapture={(event) => {
        started.current = true;
        if (event.target.matches(":focus-visible")) setPlaying(false);
      }}
      className="min-w-0 bg-emphasis-dimmed text-background-rich"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-background-rich/15 border-y px-8 py-6 max-sm:px-4">
        <p className="flex items-center gap-4 font-medium">
          <FileSearchIcon aria-hidden className="size-6 text-primary-rich" />
          {assistant}
        </p>
        <p className="text-background-rich/55 text-sm">{copy.sample}</p>
      </header>
      <div className="grid min-w-0 grid-cols-[minmax(220px,1fr)_minmax(0,2.5fr)] max-md:grid-cols-1">
        <aside className="min-w-0 border-background-rich/15 border-r px-8 py-8 max-sm:px-4 max-md:border-r-0 max-md:border-b">
          <h2 className="font-heading text-2xl text-background-rich">
            {copy.title}
          </h2>
          <p className="mt-4 text-background-rich/60 text-sm leading-relaxed">
            {copy.description}
          </p>
          <p className="mt-4 text-background-rich/40 text-xs leading-relaxed">
            {labels.disclosure}
          </p>
          {enhanced && (
            <ol
              aria-label={copy.rail}
              className="mt-8 flex flex-col gap-4 max-md:grid max-md:grid-cols-2"
            >
              {agentReplay.stages.map((stage, index) => (
                <li key={stage}>
                  <Button
                    color={current.stage === stage ? "primary" : "emphasis"}
                    aria-pressed={current.stage === stage}
                    onClick={() =>
                      select(timeline.findIndex((item) => item.stage === stage))
                    }
                  >
                    {agentReplay.stages.indexOf(current.stage) > index ? (
                      <CheckIcon aria-hidden className="size-4" />
                    ) : (
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    )}
                    {copy.stages[stage]}
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </aside>
        <div className="min-w-0">
          {enhanced ? (
            <ReplayScene
              key={current.stage}
              stage={current.stage}
              field={current.field}
              copy={copy}
              labels={labels}
              locale={locale}
              animated
            />
          ) : (
            <ol aria-label={copy.rail}>
              {agentReplay.stages.map((stage, index) => (
                <li
                  key={stage}
                  data-static-step={stage}
                  className="border-background-rich/15 border-b last:border-b-0"
                >
                  <h3 className="px-8 pt-8 font-heading text-background-rich text-xl max-sm:px-4">
                    <span className="mr-4 text-primary-rich">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {copy.stages[stage]}
                  </h3>
                  <ReplayScene
                    stage={stage}
                    copy={copy}
                    labels={labels}
                    locale={locale}
                  />
                </li>
              ))}
            </ol>
          )}
          {enhanced && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-background-rich/15 border-t px-8 py-6 max-sm:px-4">
              <Button
                data-playback-toggle=""
                onClick={() => {
                  started.current = true;
                  if (position === timeline.length - 1) setPosition(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? copy.controls.pause : copy.controls.play}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  color="emphasis"
                  disabled={position === 0}
                  onClick={() => select(position - 1)}
                >
                  <ArrowLeftIcon aria-hidden className="size-4" />
                  {copy.controls.previous}
                </Button>
                <Button
                  color="emphasis"
                  disabled={position === timeline.length - 1}
                  onClick={() => select(position + 1)}
                >
                  {copy.controls.next}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {enhanced
          ? `${copy.stages[current.stage]}. ${current.stage === "fields" ? copy.fields[agentReplay.fields[current.field] ?? "price"] : current.stage === "pick" ? copy.pickReason : current.stage === "rerun" ? copy.rerunReason : ""}`
          : ""}
      </p>
    </div>
  );
};
