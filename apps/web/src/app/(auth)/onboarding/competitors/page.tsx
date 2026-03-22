import { parseSearchParam } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";

import { Motion } from "@/components/motion";
import { CompetitorManager } from "./_components/competitor-manager";
import { connection } from "next/server";

export default async ({ searchParams }: SearchParamsProps<"products">) => {
  await connection();

  const params = await searchParams;

  const products = parseSearchParam(params.products, "list", []);

  return (
    <CompetitorManager products={products}>
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
