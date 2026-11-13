import { parseSearchParam, unwrapResult } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Motion } from "@/components/motion";
import { redirect } from "@/i18n/navigation";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CompetitorManager } from "./_components/competitor-manager";

export default async ({ searchParams }: SearchParamsProps<"products">) => {
  await connection();

  const params = await searchParams;
  const translate = await getTranslations("onboarding.competitors.page");

  const products = parseSearchParam(params.products, "list", []);

  const store = await unwrapResult(
    Product.resolveStoreForSelection(Environment.SERVER, { products }),
  );

  if (!store) {
    redirect({ href: "/onboarding/connect", locale: await getLocale() });
    return null;
  }

  const skimmed = await Product.skimForCurrentUser(Environment.SERVER, {
    store,
  });
  const productNames = skimmed.success
    ? skimmed.data.map((product) => product.title).filter(Boolean)
    : [];

  return (
    <CompetitorManager
      products={products}
      productNames={productNames}
      store={store}
    >
      <Motion.Item className="px-6 py-7 sm:px-8">
        <h1 className="font-heading text-3xl text-foreground-rich tracking-tight sm:text-4xl">
          {translate("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
          {translate("description")}
        </p>
      </Motion.Item>
    </CompetitorManager>
  );
};
