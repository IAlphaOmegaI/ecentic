import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages({ locale });
  const content = messages.woocommerce.hero;
  return createOgImage({
    locale,
    title: `${content.title.primary} ${content.title.accent}`,
    description: content.description,
  });
};
