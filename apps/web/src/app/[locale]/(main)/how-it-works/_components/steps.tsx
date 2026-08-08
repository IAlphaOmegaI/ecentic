import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";
import { AgentStrip } from "@/app/[locale]/(main)/_components/agent-strip";
import { StepSection } from "./step-section";

export const Steps = () => (
  <>
    <StepSection
      id="simulate"
      number="01"
      icon={RobotIcon}
      title="Simulate"
      subheading="See how every major AI shopping model compares your products against the competition, in real time."
      paragraph="AI shopping agents do not read your store the way a human shopper does. They compare structured signals like titles, attributes, pricing, and trust markers across every product in a category in seconds. ecentic recreates that comparison by running your catalog through the top models at once and recording the outcome for each one."
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
      accent={<AgentStrip label="Simulated agents" />}
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
      paragraph="The final step converts the diagnosis into approval-ready listing updates. ecentic rewrites titles, descriptions, and structured data for maximum agent selection and queues them for review. Every change is tracked, so you can measure the lift in win rate and the agent traffic that follows."
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
