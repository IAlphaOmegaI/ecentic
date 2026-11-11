import { getMessages } from "next-intl/server";
import { MarketingShell } from "./page";
import { MarketingHero } from "./primitives";

export const MarketingSkeleton = async ({
  identity = false,
}: MarketingSkeleton.Props = {}) => {
  const { enterpriseChrome } = await getMessages();
  return (
    <MarketingShell>
      <MarketingHero
        dark
        identity={
          identity ? (
            <span
              aria-hidden
              className="block size-28 rounded-md bg-background-rich/20 sm:size-36"
            />
          ) : undefined
        }
        title={
          <span role="status" aria-label={enterpriseChrome.loading}>
            <span
              aria-hidden="true"
              className="block h-14 w-4/5 bg-background-rich/20"
            />
            <span
              aria-hidden="true"
              className="mt-4 block h-14 w-3/5 bg-background-rich/20"
            />
          </span>
        }
        description={
          <span aria-hidden="true">
            <span className="block h-6 w-3/4 bg-background-rich/20" />
            <span className="mt-4 block h-6 w-1/2 bg-background-rich/20" />
          </span>
        }
      >
        <div
          aria-hidden="true"
          className="mt-6 h-10 w-56 max-w-full rounded-md bg-background-rich/20"
        />
      </MarketingHero>
    </MarketingShell>
  );
};

export const ProviderMarketingSkeleton = () => <MarketingSkeleton identity />;

export namespace MarketingSkeleton {
  export type Props = { identity?: boolean };
}
