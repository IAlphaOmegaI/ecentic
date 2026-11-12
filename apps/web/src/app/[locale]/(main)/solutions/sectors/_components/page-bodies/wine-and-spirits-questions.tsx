import type { AppConfig } from "next-intl";
import { getMessages } from "next-intl/server";
import type { MarketingPage } from "@/components/marketing/page";
import { SectorQuestionJourney } from "../question-journey";

export const WineAndSpiritsQuestions = async ({
  items,
  labels,
}: WineAndSpiritsQuestions.Props) => {
  const {
    sectorReview: { questions },
  } = await getMessages();
  return (
    <SectorQuestionJourney
      sampleLabel={questions.sample}
      factsLabel={labels.criteria}
      reviewLabel={labels.verify}
      entries={labels.entries.flatMap((entry, index) => {
        const question = items[index];
        if (!question) return [];
        return [
          {
            question: question.title,
            description: question.body,
            label: entry.label,
            figure:
              index === 0 ? "catalog" : index === 1 ? "inspection" : "checkout",
            facts: entry.criteria,
            review: entry.verification,
          },
        ];
      })}
    />
  );
};

export namespace WineAndSpiritsQuestions {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    labels: AppConfig["Messages"]["winePage"]["explorer"];
  };
}
