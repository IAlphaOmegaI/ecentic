import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";

export const Steps = () => (
  <section className="relative -left-[calc(50vw-50%)] -z-1 h-fit w-screen p-1">
    <div className="rounded-xl bg-primary pb-6 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 p-6 text-white md:px-24 md:pt-24 md:pb-0">
          <h2 className="font-body text-4xl sm:text-5xl md:text-[76px]">
            From invisible to chosen in three steps.
          </h2>
          <p className="font-light text-xl md:text-3xl">
            Connect your store in one click. Then écentic runs the loop —
            simulate, diagnose, and ship the fix. Built exclusively for the AI
            agent economy.
          </p>
        </div>
        <div className="mt-8 grid w-full grid-cols-1 text-white md:mt-24 md:h-[1100px] md:grid-cols-2 md:grid-rows-3">
          {/* Simulate — left col, content right-aligned toward center */}
          <div className="relative col-start-1 row-start-1 flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-6 md:items-end md:border-r md:border-b-0 md:pr-8 md:pl-24">
            <div className="absolute top-1/2 -right-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
            <RobotIcon className="size-16" />
            <p className="font-medium text-4xl">Simulate</p>
            <p className="text-left font-light text-lg md:text-right">
              écentic runs your products through GPT-4, Claude, Gemini &
              Perplexity simultaneously. It maps exactly how each AI agent
              compares your listings against every competitor in your category,
              in real time.
            </p>
          </div>
          <div className="hidden md:block" />
          <div className="hidden border-white md:block md:border-t md:border-r" />
          {/* Diagnose — right col, content left-aligned toward center */}
          <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-6 md:border-t md:border-b-0 md:pr-24 md:pl-8">
            <div className="absolute bottom-1/2 -left-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
            <FaceSearchIcon className="size-16" />
            <p className="font-medium text-4xl">Diagnose</p>
            <p className="text-left font-light text-lg">
              See exactly where you are losing. Which attributes are missing,
              which competitors are winning, and which AI agents are rejecting
              you. Every gap has a reason. écentic finds it.
            </p>
          </div>
          {/* Optimize — left col, content right-aligned toward center */}
          <div className="relative flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white p-6 md:items-end md:border-t md:border-r md:pr-8 md:pl-24">
            <div className="absolute -right-1/2 bottom-1/2 size-full scale-200 bg-radial from-white/50 via-55% via-white/0 to-white/0" />
            <CircleBoltIcon className="size-16" />
            <p className="font-medium text-4xl">Optimize</p>
            <p className="text-left font-light text-lg md:text-right">
              We don't just suggest — écentic writes the fix and publishes it.
              Titles, descriptions, and structured data, rewritten for maximum
              AI agent selection. Approve in one click or set to auto-publish,
              continuously re-optimized as models evolve.
            </p>
          </div>
          <div className="hidden border-white md:block md:border-t" />
        </div>
      </div>
    </div>
  </section>
);
