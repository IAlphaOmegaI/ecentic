import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Plus } from "@/components/plus";

/** Questions and their evidence stay visible; the path supports the reading order. */
export const SectorQuestionJourney = ({
  entries,
  sampleLabel,
  factsLabel,
  reviewLabel,
}: SectorQuestionJourney.Props) => (
  <div data-sector-question-journey>
    <p className="border-accent-foreground border-t px-4 py-5 text-foreground-dimmed text-sm sm:px-8">
      {sampleLabel}
    </p>
    <ol className="relative">
      {entries.map((entry, index) => (
        <li
          key={entry.question}
          className="relative grid border-accent-foreground border-t md:grid-cols-[5fr_7fr]"
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 left-[41.666%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <div className="relative flex min-w-0 flex-col px-4 py-8 sm:px-8">
            <div className="mb-6 flex items-center gap-5">
              <span className="font-heading text-4xl text-primary-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              {entry.label && (
                <p className="text-foreground-dimmed text-sm">{entry.label}</p>
              )}
            </div>
            <blockquote className="max-w-[26ch] font-heading text-2xl text-foreground-rich leading-tight tracking-tight sm:text-3xl">
              “{entry.question}”
            </blockquote>
            {entry.description && (
              <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-sm leading-relaxed">
                {entry.description}
              </p>
            )}
            <CommerceFigure
              kind={entry.figure}
              surface="background"
              className="mx-auto mt-6 aspect-[5/3] max-w-md"
            />
          </div>
          <div className="relative min-w-0 border-accent-foreground border-t bg-background-dimmed md:border-t-0 md:border-l">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
            <p className="px-4 py-6 font-medium text-foreground-rich text-sm sm:px-8">
              {factsLabel}
            </p>
            <dl>
              {entry.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="grid min-w-0 gap-3 border-accent-foreground border-t px-4 py-5 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:gap-6"
                >
                  <dt className="font-medium text-primary-text">
                    {fact.label}
                  </dt>
                  <dd className="text-foreground-dimmed leading-relaxed">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
            {entry.review && (
              <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
                <p className="font-medium text-foreground-rich text-sm">
                  {reviewLabel}
                </p>
                <p className="mt-3 text-foreground-dimmed text-sm leading-relaxed">
                  {entry.review}
                </p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

export namespace SectorQuestionJourney {
  export type Props = {
    sampleLabel: string;
    factsLabel: string;
    reviewLabel: string;
    entries: readonly {
      question: string;
      description?: string;
      label?: string;
      figure: CommerceFigure.Props["kind"];
      facts: readonly { label: string; value: string }[];
      review?: string;
    }[];
  };
}
