import type { AppConfig } from "next-intl";
import { getMessages } from "next-intl/server";
import type { MarketingPage } from "@/components/marketing/page";
import { SectorQuestionJourney } from "../question-journey";

const factIndexes = [
  [1, 0, 2],
  [1, 3],
  [1, 0, 5],
] as const;

export const BeautyAndPersonalCareRecord = async ({
  questions,
  attributes,
  copy,
}: BeautyAndPersonalCareRecord.Props) => {
  const { sectorReview } = await getMessages();
  return (
    <SectorQuestionJourney
      sampleLabel={sectorReview.questions.sample}
      factsLabel={copy.facts}
      reviewLabel={sectorReview.questions.verify}
      entries={questions.map((question, index) => {
        const facts = (factIndexes[index] ?? []).flatMap((position) => {
          const value = attributes[position];
          return value ? [value] : [];
        });
        const size = attributes[4];
        const fields = [
          ...facts,
          ...(index === 1 ? [copy.claim] : []),
          ...(size ? [size] : []),
        ];
        return {
          question: question.title,
          description: question.body,
          label: copy.tabs[index],
          figure: index === 1 ? "inspection" : "catalog",
          facts: fields.map((field) => ({
            label: field.title,
            value: field.body,
          })),
        };
      })}
    />
  );
};

export namespace BeautyAndPersonalCareRecord {
  export type Props = {
    questions: NonNullable<MarketingPage.Section["items"]>;
    attributes: NonNullable<MarketingPage.Section["items"]>;
    copy: AppConfig["Messages"]["beautyPage"]["record"];
  };
}
