import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Background from "@/public/images/blog.png";

const assurances = [
  "Simulates ChatGPT, Claude, Gemini & Perplexity",
  "One-click listing rewrites",
  "Live agent traffic",
] as const;

export const Hero = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl overflow-hidden border-accent-foreground border-x">
      <Image
        src={Background}
        alt=""
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-16 hidden select-none object-contain opacity-10 md:block md:w-96 lg:w-[30rem]"
      />
      <div className="relative z-10 px-8 pt-36 pb-16">
        <p className="mb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.2em]">
          Features
        </p>
        <h1 className="max-w-3xl font-semibold text-5xl text-foreground-rich tracking-tight md:text-7xl">
          Every tool you need to{" "}
          <span className="text-primary">win the AI shopper.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
          Simulate how AI shopping agents compare your products, see exactly why
          competitors win, and publish the listing fixes that flip the result,
          all from one loop.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {assurances.map((assurance) => (
            <li
              key={assurance}
              className="flex items-center gap-1.5 rounded-full border border-accent-foreground bg-background-rich px-3 py-1 text-foreground text-sm"
            >
              <CheckIcon className="size-3.5 text-primary" />
              {assurance}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
