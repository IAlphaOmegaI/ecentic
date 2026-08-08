import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../dashboard/_components/grid";
import { Playground } from "./_components/playground";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Sandbox — AI SDK</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              AI Playground
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              Run one prompt across GPT, Claude, Gemini and Sonar at once and
              compare what comes back — streamed side by side with first-token
              latency, total time and token usage per model. Every id resolves
              through the same <code>model()</code> router the product uses, so
              what you measure here is what production gets.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Request</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              One Prompt, Every Model
            </h2>
          </div>
          <Playground />
        </div>
      </div>
    </div>
  </div>
);
