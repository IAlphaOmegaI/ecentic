import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Motion } from "@/components/motion";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { EmptyProducts } from "./_components/empty-products";
import { ProductSelector } from "./_components/product-selector";

export default async ({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) => {
  await connection();

  const { connected } = await searchParams;
  const translate = await getTranslations("onboarding.products");

  const products = await unwrapResult(
    Product.listForConnectedStore(Environment.SERVER, { connected }),
  );

  if (products.length === 0) return <EmptyProducts />;

  return (
    <ProductSelector products={products}>
      <Motion.Up>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading font-medium text-3xl text-foreground sm:text-4xl">
            {translate("page.title")}
          </h1>
          <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs">
            {translate("page.freeLimit")}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
          {translate("page.description")}
        </p>
      </Motion.Up>
    </ProductSelector>
  );
};
