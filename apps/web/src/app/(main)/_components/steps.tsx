import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";

export const Steps = () => (
  <section className="relative -left-[calc(50vw-50%)] -z-1 h-fit w-screen p-1">
    <div className="rounded-xl bg-primary p-6 md:p-24">
      <div className="flex flex-col gap-2 text-white">
        <h1 className="font-body text-4xl sm:text-5xl md:text-[76px]">
          From invisible to chosen in three steps.
        </h1>
        <p className="font-light text-xl md:text-3xl">
          A closed-loop system built exclusively for the AI agent economy.
        </p>
      </div>
      <div className="mt-8 grid w-full grid-cols-1 text-white md:mt-24 md:h-[1100px] md:grid-cols-2 md:grid-rows-3">
        <div className="relative col-start-1 row-start-1 flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-4 md:items-end md:border-r md:border-b-0">
          <div className="absolute top-1/2 -right-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <RobotIcon className="size-16" />
          <p className="font-medium text-4xl">Simulate</p>
          <p className="text-left font-light text-lg md:text-right">
            écentic runs your products through GPT-4, Claude, Gemini &
            Perplexity simultaneously. It maps exactly how each AI agent
            compares your listings against every competitor in your category, in
            real time.
          </p>
        </div>
        <div className="hidden md:block" />
        <div className="hidden border-white md:block md:border-t md:border-r" />
        <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-4 md:border-t md:border-b-0">
          <div className="absolute bottom-1/2 -left-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <FaceSearchIcon className="size-16" />
          <p className="font-medium text-4xl">Diagnose</p>
          <p className="text-left font-light text-lg">
            See exactly where you are losing. Which attributes are missing,
            which competitors are winning, and which AI agents are rejecting
            you. Every gap has a reason. écentic finds it.
          </p>
        </div>
        <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white p-4 md:items-end md:border-t md:border-r">
          <div className="absolute -right-1/2 bottom-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
          <CircleBoltIcon className="size-16" />
          <p className="font-medium text-4xl">Optimize</p>
          <p className="text-left font-light text-lg md:text-right">
            écentic rewrites your titles, descriptions, and structured data for
            maximum AI agent selection. Approve in one click or set to
            auto-publish. Continuously re-optimized as models evolve.
          </p>
        </div>
        <div className="hidden border-white md:block md:border-t" />
      </div>
    </div>
  </section>
);
