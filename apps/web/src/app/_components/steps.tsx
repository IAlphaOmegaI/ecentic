import { CursorGrowIcon } from "@zenncore/icons";

const _steps = [
  {
    icon: "🤖",
    title: "Simulate",
    description:
      "AI agents are already shopping for your customers. They don't see ads or scroll your page. They read data, compare specs, and choose in milliseconds. You don't know how often they pick you or how to change it.",
  },
  {
    icon: "🔍",
    title: "Diagnose",
    description:
      "ecentric shows you exactly WHY agents pick competitors over you. Missing specs? Ambiguous sizing? Weaker warranty language? You get a per-product breakdown of every attribute costing you market share.",
  },
  {
    icon: "⚡",
    title: "Optimize (Auto)",
    description:
      "ecentric auto-generates optimized product titles, descriptions, and structured data tuned for maximum agent selection. Approve in one click, or set to auto-publish. Continuously re-optimized as models drift.",
  },
] as const;

export const Steps = () => (
  <section className="relative -left-[calc(50vw-50%)] -z-1 h-fit w-screen p-1">
    <div className="rounded-xl bg-primary p-6 md:p-24">
      <div className="flex flex-col gap-2 text-white">
        <h1 className="font-medium text-4xl sm:text-5xl md:text-[76px]">
          From blind to winning in three steps.
        </h1>
        <p className="font-light text-xl md:text-3xl">
          A closed-loop system designed exclusively for the AI agent economy.
        </p>
      </div>
      <div className="mt-8 grid w-full grid-cols-1 text-white md:mt-24 md:h-[1100px] md:grid-cols-2 md:grid-rows-3">
        <div className="relative col-start-1 row-start-1 flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-4 md:items-end md:border-r md:border-b-0">
          <div className="absolute top-1/2 -right-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <CursorGrowIcon className="size-16" />
          <p className="font-medium text-4xl">Simulate</p>
          <p className="text-left font-light text-lg md:text-right">
            AI agents are already shopping for your customers. They don't see
            ads or scroll your page. They read data, compare specs, and choose
            in milliseconds. You don't know how often they pick you or how to
            change it.
          </p>
        </div>
        <div className="hidden md:block" />
        <div className="hidden border-white md:block md:border-t md:border-r" />
        <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-4 md:border-t md:border-b-0">
          <div className="absolute bottom-1/2 -left-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <CursorGrowIcon className="size-16" />
          <p className="font-medium text-4xl">Diagnose</p>
          <p className="text-left font-light text-lg">
            AI agents are already shopping for your customers. They don't see
            ads or scroll your page. They read data, compare specs, and choose
            in milliseconds. You don't know how often they pick you or how to
            change it.
          </p>
        </div>
        <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white p-4 md:items-end md:border-t md:border-r">
          <div className="absolute -right-1/2 bottom-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <CursorGrowIcon className="size-16" />
          <p className="font-medium text-4xl">Optimize (Auto)</p>
          <p className="text-left font-light text-lg md:text-right">
            ecentric auto-generates optimized product titles, descriptions, and
            structured data tuned for maximum agent selection. Approve in one
            click, or set to auto-publish. Continuously re-optimized as models
            drift.
          </p>
        </div>
        <div className="hidden border-white md:block md:border-t" />
      </div>
    </div>
  </section>
);
