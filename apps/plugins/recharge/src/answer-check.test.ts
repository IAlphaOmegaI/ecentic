import { expect, test } from "bun:test";
import {
  assessSubscriptionAnswer,
  type SubscriptionObservation,
} from "./answer-check";

const offer = {
  externalProductId: "p1",
  externalVariantId: "v1",
  planId: "plan1",
  price: "18.00",
  currency: "USD",
  orderIntervalUnit: "month",
  orderIntervalFrequency: 1,
  chargeIntervalFrequency: 1,
};
const product = {
  title: "Roast Coffee",
  url: "https://coffee.example/products/roast",
};
const answer =
  "Roast Coffee is available by subscription for USD 18, delivered every 1 month.";
const observation: SubscriptionObservation = {
  productEvidence: "Roast Coffee",
  subscriptionEvidence: answer,
  priceEvidence: "USD 18",
  intervalEvidence: "every 1 month",
  price: "18.00",
  currency: "USD",
  intervalUnit: "month",
  intervalFrequency: 1,
  uncertain: false,
};
const assess = (
  changes: Partial<SubscriptionObservation> = {},
  text = answer,
) =>
  assessSubscriptionAnswer({
    offer,
    product,
    answer: text,
    observation: { ...observation, subscriptionEvidence: text, ...changes },
  });

test("compares observed prices exactly across decimal presentation", () => {
  expect(assess().status).toBe("correct");
  expect(
    assess(
      { price: "17", priceEvidence: "USD 17" },
      answer.replace("USD 18", "USD 17"),
    ).status,
  ).toBe("wrong");
});
test("does not count another product, unsupported quote or ambiguous currency", () => {
  expect(assess({ productEvidence: "Other Coffee" }).status).toBe(
    "inconclusive",
  );
  expect(assess({ price: "12" }).status).toBe("inconclusive");
  expect(
    assess({ priceEvidence: "$18" }, answer.replace("USD 18", "$18")).status,
  ).toBe("inconclusive");
});
test("reports omitted terms only after matching product evidence", () => {
  expect(
    assess(
      {
        subscriptionEvidence: null,
        priceEvidence: null,
        intervalEvidence: null,
        price: null,
        currency: null,
        intervalUnit: null,
        intervalFrequency: null,
      },
      "Roast Coffee is available.",
    ).status,
  ).toBe("missing");
  expect(assess({ uncertain: true }).status).toBe("inconclusive");
});
test("validates the interval quote before recording a mismatch", () => {
  expect(assess({ intervalFrequency: 2 }).status).toBe("inconclusive");
  expect(
    assess(
      { intervalFrequency: 2, intervalEvidence: "every 2 months" },
      answer.replace("every 1 month", "every 2 months"),
    ).status,
  ).toBe("wrong");
});

test("does not use an ordinary price as the subscription price", () => {
  expect(assess({ subscriptionEvidence: "by subscription" }).status).toBe(
    "inconclusive",
  );
});

test("requires explicit variant evidence for a product with named variants", () => {
  expect(
    assessSubscriptionAnswer({
      offer,
      product: { ...product, variantTitle: "500g" },
      answer,
      observation,
    }).status,
  ).toBe("inconclusive");
});

test("does not borrow a different product's subscription terms", () => {
  const other = "Tea subscription costs USD 18 every 1 month.";
  expect(
    assess(
      { subscriptionEvidence: other },
      `Roast Coffee is one-time. ${other}`,
    ).status,
  ).toBe("inconclusive");
});

test("does not split grouped amounts into a smaller apparent price", () => {
  for (const value of ["1,018", "1 018", "1\u202f018", "1'018", "18,50"])
    expect(
      assess(
        { priceEvidence: `USD ${value}` },
        answer.replace("USD 18", `USD ${value}`),
      ).status,
    ).toBe("inconclusive");
  expect(
    assess(
      { price: "1018", priceEvidence: "USD 1,018" },
      answer.replace("USD 18", "USD 1,018"),
    ).status,
  ).toBe("wrong");
});

test("does not turn negated or approximate prices into an exact match", () => {
  expect(
    assess({}, answer.replace("is available", "is not available")).status,
  ).toBe("inconclusive");
  expect(
    assess(
      { priceEvidence: "from USD 18" },
      answer.replace("USD 18", "from USD 18"),
    ).status,
  ).toBe("inconclusive");
  expect(
    assess(
      { priceEvidence: "USD 18–20" },
      answer.replace("USD 18", "USD 18–20"),
    ).status,
  ).toBe("inconclusive");
});
