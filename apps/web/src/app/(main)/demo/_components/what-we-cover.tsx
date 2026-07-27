import { CircleBoltIcon } from "@zenncore/icons";
import { AgentStrip } from "@/app/(main)/_components/agent-strip";
import { IndexSection } from "@/app/(main)/_components/index-section";

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

const body = [
  "We keep the call short and practical. Bring a store URL or a few product links you care about and we do the rest live. There is no obligation to continue afterward.",
] as const;

export const WhatWeCover = () => (
  <IndexSection
    number="01"
    icon={CircleBoltIcon}
    title="What we’ll cover."
    description="A focused 15-minute working session. You leave with something to act on."
    body={body}
    label="The agenda"
    items={agenda}
    accent={<AgentStrip label="Simulated live on the call" />}
  />
);
