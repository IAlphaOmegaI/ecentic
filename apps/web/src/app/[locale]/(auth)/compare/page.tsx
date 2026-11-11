import { cn } from "@zenncore/utils";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Footer } from "@/components/footer";
import { fonts } from "@/components/marketing/fonts";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import { CompareForm } from "./_components/compare-form";

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

  return (
    <div
      className={cn(
        fonts,
        "flex min-h-screen flex-col bg-background font-body text-foreground [font-synthesis:none] [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(strong,b)]:font-semibold",
      )}
    >
      <Navbar />
      <div className="w-full border-accent-foreground border-b">
        <div className="mx-auto flex w-[min(1186px,calc(100%-56px))] flex-col border-accent-foreground border-x px-7 py-24 max-sm:w-[calc(100%-32px)] max-sm:px-4 max-sm:py-14">
          <h1 className="font-medium text-4xl text-foreground-rich">
            {translate("title")}
          </h1>
          <p className="mt-6 text-foreground-dimmed text-xl">
            {translate("description")}
          </p>
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
