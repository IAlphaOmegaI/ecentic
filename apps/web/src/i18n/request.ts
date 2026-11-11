import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { prepareMarketingMessages } from "./marketing-messages";
import { routing } from "./routing";

/**
 * Locale comes from the `[locale]` root segment via `next/root-params`
 * (Next.js 16.3+). Explicit `locale` overrides still apply for Server Actions
 * and Route Handlers, where root-params is not supported yet.
 */
export default getRequestConfig(async ({ locale: localeOverride }) => {
  const locale = await (async () => {
    if (localeOverride) return localeOverride;

    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) return paramValue;

    notFound();
  })();

  const messages = (await import(`../../messages/${locale}.json`)).default;
  const review = process.env["NEXT_PUBLIC_REVIEW"] === "1";

  return {
    locale,
    messages: prepareMarketingMessages(messages, {
      review,
      pendingLabel: review ? messages.enterpriseReview.pending : "",
    }),
  };
});
