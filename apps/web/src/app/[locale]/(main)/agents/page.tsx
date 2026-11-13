import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import { ContentPageLayout } from "../_components/content";
import { StoreForm } from "./_components/store-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("agentReadiness");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/agents", locale),
  });
};

export default async () => {
  const translate = await getTranslations("agentReadiness");
  return (
    <ContentPageLayout
      title={translate("hero.title")}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      artwork="cart"
      actions={<StoreForm />}
    >
      {null}
    </ContentPageLayout>
  );
};
