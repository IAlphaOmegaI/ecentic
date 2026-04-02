import { parseSearchParam } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CompetitorManager } from "./_components/competitor-manager";

export default async ({ searchParams }: SearchParamsProps<"products">) => {
  await connection();

  const params = await searchParams;

  const products = parseSearchParam(params.products, "list", []);

  const skimmed = await Product.skimForCurrentUser(Environment.SERVER);
  const productNames = skimmed.success
    ? skimmed.data.map((product) => product.title).filter(Boolean)
    : [];

  return (
    <CompetitorManager products={products} productNames={productNames}>
      <Motion.Item className="border-accent-foreground border-x p-6">
        <h2 className="font-medium text-4xl text-foreground">
          Who are your competitors?
        </h2>
        <p className="mt-1 font-light text-2xl text-foreground-dimmed">
          We'll test your products head-to-head against these competitors in AI
          agent simulations.
        </p>
      </Motion.Item>
    </CompetitorManager>
  );
};
