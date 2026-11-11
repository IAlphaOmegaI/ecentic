import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  createEnterpriseOgImage,
  enterpriseOgContentType,
  enterpriseOgSize,
} from "@/lib/enterprise-og";

export const alt = "ecentic";
export const size = enterpriseOgSize;
export const contentType = enterpriseOgContentType;

export default async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages({ locale });
  const content = messages.enterpriseCompany.stories;
  return createEnterpriseOgImage({
    title: content.title,
    description: content.description,
    signoff: messages.enterpriseChrome.closing.title,
  });
};
