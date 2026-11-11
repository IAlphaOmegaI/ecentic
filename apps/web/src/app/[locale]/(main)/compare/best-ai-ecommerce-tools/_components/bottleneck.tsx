import { getMessages, getTranslations } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MarketingBand } from "@/components/marketing/primitives";

export const Bottleneck = async () => {
  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const body = messages.compare.bottleneck.body;
  const mappings = messages.compare.bottleneck.mappings;

  return (
    <MarketingBand id="bottleneck" className="scroll-mt-24">
      <SectionGutter />
      <div className="relative bg-background px-7 py-12 max-sm:px-4 max-sm:py-10">
        <span className="font-normal text-3xl text-primary">
          {translate("bottleneck.number")}
        </span>
        <h2 className="mt-4 max-w-3xl text-balance text-foreground-rich">
          {translate("bottleneck.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {translate("bottleneck.description")}
        </p>
      </div>
      <div className="relative grid border-accent-foreground border-t lg:grid-cols-[5fr_8fr]">
        <div className="border-accent-foreground border-b bg-background-dimmed px-7 py-8 max-sm:px-4 lg:border-r lg:border-b-0">
          <p className="text-foreground-dimmed leading-relaxed">{body[0]}</p>
          <p className="mt-8 text-balance font-heading text-2xl text-foreground-rich leading-snug">
            {body[1]}
          </p>
        </div>
        <div className="bg-background">
          <h3 className="border-accent-foreground border-b px-7 py-6 font-medium text-foreground-rich text-xl max-sm:px-4">
            {translate("bottleneck.mappingsHeading")}
          </h3>
          <dl>
            {mappings.map((mapping) => (
              <div
                key={mapping.title}
                className="grid gap-3 border-accent-foreground border-b px-7 py-6 last:border-b-0 max-sm:px-4 sm:grid-cols-[1fr_1.25fr] sm:gap-6"
              >
                <dt className="font-medium text-foreground-rich leading-relaxed">
                  {mapping.title}
                </dt>
                <dd className="text-foreground-dimmed leading-relaxed">
                  {mapping.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </MarketingBand>
  );
};
