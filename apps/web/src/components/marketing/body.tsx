import type { ReactNode } from "react";
import type { MarketingPage } from "./page";

/** A page owns its composition while keeping shared capability and evidence blocks. */
export type MarketingBodyProps = {
  sections: readonly MarketingPage.Section[];
  sectionChildren?: Record<string, ReactNode>;
};
