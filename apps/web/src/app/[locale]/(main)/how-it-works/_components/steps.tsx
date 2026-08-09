import { CircleBoltIcon, FaceSearchIcon, RobotIcon } from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { AgentStrip } from "@/app/[locale]/(main)/_components/agent-strip";
import type { IndexSection } from "@/app/[locale]/(main)/_components/index-section";
import { StepSection } from "./step-section";

type StepCopy = {
  number: string;
  title: string;
  subheading: string;
  paragraph: string;
  itemsLabel: string;
  agentStripLabel?: string;
  items: readonly IndexSection.Item[];
};

export const Steps = async () => {
  const translate = await getTranslations("howItWorks");
  const simulate = translate.raw("steps.simulate") as StepCopy;
  const diagnose = translate.raw("steps.diagnose") as StepCopy;
  const optimize = translate.raw("steps.optimize") as StepCopy;

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
          <AgentStrip
            label={simulate.agentStripLabel ?? "Simulated agents"}
          />
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
