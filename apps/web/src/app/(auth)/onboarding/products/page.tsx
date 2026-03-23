import { BoxMinusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
import * as Product from "@/server/app/product";
import { ProductSelector } from "./_components/product-selector";

export default async () => {
  await connection();

  const products = await unwrapResult(Product.skimForCurrentUser());

  if (products.length === 0)
    return (
      <Motion.Stagger
        stagger={0.05}
        className="flex flex-1 flex-col items-center justify-center px-6 py-10"
      >
        <Motion.Up className="text-center">
          <BoxMinusIcon className="mx-auto mb-6 size-24" />
          <h1 className="mb-6 font-medium text-4xl text-foreground">
            No products found
          </h1>
          <p className="mb-2 font-light text-2xl text-foreground-dimmed">
            Connect a store and sync your products to get started.
          </p>
          <Button
            variant="flat"
            color="primary"
            render={<Link href="/onboarding/connect" />}
          >
            Connect a store
          </Button>
        </Motion.Up>
      </Motion.Stagger>
    );

  return (
    <ProductSelector products={products}>
      <Motion.Up className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-medium text-4xl text-foreground">
            Choose products to scan
          </h1>
          <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs">
            Free: 10 products
          </span>
        </div>
        <p className="font-light text-2xl text-foreground-dimmed">
          Select the products you want to test against AI shopping agents. We
          recommend starting with your best sellers.
        </p>
      </Motion.Up>
    </ProductSelector>
  );
};
