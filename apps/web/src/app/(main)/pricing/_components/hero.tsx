import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Background from "@/public/images/blog.png";

const assurances = [
  "Free scan first",
  "No card to start",
  "Month-to-month · cancel anytime",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b p-4">
    <div className="relative size-full overflow-hidden rounded-lg bg-primary">
      <Image
        src={Background}
        alt=""
        aria-hidden
        className="absolute aspect-auto h-full w-full object-contain object-right opacity-30 brightness-0 invert"
      />
      <div className="relative z-10 mx-auto max-w-6xl border-accent-foreground border-x px-8 pt-36 pb-16">
        <h1 className="max-w-3xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
          Start free. Pay when agents{" "}
          <span className="text-white/80">pick you.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white leading-relaxed md:text-lg">
          Scan your store for free, then choose how you pay: a small fee only on
          orders AI agents drive, or a flat monthly plan with no fee. Same
          optimization loop either way.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {assurances.map((assurance) => (
            <li
              key={assurance}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white"
            >
              <CheckIcon className="size-3.5 text-white/80" />
              {assurance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
