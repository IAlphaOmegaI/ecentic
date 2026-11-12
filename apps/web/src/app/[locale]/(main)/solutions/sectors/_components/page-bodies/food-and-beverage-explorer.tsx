import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { SectorQuestionJourney } from "../question-journey";

const readingPaths = [
  [2, 3],
  [0, 1],
  [0, 4],
] as const;

export const FoodAndBeverageQuestions = async ({
  questions,
  facts,
  labels,
}: FoodAndBeverageQuestions.Props) => {
  const { sectorReview } = await getMessages();
  return (
    <SectorQuestionJourney
      sampleLabel={sectorReview.questions.sample}
      factsLabel={labels.facts}
      reviewLabel={sectorReview.questions.verify}
      entries={questions.map((question, index) => ({
        question: question.title,
        description: question.body,
        figure:
          index === 0 ? "catalog" : index === 1 ? "inspection" : "document",
        facts: (readingPaths[index] ?? []).flatMap((position) => {
          const fact = facts[position];
          return fact ? [{ label: fact.title, value: fact.body }] : [];
        }),
        review: labels.source,
      }))}
    />
  );
};

export namespace FoodAndBeverageQuestions {
  export type Props = {
    questions: readonly { title: string; body: string }[];
    facts: readonly { title: string; body: string }[];
    labels: { choose: string; facts: string; source: string };
  };
}

export const FoodAndBeverageFacts = ({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) => (
  <div data-sector-facts className="border-accent-foreground border-t">
    <h3 className="px-4 py-6 text-xl sm:px-8">{label}</h3>
    {children}
  </div>
);
