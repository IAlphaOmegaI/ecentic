"use client";

import { ShoppingCartIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as Offers from "@/server/app/intelligence/offers";

export namespace FindOffers {
  export type Props = {
    store: string;
    product: string;
  };
}

/**
 * "Who else sells this?", scoped to one product.
 *
 * The product page is the only screen in the app already narrowed to a single
 * product, which makes it the natural home for the per-product resolver — and
 * until now `resolveOffersForProduct` had no caller at all, so the narrowest
 * and cheapest way to ask the question was the one path a merchant could not
 * reach.
 *
 * Unlike the onboarding tab this is a single lookup, not a catalog sweep: one
 * product, one chain, ~3s. It is worth its own control precisely because the
 * cost is bounded and obvious.
 */
export const FindOffers = ({ store, product }: FindOffers.Props) => {
  const toast = useToastManager();
  const router = useRouter();
  const translate = useTranslations("dashboard.products.detail.findOffers");

  const [handleFind, isFinding] = useAsyncAction(async () => {
    const resolution = await Offers.resolveOffersForProduct({
      store,
      product,
    });

    if (!resolution.success) {
      toast.add({
        title: translate("toast.failed"),
        description: resolution.error.message,
        type: "error",
      });
      return;
    }

    // Every one of these is a state the merchant can act on rather than a
    // failure, so each gets its own message instead of an empty table.
    if (resolution.data.offers === 0) {
      toast.add({
        title: translate("toast.none.title"),
        description: translate(
          resolution.data.reason === "budget-exhausted"
            ? "toast.none.budget"
            : resolution.data.reason === "not-configured"
              ? "toast.none.unconfigured"
              : "toast.none.exclusive",
        ),
        type: "error",
      });
      return;
    }

    router.refresh();
    toast.add({
      title: translate("toast.found.title"),
      description: translate("toast.found.description", {
        count: resolution.data.offers,
      }),
      type: "success",
    });
  });

  return (
    <Button color="primary" onClick={handleFind} disabled={isFinding}>
      {isFinding ? translate("finding") : translate("action")}
      <ShoppingCartIcon className="size-4" />
    </Button>
  );
};
