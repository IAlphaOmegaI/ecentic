import { getMessages, getTranslations } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingBand } from "@/components/marketing/primitives";

export const Guide = async () => {
  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const body = messages.compare.guide.body;
  const categories = messages.compare.guide.categories;

  return (
    <MarketingBand id="guide" className="scroll-mt-24">
      <div className="relative bg-background px-7 py-12 max-sm:px-4 max-sm:py-10">
        <span className="font-normal text-3xl text-primary">
          {translate("guide.number")}
        </span>
        <h2 className="mt-4 max-w-3xl text-balance text-foreground-rich">
          {translate("guide.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {translate("guide.description")}
        </p>
      </div>

      <div className="relative grid min-w-0 border-accent-foreground border-t lg:grid-cols-[5fr_8fr]">
        <div className="flex min-w-0 flex-col justify-between border-accent-foreground border-b bg-background-dimmed lg:border-r lg:border-b-0">
          <div className="px-7 pt-8 max-sm:px-4">
            <p className="text-foreground-dimmed leading-relaxed">{body[0]}</p>
            <p className="mt-8 text-balance font-heading text-2xl text-foreground-rich leading-snug">
              {body[1]}
            </p>
          </div>
          <div className="h-56 text-primary max-sm:h-44">
            <EvolvingAscii artwork="cart" />
          </div>
        </div>

        <div className="min-w-0 bg-background">
          <h3 className="border-accent-foreground border-b px-7 py-6 font-medium text-foreground-rich text-xl max-sm:px-4">
            {translate("guide.categoriesHeading")}
          </h3>
          <ol>
            {categories.map((category, index) => (
              <li
                key={category.title}
                className="grid grid-cols-[2rem_1fr] gap-4 border-accent-foreground border-b px-7 py-6 last:border-b-0 max-sm:px-4"
              >
                <span className="pt-1 text-primary-text text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="font-medium text-foreground-rich text-xl leading-snug">
                    {category.title}
                  </h4>
                  <p className="mt-2 text-foreground-dimmed leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </MarketingBand>
  );
};
