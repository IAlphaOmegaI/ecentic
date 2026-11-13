import { ArrowRightIcon, BoxMinusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
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

  if (products.length === 0)
    return (
      <Motion.Stagger
        stagger={0.05}
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-8"
      >
        <Motion.Item className="flex w-full max-w-lg flex-col items-center justify-center text-center">
          <BoxMinusIcon className="mx-auto mb-6 size-12 text-primary" />
          <h1 className="mb-2 font-medium text-2xl text-foreground">
            {translate("empty.title")}
          </h1>
          <p className="mb-6 font-light text-foreground-dimmed text-lg">
            {translate("empty.description")}
          </p>
          <Button color="primary" render={<Link href="/onboarding/connect" />}>
            {translate("empty.action")} <ArrowRightIcon className="size-4" />
          </Button>
        </Motion.Item>
      </Motion.Stagger>
    );

  return (
    <ProductSelector products={products}>
      <Motion.Up>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
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
