import { unwrapResult } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CompetitorReview } from "./_components/competitor-review";

export default async ({ searchParams }: SearchParamsProps<"store">) => {
  const params = await searchParams;
  const translate = await getTranslations("onboarding.competitors.review");

  const store =
    typeof params.store === "string" && params.store
      ? params.store
      : await unwrapResult(
          Product.resolveStoreForSelection(Environment.SERVER),
        );

  if (!store) {
    redirect({ href: "/onboarding/connect", locale: await getLocale() });
    return null;
  }

  const competitors = await unwrapResult(
    Competitor.skimForCurrentUser(Environment.SERVER, { store }),
  );

  return (
    <CompetitorReview existing={competitors}>
      <h1 className="font-heading text-3xl text-foreground-rich tracking-tight sm:text-4xl">
        {translate("title")}
      </h1>

      <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
        {translate("description")}
      </p>
    </CompetitorReview>
  );
};
