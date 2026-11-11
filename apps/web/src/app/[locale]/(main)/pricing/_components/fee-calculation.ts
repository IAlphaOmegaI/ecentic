/** Billing rounds each order before summing; AOV is an equal-order estimate. */
export const estimateFee = ({
  orders,
  amountCents,
  rateBps,
  capCents,
}: {
  orders: number;
  amountCents: number;
  rateBps: number;
  capCents: number;
}) => Math.min(capCents, orders * Math.round((amountCents * rateBps) / 10_000));

export const parseFeeInputs = (orders: string, amount: string) => {
  if (
    !/^\d+$/.test(orders.trim()) ||
    !/^\d+(?:[.,]\d{1,2})?$/.test(amount.trim())
  )
    return null;
  const count = Number(orders);
  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(amountCents))
    return null;
  return { orders: count, amountCents };
};
