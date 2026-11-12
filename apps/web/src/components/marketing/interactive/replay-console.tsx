"use client";

import { FileSearchIcon, UserIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { agentReplay } from "@/content/examples/agent-replay";
import { useDocument } from "@/hooks/use-document";
import {
  type ReplayCopy,
  type ReplayLabels,
  ReplayScene,
} from "./replay-scene";
import { useSequence } from "./use-sequence";

export const ReplayConsole = ({
  copy,
  labels,
  locale,
  assistant,
  conversation,
  topEdge,
}: {
  copy: ReplayCopy;
  labels: ReplayLabels;
  locale: string;
  assistant: string;
  conversation: AppConfig["Messages"]["round15Platform"]["replay"];
  topEdge: "section" | "content";
}) => {
  const { container, active, enhanced, playing, pause, toggle } = useSequence({
    length: agentReplay.stages.length + 1,
    delay: 5800,
  });
  const { window } = useDocument();
  const log = useRef<HTMLOListElement>(null);
  const [writing, setWriting] = useState({ turn: -1, characters: 0 });
  const position = enhanced
    ? Math.min(active, agentReplay.stages.length - 1)
    : agentReplay.stages.length - 1;
  const current = agentReplay.stages[position] ?? "rerun";
  const turns = [
    copy.question,
    conversation.turns.listings,
    conversation.turns.fields,
    copy.pickReason,
    conversation.turns.fix,
    copy.rerunReason,
  ];
  const text = turns[position] ?? "";
  const characters = writing.turn === position ? writing.characters : 0;
  const typing = enhanced && playing && characters < text.length;

  useEffect(() => {
    if (!playing || !window || characters >= text.length) return;
    const timer = window.setTimeout(
      () =>
        setWriting((value) => ({
          turn: position,
          characters: Math.min(
            text.length,
            value.turn === position ? value.characters + 3 : 3,
          ),
        })),
      24,
    );
    return () => window.clearTimeout(timer);
  }, [playing, position, characters, text.length, window]);

  useEffect(() => {
    if (!playing || !log.current || (position === 0 && characters === 0))
      return;
    log.current.scrollTo({
      top: log.current.scrollHeight,
      behavior: "instant",
    });
  }, [playing, position, characters]);

  return (
    <div
      ref={container}
      data-agent-replay
      data-playing={playing}
      data-step={current}
      data-enhanced={enhanced}
      data-nav-tone="dark"
      onPointerDownCapture={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest("[data-playback-toggle]")
        )
          pause();
      }}
      onFocusCapture={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest("[data-playback-toggle]")
        )
          pause();
      }}
      className="marketing-surface min-w-0 bg-emphasis-dimmed text-background-rich [--rail-color:color-mix(in_srgb,var(--color-background-rich)_15%,transparent)]"
    >
      <header
        className={cn(
          "marketing-seam relative flex flex-wrap items-center justify-between gap-4 border-[var(--rail-color)] border-b px-8 py-6 max-sm:px-4",
          topEdge === "content" && "border-t",
        )}
      >
        {topEdge === "content" && (
          <>
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          </>
        )}
        <p className="flex items-center gap-4 font-medium">
          <FileSearchIcon aria-hidden className="size-6 text-primary-rich" />
          {assistant}
        </p>
        <p className="text-background-rich/55 text-sm">{copy.sample}</p>
      </header>
      <div className="grid min-w-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex min-w-0 flex-col border-[var(--rail-color)] border-b lg:border-r lg:border-b-0">
          <div className="px-8 py-6 max-sm:px-4">
            <h3 className="font-heading text-2xl text-background-rich">
              {copy.title}
            </h3>
            <p className="mt-3 max-w-[50ch] text-background-rich/55 text-xs leading-relaxed">
              {labels.disclosure}
            </p>
          </div>
          <ol
            ref={log}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: A scrollable transcript needs keyboard focus for scrolling its history.
            tabIndex={0}
            aria-label={conversation.conversation}
            data-chat-log
            className="flex h-[540px] min-h-0 flex-col gap-6 overflow-y-auto px-8 py-6 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-2 max-sm:px-4"
            onWheel={pause}
            onTouchStart={pause}
          >
            {turns.map((turn, index) => {
              if (enhanced && index > position) return null;
              const shopper = index === 0 || index === 4;
              const Icon = shopper ? UserIcon : FileSearchIcon;
              const visible =
                index === position && enhanced && active < turns.length
                  ? turn.slice(0, characters)
                  : turn;
              return (
                <li
                  key={agentReplay.stages[index]}
                  data-chat-turn={agentReplay.stages[index]}
                  className={cn("flex gap-3", shopper && "flex-row-reverse")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border",
                      shopper
                        ? "border-background-rich/20 text-background-rich/70"
                        : "border-primary-rich/30 text-primary-rich",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 max-w-[90%]">
                    <p
                      className={cn(
                        "mb-2 text-background-rich/50 text-xs",
                        shopper && "text-right",
                      )}
                    >
                      {shopper ? conversation.shopper : conversation.assistant}
                    </p>
                    <Motion.Item
                      initial={false}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm leading-relaxed",
                        shopper
                          ? "rounded-tr-sm bg-background-rich/8 text-background-rich"
                          : "rounded-tl-sm text-background-rich/80",
                      )}
                    >
                      <p>
                        {visible ||
                          (typing && index === position
                            ? conversation.writing
                            : turn)}
                        {typing && index === position && visible && (
                          <span
                            aria-hidden
                            className="ml-1 inline-block h-4 w-px translate-y-0.5 bg-primary-rich"
                          />
                        )}
                      </p>
                    </Motion.Item>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto flex min-h-20 flex-wrap items-center justify-between gap-4 border-[var(--rail-color)] border-t px-8 py-4 max-sm:px-4 [&_button]:shrink-0">
            <p className="text-background-rich/50 text-xs" role="status">
              {typing
                ? conversation.writing
                : active >= turns.length || !enhanced
                  ? conversation.complete
                  : copy.stages[current]}
            </p>
            {enhanced && (
              <Button color="emphasis" data-playback-toggle onClick={toggle}>
                {playing
                  ? copy.controls.pause
                  : active >= turns.length
                    ? conversation.replay
                    : copy.controls.play}
              </Button>
            )}
          </div>
        </div>
        <div className="min-w-0 px-6 py-8 max-sm:px-4">
          <p className="mb-6 text-background-rich/55 text-sm">
            {labels.evidence}
          </p>
          <ReplayScene stage={current} copy={copy} locale={locale} />
          <p className="mt-6 text-background-rich/50 text-xs leading-relaxed">
            {copy.outcomeNote}
          </p>
        </div>
      </div>
    </div>
  );
};
