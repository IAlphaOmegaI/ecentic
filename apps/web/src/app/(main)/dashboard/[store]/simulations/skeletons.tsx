import { Crosshair, SectionGutter } from "../../_components/grid";

const progressLabels = [
  "Phase",
  "Progress",
  "Wins / Losses",
  "Elapsed",
] as const;
const modelLabels = ["GPT-4", "Claude", "Gemini", "Perplexity"] as const;

export const SimulationsSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-11 w-24 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="border-accent-foreground border-b p-4">
          <div className="h-3 w-32 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-52 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-4 w-80 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-3.5 w-44 animate-pulse bg-foreground/10" />
        </div>
        <div className="h-[520px] animate-pulse bg-foreground/5" />
      </div>
    </div>

    <SectionGutter />

    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="flex items-center justify-between border-accent-foreground border-b p-4">
          <div>
            <div className="h-3 w-32 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-6 w-44 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-4 w-96 animate-pulse bg-foreground/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse bg-foreground/10" />
            <div className="h-9 w-32 animate-pulse bg-foreground/10" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
            {progressLabels.map((label) => (
              <div key={label} className="bg-background-rich p-3">
                <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                  {label}
                </p>
                <div className="mt-1 h-5 w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-accent-foreground" />
          <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-4">
            {modelLabels.map((label) => (
              <div key={label} className="bg-background-rich p-3">
                <div className="size-8 animate-pulse bg-foreground/10" />
                <div className="mt-2 h-5 w-16 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-3.5 w-12 animate-pulse bg-foreground/10" />
                <div className="mt-1 h-3.5 w-16 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          <div className="h-72 rounded-md border border-accent-foreground bg-background-dimmed p-3">
            <div className="h-3.5 w-72 animate-pulse bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  </>
);
