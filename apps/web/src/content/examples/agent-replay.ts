/** Invented facts for the labelled Retailers office-chair example, never a live scan. */
export const agentReplay = {
  currency: "USD",
  budget: 400,
  own: {
    price: 349,
    seatHeight: { minimum: 46, maximum: 56 },
    capacity: 136,
    variants: 3,
  },
  rival: {
    price: 379,
    seatHeight: { minimum: 44, maximum: 54 },
    capacity: 120,
    variants: 3,
  },
  fields: ["price", "seatHeight", "capacity", "variants"],
  missing: ["seatHeight", "capacity"],
  stages: ["question", "listings", "fields", "pick", "fix", "rerun"],
} as const;
