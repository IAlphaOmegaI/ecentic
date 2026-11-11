import { cn } from "@zenncore/utils";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Footer } from "@/components/footer";
import { fonts } from "@/components/marketing/fonts";
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
        "flex min-h-screen flex-col bg-background font-body text-foreground [font-synthesis:none] [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(strong,b)]:font-semibold",
      )}
    >
      <Navbar />
      <div className="w-full border-accent-foreground border-b">
        <div className="mx-auto grid w-[min(1186px,calc(100%-56px))] min-w-0 grid-cols-1 border-accent-foreground border-x max-sm:w-[calc(100%-32px)] md:grid-cols-[1.15fr_1fr]">
          <header className="flex min-w-0 flex-col justify-center px-8 py-12 max-sm:px-4 max-sm:py-8">
            <h1 className="max-w-[12ch] text-[clamp(2.75rem,4.5vw,4.25rem)] text-foreground-rich leading-[1.05] tracking-[-0.04em]">
              {translate("title")}
            </h1>
            <p className="mt-6 max-w-[34ch] text-foreground-dimmed text-lg leading-relaxed max-sm:mt-4 max-sm:text-base">
              {translate("description")}
            </p>
          </header>
          <CompareSchematic
            productA={translateForm("productA")}
            productB={translateForm("productB")}
            caption={translateForm("footer")}
          />
        </div>
      </div>

      <div className="w-full flex-1 border-accent-foreground border-b">
        <div className="mx-auto flex h-full w-[min(1186px,calc(100%-56px))] min-w-0 flex-col border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
          <CompareForm />
        </div>
      </div>
      <Footer />
    </div>
  );
};
