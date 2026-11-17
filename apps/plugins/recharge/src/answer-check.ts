import {
  isPricedSubscriptionOffer,
  type PublishableSubscriptionOffer,
} from "./publication";

export type SubscriptionObservation = {
  productEvidence: string | null;
  variantEvidence?: string | null;
  subscriptionEvidence: string | null;
  priceEvidence: string | null;
  intervalEvidence: string | null;
  price: string | null;
  currency: string | null;
  intervalUnit: "day" | "week" | "month" | null;
  intervalFrequency: number | null;
  uncertain: boolean;
};

export type SubscriptionVerdict = {
  status: "correct" | "wrong" | "missing" | "inconclusive";
  reason: string;
  evidence: string | null;
};

const decimal = (value: string) => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return `${whole?.replace(/^0+(?=\d)/, "")}.${fraction.replace(/0+$/, "")}`;
};
const normalized = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const quotedDecimal = (value: string) => {
  if (/^\d{1,3}(?:[, '\u00a0\u202f]\d{3})+(?:\.\d+)?$/.test(value))
    return decimal(value.replace(/[, '\u00a0\u202f]/g, ""));
  return decimal(value);
};

/**
 * The extractor is not a judge. Its quotes must occur in the captured answer,
 * and its price/interval must be literally supported before comparison.
 */
export const assessSubscriptionAnswer = ({
  offer,
  product,
  answer,
  observation,
}: {
  offer: PublishableSubscriptionOffer;
  product: { title: string; url: string | null; variantTitle?: string | null };
  answer: string;
  observation: SubscriptionObservation;
}): SubscriptionVerdict => {
  const inconclusive = (reason: string): SubscriptionVerdict => ({
    status: "inconclusive",
    reason,
    evidence: null,
  });
  if (!isPricedSubscriptionOffer(offer))
    return inconclusive(
      "The current subscription price or interval is unavailable.",
    );
  if (observation.uncertain || !answer.trim())
    return inconclusive("The answer did not establish a subscription offer.");
  const quotes = [
    observation.productEvidence,
    observation.variantEvidence,
    observation.subscriptionEvidence,
    observation.priceEvidence,
    observation.intervalEvidence,
  ].filter((quote): quote is string => Boolean(quote));
  if (quotes.some((quote) => !answer.includes(quote)))
    return inconclusive(
      "An extracted quote was not present in the captured answer.",
    );
  const identity = normalized(observation.productEvidence ?? "");
  if (
    !identity ||
    (!identity.includes(normalized(product.title)) &&
      !(product.url && identity.includes(normalized(product.url))))
  )
    return inconclusive("The answer could not be matched to this product.");
  if (
    product.variantTitle &&
    !normalized(observation.variantEvidence ?? "").includes(
      normalized(product.variantTitle),
    ) &&
    !normalized(observation.variantEvidence ?? "").includes(
      offer.externalVariantId,
    )
  )
    return inconclusive(
      "The answer could not be matched to the subscribed variant.",
    );

  const evidence = [...new Set(quotes)].join("\n");
  if (!observation.subscriptionEvidence)
    return {
      status: "missing",
      reason:
        "The answer names this product but leaves out its subscription offer.",
      evidence,
    };
  const subscription = normalized(observation.subscriptionEvidence);
  if (
    /\b(?:no|not|without|unavailable|cannot|can't|unable)\b/.test(subscription)
  )
    return inconclusive(
      "The subscription excerpt contains a qualification or denial.",
    );
  if (
    (!subscription.includes(normalized(product.title)) &&
      !(product.url && subscription.includes(normalized(product.url)))) ||
    (product.variantTitle &&
      !subscription.includes(normalized(product.variantTitle)) &&
      !subscription.includes(offer.externalVariantId))
  )
    return inconclusive(
      "The subscription excerpt does not identify this product and variant.",
    );
  if (
    !observation.price ||
    !observation.priceEvidence ||
    !observation.intervalEvidence ||
    !observation.intervalUnit ||
    !observation.intervalFrequency
  )
    return {
      status: "missing",
      reason:
        "The answer mentions a subscription but omits its price or delivery interval.",
      evidence,
    };
  if (!observation.currency || !/^[A-Z]{3}$/.test(observation.currency))
    return inconclusive("The captured price does not identify its currency.");
  if (
    /\b(?:from|starting|about|approximately|around|up to|as low as|at least)\b|\d\s*[-–—]\s*\d/i.test(
      observation.priceEvidence,
    )
  )
    return inconclusive(
      "The answer states a range or qualified price, not an exact price.",
    );
  if (
    !observation.subscriptionEvidence.includes(observation.priceEvidence) ||
    !observation.subscriptionEvidence.includes(observation.intervalEvidence)
  )
    return inconclusive(
      "The price and interval were not quoted from the same subscription offer.",
    );

  // Keep grouping punctuation inside a token: '1,018' cannot supply '18'.
  const prices =
    observation.priceEvidence.match(/\d+(?:[., '\u00a0\u202f]\d+)*/g) ?? [];
  if (
    !prices.some(
      (price) => quotedDecimal(price) === decimal(observation.price ?? ""),
    )
  )
    return inconclusive("The extracted price is not supported by its quote.");
  const symbols: Record<string, string> = { EUR: "€", GBP: "£", USD: "US$" };
  if (
    !observation.priceEvidence.includes(observation.currency) &&
    !(
      symbols[observation.currency] &&
      observation.priceEvidence.includes(symbols[observation.currency] ?? "")
    )
  )
    return inconclusive("The captured currency is ambiguous.");
  const interval = normalized(observation.intervalEvidence);
  const frequency = observation.intervalFrequency;
  const unit = observation.intervalUnit;
  const ordinary = new RegExp(`\\b${frequency}\\s*${unit}s?\\b`).test(interval);
  const singular =
    frequency === 1 &&
    (interval.includes(`every ${unit}`) ||
      interval.includes(`per ${unit}`) ||
      interval.includes(
        { day: "daily", week: "weekly", month: "monthly" }[unit],
      ));
  if (!ordinary && !singular)
    return inconclusive(
      "The extracted interval is not supported by its quote.",
    );
  const correct =
    decimal(observation.price) === decimal(offer.price) &&
    observation.currency === offer.currency &&
    unit === offer.orderIntervalUnit &&
    frequency === offer.orderIntervalFrequency;
  return {
    status: correct ? "correct" : "wrong",
    reason: correct
      ? "The captured subscription price, currency and interval match Recharge."
      : "The captured subscription price, currency or interval differs from Recharge.",
    evidence,
  };
};
