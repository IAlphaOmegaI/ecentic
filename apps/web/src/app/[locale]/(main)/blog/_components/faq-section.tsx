import { EditorialRichText, EditorialSplitSection } from "./editorial-page";

/**
 * Reader-facing rendering of `blog_post.faqs`, for posts whose body does not
 * already end in an FAQ of its own — editorial ones, and the older
 * BabyLoveGrowth articles written before the CMS started emitting the block.
 * The same pairs go out as `FAQPage` JSON-LD from the page, so what an agent
 * quotes and what a reader sees stay the same text.
 */
export const FaqSection = ({ number, title, faqs }: FaqSection.Props) => (
  <EditorialSplitSection
    left={
      <>
        <span className="font-normal text-2xl text-primary">{number}</span>
        <h2 className="text-4xl text-foreground leading-snug">{title}</h2>
      </>
    }
    right={
      <div className="flex flex-col gap-5">
        <h2 className="font-semibold text-2xl text-foreground leading-snug md:text-3xl">
          {title}
        </h2>
        <dl className="flex flex-col gap-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-2">
              <dt className="font-semibold text-foreground leading-snug">
                {faq.question}
              </dt>
              <dd>
                <EditorialRichText content={faq.answer} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    }
  />
);

export namespace FaqSection {
  export type Props = {
    number: string;
    title: string;
    faqs: readonly { question: string; answer: string }[];
  };
}
