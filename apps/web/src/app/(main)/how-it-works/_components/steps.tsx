import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";
import Image from "next/image";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";
import { StepSection } from "./step-section";

const agents = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Perplexity", logo: perplexity },
] as const;

const AgentStrip = () => (
  <div className="flex flex-col gap-3">
    <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
      Simulated agents
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
);

export const Steps = () => (
  <>
    <StepSection
      id="simulate"
      number="01"
      icon={RobotIcon}
      title="Simulate"
      subheading="See how every major AI shopping model compares your products against the competition, in real time."
      paragraph="AI shopping agents do not read your store the way a human shopper does. They compare structured signals like titles, attributes, pricing, and trust markers across every product in a category in seconds. Ecentic recreates that comparison by running your catalog through the top models at once and recording the outcome for each one."
      itemsLabel="What every scan tells you"
      items={[
        {
          title: "Who wins the cart",
          description:
            "Which competitor each agent prefers, and the reasoning behind every pick.",
        },
        {
          title: "What carried the decision",
          description:
            "The attributes that weighed most in the comparison, from specifications to trust signals.",
        },
        {
          title: "How models differ",
          description:
            "How the same product performs across different models and shopping contexts.",
        },
      ]}
      accent={<AgentStrip />}
    />

    <StepSection
      id="diagnose"
      number="02"
      icon={FaceSearchIcon}
      title="Diagnose"
      subheading="Turn a win-or-lose result into a specific, fixable reason for every product."
      paragraph="A score on its own does not help a merchandising team act. The diagnosis names the cause behind each loss in plain language and ties every finding to a concrete change, so the work moves from wondering why you lost to knowing exactly what to fix first."
      itemsLabel="The patterns behind most losses"
      items={[
        {
          title: "Weak titles",
          description:
            "The title does not carry the buying context an agent needs to shortlist you.",
        },
        {
          title: "Missing specifications",
          description:
            "Missing or inconsistent attributes and structured data that agents rely on to compare.",
        },
        {
          title: "Weak trust signals",
          description:
            "Fewer reviews, policies, or trust markers than the competing product that won.",
        },
        {
          title: "Hard-to-compare descriptions",
          description:
            "Copy that makes comparison harder instead of easier, so agents move on.",
        },
      ]}
    />

    <StepSection
      id="optimize"
      number="03"
      icon={CircleBoltIcon}
      title="Optimize"
      subheading="Approve the highest-impact changes and keep listings tuned as the models evolve."
      paragraph="The final step converts the diagnosis into approval-ready listing updates. Ecentic rewrites titles, descriptions, and structured data for maximum agent selection and queues them for review. Every change is tracked, so you can measure the lift in win rate and the agent traffic that follows."
      itemsLabel="You choose how much is automated"
      items={[
        {
          title: "One-click publish",
          description:
            "Review each rewrite and push it live to Shopify or WooCommerce in a single click.",
        },
        {
          title: "Auto-publish",
          description:
            "Enable it for products where the loop has earned your trust.",
        },
        {
          title: "Continuous re-optimization",
          description:
            "Simulations keep running, so listings stay tuned as the underlying models drift.",
        },
      ]}
    />
  </>
);
