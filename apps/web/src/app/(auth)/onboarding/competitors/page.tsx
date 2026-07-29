import { parseSearchParam, unwrapResult } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Motion } from "@/components/motion";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { CompetitorManager } from "./_components/competitor-manager";

export default async ({ searchParams }: SearchParamsProps<"products">) => {
  await connection();

  const params = await searchParams;

  const products = parseSearchParam(params.products, "list", []);

  // Competitors are store-scoped, so this step has to know which catalog it is
  // detecting for. The selected products carry that — resolving from them keeps
  // the rivals on the same store the products came from, rather than on
  // whichever store happens to be newest.
  const store = await unwrapResult(
    Product.resolveStoreForSelection(Environment.SERVER, { products }),
  );

  // No store means nothing has been connected yet; there is no catalog to find
  // rivals for, so send the user back to the step that creates one.
  if (!store) redirect("/onboarding/connect");

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
