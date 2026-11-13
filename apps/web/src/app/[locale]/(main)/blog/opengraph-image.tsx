import { getTranslations } from "next-intl/server";
import { defaultLocale, isPublishedLocale } from "@/i18n/locales";
import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "ecentic blog";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale: raw } = await params;
  const locale = isPublishedLocale(raw) ? raw : defaultLocale;
  const translate = await getTranslations({ locale, namespace: "blog" });
  return createOgImage({
    locale,
    title: translate("title"),
    description: translate("description"),
  });
};
