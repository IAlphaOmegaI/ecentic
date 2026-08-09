import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { AgentStrip } from "@/app/[locale]/(main)/_components/agent-strip";
import { StepSection } from "./step-section";

export const Steps = async () => {
  const _translate = await getTranslations("howItWorks");
  const messages = await getMessages();
  const simulate = messages.howItWorks.steps.simulate;
  const diagnose = messages.howItWorks.steps.diagnose;
  const optimize = messages.howItWorks.steps.optimize;

  return (
    <>
      <StepSection
        id="simulate"
        number={simulate.number}
        icon={RobotIcon}
        title={simulate.title}
        subheading={simulate.subheading}
        paragraph={simulate.paragraph}
        itemsLabel={simulate.itemsLabel}
        items={simulate.items}
        accent={
          <AgentStrip label={simulate.agentStripLabel ?? "Simulated agents"} />
        }
      />

      <StepSection
        id="diagnose"
        number={diagnose.number}
        icon={FaceSearchIcon}
        title={diagnose.title}
        subheading={diagnose.subheading}
        paragraph={diagnose.paragraph}
        itemsLabel={diagnose.itemsLabel}
        items={diagnose.items}
      />

      <StepSection
        id="optimize"
        number={optimize.number}
        icon={CircleBoltIcon}
        title={optimize.title}
        subheading={optimize.subheading}
        paragraph={optimize.paragraph}
        itemsLabel={optimize.itemsLabel}
        items={optimize.items}
      />
    </>
  );
};
