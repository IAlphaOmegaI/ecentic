"use client";

import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/date";
import * as Offers from "@/server/app/intelligence/offers";
import { Crosshair, SectionKicker } from "../../../../_components/grid";

export namespace OfferShelf {
  export type Props = {
    store: string;
    product: string;
  };
}

/**
 * The shelf this product actually sits on: every seller we have observed
 * carrying it, cheapest first, with the price movement since we last looked.
 *
 * Reads `competitor_offer`, which until now was written on every resolution and
 * displayed nowhere — the price series accumulated with no surface. This is
 * that surface, and the product page is its natural home because the table's
 * grain is exactly one product.
 *
 * Renders nothing at all when there is no history. An empty shelf here is
 * indistinguishable from "we have not looked yet", and the product page already
 * carries a control for that; a second empty state would only add noise.
 */
export const OfferShelf = ({ store, product }: OfferShelf.Props) => {
  const translate = useTranslations("dashboard.products.detail.shelf");
  const [offers, setOffers] = useState<Offers.SellerOffer[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await Offers.listOffersForProduct({ store, product });
      if (cancelled) return;
      setOffers(result.success ? result.data : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [store, product]);

  if (!offers || offers.length === 0) return null;

  return (
    <section className="bg-background-rich">
      <div className="relative flex items-end justify-between border-accent-foreground border-y p-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <SectionKicker>{translate("kicker")}</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </p>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-accent-foreground">
        {offers.map((offer) => {
          // Movement is only meaningful once the same seller has been seen
          // twice; a first observation has nothing to have moved from.
          const delta =
            offer.price !== null && offer.previousPrice !== null
              ? offer.price - offer.previousPrice
              : null;

          return (
            <li
              key={offer.sellerDomain ?? offer.seller}
              className="flex items-center gap-3 p-4"
            >
              <Avatar className="size-10 shrink-0 rounded-md bg-background-dimmed">
                <AvatarImage
                  src={offer.imageUrl ?? "/images/fallback.png"}
                  alt={offer.seller}
                />
                <AvatarFallback className="relative">
                  <Image src="/images/fallback.png" alt="" fill />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground-rich">
                    {offer.seller}
                  </p>
                  {offer.position !== null && (
                    <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                      {translate("position", {
                        position: String(offer.position),
                      })}
                    </span>
                  )}
                </div>
                {offer.title && (
                  <p className="truncate text-foreground-dimmed text-sm">
                    {offer.title}
                  </p>
                )}
                <p className="text-foreground-dimmed/70 text-xs">
                  {translate("observed", {
                    when: formatRelativeTime(new Date(offer.measuredAt)),
                    count: offer.observations,
                  })}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-medium text-foreground-rich tabular-nums">
                  {offer.price === null
                    ? "—"
                    : formatPrice(String(offer.price), offer.currency)}
                </p>
                {delta !== null && delta !== 0 && (
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      // A rival CUTTING its price is the bad news for the
                      // merchant, so the colours track their interest rather
                      // than the arithmetic sign.
                      delta < 0 ? "text-error" : "text-success",
                    )}
                  >
                    {translate(delta < 0 ? "down" : "up", {
                      amount: formatPrice(
                        String(Math.abs(delta)),
                        offer.currency,
                      ),
                    })}
                  </p>
                )}
                {offer.total !== null && offer.total !== offer.price && (
                  <p className="text-foreground-dimmed/70 text-xs tabular-nums">
                    {translate("total", {
                      total: formatPrice(String(offer.total), offer.currency),
                    })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
