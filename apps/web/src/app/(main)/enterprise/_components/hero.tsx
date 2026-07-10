import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Background from "@/public/images/blog.png";

const assurances = [
  "Multi-brand dashboards",
  "Dedicated CSM",
  "SOC 2 in progress",
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
        <p className="mb-4 font-medium text-sm text-white/70 uppercase tracking-[0.2em]">
          Enterprise
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
          Agent-commerce infrastructure{" "}
          <span className="text-white/80">at scale.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white leading-relaxed md:text-lg">
          Multi-brand dashboards, API access, UCP signing, and dedicated support
          — built for commerce teams running hundreds of SKUs across multiple
          platforms.
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
