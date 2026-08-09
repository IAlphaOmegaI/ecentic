import { unwrapResult } from "@zenncore/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { SearchParamsProps } from "@zenncore/web/types";
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
      <h1 className="font-medium text-4xl text-foreground">
        {translate("title")}
      </h1>

      <p className="font-light text-2xl text-foreground-dimmed">
        {translate("description")}
      </p>
    </CompetitorReview>
  );
};
