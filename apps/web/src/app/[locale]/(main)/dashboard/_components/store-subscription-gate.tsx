"use client";

import type { PropsWithChildren } from "react";
import { usePathname } from "@/i18n/navigation";

/** Only the free source scanner bypasses the store dashboard's visual paywall.
 * Every paid feature remains enforced independently by its server actions. */
export const StoreSubscriptionGate = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  if (/^\/dashboard\/[^/]+\/webmcp\/?$/.test(pathname)) return null;
  return children;
};
