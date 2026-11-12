import type { AppConfig } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { SectorQuestionJourney } from "../question-journey";

const inspectionFields = [
  [1, 3],
  [0, 2],
  [2, 3],
] as const;

export const ElectronicsWorkbench = async ({
  questions,
  specifications,
  copy,
}: ElectronicsWorkbench.Props) => {
  const { sectorReview } = await getMessages();
  return (
    <SectorQuestionJourney
      sampleLabel={sectorReview.questions.sample}
      factsLabel={copy.sourceLabel}
      reviewLabel={sectorReview.questions.verify}
      entries={questions.map((question, index) => ({
        question: question.title,
        description: question.body,
        label: copy.scenarioLabels[index],
        figure: index === 0 ? "inspection" : index === 1 ? "drawer" : "relay",
        facts: (inspectionFields[index] ?? []).flatMap((field) => {
          const item = specifications[field];
          return item ? [{ label: item.title, value: item.body }] : [];
        }),
        review: copy.boundary,
      }))}
    />
  );
};

export namespace ElectronicsWorkbench {
  export type Props = {
    questions: readonly { title: string; body: string }[];
    specifications: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["electronicsPage"];
  };
}

export const ElectronicsSpecification = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div data-sector-facts className="border-accent-foreground border-t">
    <h3 className="px-4 py-6 text-xl sm:px-8">{label}</h3>
    {children}
  </div>
);
