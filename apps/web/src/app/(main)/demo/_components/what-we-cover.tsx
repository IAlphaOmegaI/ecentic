import { CircleBoltIcon } from "@zenncore/icons";
import Image from "next/image";
import { Plus } from "@/components/plus";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";

const agents = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Perplexity", logo: perplexity },
] as const;

const agenda = [
  {
    title: "Run the simulation live",
    description:
      "Your top products go through the major AI shopping models while you watch.",
  },
  {
    title: "See why you win or lose",
    description:
      "Attribute by attribute, against the competitors agents actually pick.",
  },
  {
    title: "Leave with fixes",
    description: "The highest-impact listing changes to make first.",
  },
  {
    title: "Sketch the loop",
    description:
      "What an ongoing optimization loop would look like for your catalog.",
  },
] as const;

export const WhatWeCover = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          What we&apos;ll cover.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          A focused 15-minute working session. You leave with something to act
          on.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <CircleBoltIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            We keep the call short and practical. Bring a store URL or a few
            product links you care about and we do the rest live. There is no
            obligation to continue afterward.
          </p>
          <div className="mt-auto flex flex-col gap-3">
            <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
              Simulated live on the call
            </p>
            <ul className="flex flex-wrap gap-2">
              {agents.map((agent) => (
                <li
                  key={agent.name}
                  className="flex items-center gap-2 rounded-full border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm"
                >
                  <Image src={agent.logo} alt="" className="size-4" />
                  {agent.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            The agenda
          </p>
          {agenda.map((item) => (
            <div
              key={item.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {item.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
