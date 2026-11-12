export type LifecycleBlocker =
  | "reauthenticate"
  | "confirmation"
  | "notFound"
  | "googleConnected"
  | "shopifyBilling"
  | "billingRecords"
  | "storeConnections";

export const hasFreshSession = (
  createdAt: Date | string,
  now: number = Date.now(),
) => {
  const age = now - new Date(createdAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < 5 * 60 * 1000;
};

export const storeDisconnectBlocker = ({
  owner,
  actor,
  shopifyUsageLine,
  googleConnected,
}: {
  owner?: string;
  actor: string;
  shopifyUsageLine?: string | null;
  googleConnected: boolean;
}): LifecycleBlocker | null => {
  if (owner !== actor) return "notFound";
  if (shopifyUsageLine) return "shopifyBilling";
  if (googleConnected) return "googleConnected";
  return null;
};
