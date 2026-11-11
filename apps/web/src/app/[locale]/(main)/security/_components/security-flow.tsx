import { getMessages } from "next-intl/server";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { SecurityFlowClient } from "./security-flow-client";

/** Draft for Alvi's review; excluded from public page HTML until separately approved. */
export const SecurityFlow = async () => {
  // biome-ignore lint/complexity/useLiteralKeys: Environment keys have an index signature.
  if (process.env["NEXT_PUBLIC_REVIEW"] !== "1") return null;

  const { interactiveSecurity: copy } = await getMessages();
  return (
    <MarketingBand
      id="data-flow-review"
      className="[&_.marketing-guides]:hidden"
    >
      <div data-security-flow>
        <div className="px-8 py-8 max-sm:px-4">
          <MarketingEyebrow>{copy.reviewLabel}</MarketingEyebrow>
          <h2>{copy.title}</h2>
          <p className="mt-4 max-w-[76ch] text-foreground-dimmed leading-relaxed">
            {copy.description}
          </p>
        </div>
        <SecurityFlowClient copy={copy} />
      </div>
    </MarketingBand>
  );
};
