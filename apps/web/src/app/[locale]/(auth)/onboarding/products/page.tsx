import { ArrowRightIcon, BoxMinusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
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
        className="flex flex-1 flex-col items-center justify-center px-8"
      >
        <Motion.Item className="flex size-full flex-col items-center justify-center border-accent-foreground border-x p-6 text-center">
          <BoxMinusIcon className="mx-auto mb-6 size-24" />
          <h1 className="mb-2 font-medium text-2xl text-foreground">
            {translate("empty.title")}
          </h1>
          <p className="mb-6 font-light text-foreground-dimmed text-lg">
            {translate("empty.description")}
          </p>
          <Button color="primary" render={<Link href="/onboarding/connect" />}>
            {translate("empty.action")}{" "}
            <ArrowRightIcon className="size-4" />
          </Button>
        </Motion.Item>
      </Motion.Stagger>
    );

  return (
    <ProductSelector products={products}>
      <Motion.Up className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-medium text-4xl text-foreground">
            {translate("page.title")}
          </h1>
          <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs">
            {translate("page.freeLimit")}
          </span>
        </div>
        <p className="font-light text-2xl text-foreground-dimmed">
          {translate("page.description")}
        </p>
      </Motion.Up>
    </ProductSelector>
  );
};
