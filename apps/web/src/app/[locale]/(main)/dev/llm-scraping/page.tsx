import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../dashboard/_components/grid";
import { Scraper } from "./_components/scraper";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Sandbox — ScrapeLLM</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              LLM Surface Scraping
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              Run one prompt against the real consumer surfaces — ChatGPT and
              Google AI Mode — through ScrapeLLM, and inspect the normalized
              capture that comes back: answer, citations, search results,
              credits and latency. This is the Phase-0 bake-off harness from{" "}
              <code>docs/tasks/llm-surface-scraping.md</code>; what fills the
              envelope here is what the audit pipeline will store.
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
              One Prompt, Every Surface
            </h2>
          </div>
          <Scraper />
        </div>
      </div>
    </div>
  </div>
);
