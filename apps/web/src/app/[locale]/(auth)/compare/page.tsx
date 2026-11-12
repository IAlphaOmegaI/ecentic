import { cn } from "@zenncore/utils";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Footer } from "@/components/footer";
import { fonts } from "@/components/marketing/fonts";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingHero } from "@/components/marketing/primitives";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import { CompareForm } from "./_components/compare-form";
import { CompareSchematic } from "./_components/compare-schematic";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("compareTool.page");

  return {
    ...createMetadata({
      title: translate("title"),
      description: translate("description"),
      path: localizePath("/compare", locale),
    }),
    robots: { index: true, follow: true },
  };
};

export default async () => {
  const translate = await getTranslations("compareTool.page");
  const translateForm = await getTranslations("compareTool.form");

  return (
    <div
      className={cn(
        fonts,
        "marketing-grid-pattern marketing-site flex min-h-screen flex-col bg-background font-body text-foreground [--rail-color:var(--color-accent-foreground)] [--rail-cross:var(--color-cross)] [font-synthesis:none] [overflow-anchor:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(strong,b)]:font-semibold",
      )}
    >
      <Navbar />
      <MarketingHero
        dark
        figure="catalog"
        title={translate("title")}
        description={translate("description")}
      >
        <CompareSchematic
          productA={translateForm("productA")}
          productB={translateForm("productB")}
          caption={translateForm("footer")}
        />
      </MarketingHero>
      <MarketingLightBand>
        <CompareForm />
      </MarketingLightBand>
      <Footer />
    </div>
  );
};
