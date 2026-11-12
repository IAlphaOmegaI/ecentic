import { getMessages } from "next-intl/server";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import {
  MarketingEyebrow,
  MarketingFeatureBand,
} from "@/components/marketing/primitives";
import { SecurityFlowClient } from "./security-flow-client";

/** Draft for Alvi's review; excluded from public page HTML until separately approved. */
export const SecurityFlow = async () => {
  // biome-ignore lint/complexity/useLiteralKeys: Environment keys have an index signature.
  if (process.env["NEXT_PUBLIC_REVIEW"] !== "1") return null;

  const { interactiveSecurity: copy } = await getMessages();
  return (
    <MarketingFeatureBand id="data-flow-review" tone="dark">
      <div
        data-security-flow
        className="marketing-section-grid relative border-background-rich/15 border-y"
      >
        <MarketingEdgeCrosses />
        <MarketingEdgeCrosses edge="bottom" />
        <div className="px-8 py-8 max-sm:px-4">
          <MarketingEyebrow>{copy.reviewLabel}</MarketingEyebrow>
          <h2>{copy.title}</h2>
          <p className="mt-4 max-w-[76ch] text-background-rich/70 leading-relaxed">
            {copy.description}
          </p>
        </div>
        <SecurityFlowClient copy={copy} />
      </div>
    </MarketingFeatureBand>
  );
};
