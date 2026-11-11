import { getMessages } from "next-intl/server";
import { MarketingShell } from "./page";
import { MarketingBand } from "./primitives";

export const MarketingSkeleton = async () => {
  const { enterpriseChrome } = await getMessages();
  return (
    <MarketingShell>
      <MarketingBand>
        <div
          className="marketing-cell relative min-w-0 px-7 py-14 max-sm:px-4 max-sm:py-10 [&>h2+p]:mt-5 [&>h3+p]:mt-5 [&>p]:max-w-[70ch]"
          role="status"
          aria-label={enterpriseChrome.loading}
        >
          <div aria-hidden="true" className="min-h-[540px] pt-12">
            <div className="h-4 w-36 bg-background-dimmed" />
            <div className="mt-10 h-14 w-4/5 bg-background-dimmed" />
            <div className="mt-4 h-14 w-3/5 bg-background-dimmed" />
            <div className="mt-10 h-6 w-3/4 bg-background-dimmed" />
            <div className="mt-4 h-6 w-1/2 bg-background-dimmed" />
            <div className="mt-10 h-12 w-72 max-w-full bg-background-dimmed" />
          </div>
        </div>
      </MarketingBand>
    </MarketingShell>
  );
};
