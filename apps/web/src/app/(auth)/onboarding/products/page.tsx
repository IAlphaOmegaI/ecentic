import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Motion } from "@/components/motion";
import * as Product from "@/server/app/product";
import { ProductSelector } from "./_components/product-selector";

export default async () => {
  const products = await unwrapResult(Product.getForCurrentUser());

  if (products.length === 0)
    return (
      <Motion.Stagger
        stagger={0.05}
        className="flex flex-1 flex-col items-center justify-center px-6 py-10"
      >
        <Motion.Up className="text-center">
          <h1 className="mb-2 font-medium text-2xl text-foreground">
            No products found
          </h1>
          <p className="mb-6 font-light text-foreground-dimmed text-sm">
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
        <div className="mb-1 flex items-center gap-2">
          <h1 className="font-medium text-2xl text-foreground">
            Choose products to scan
          </h1>
          <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary text-xs">
            Free: 10 products
          </span>
        </div>
        <p className="font-light text-foreground-dimmed text-sm">
          Select the products you want to test against AI shopping agents. We
          recommend starting with your best sellers.
        </p>
      </Motion.Up>
    </ProductSelector>
  );
};
