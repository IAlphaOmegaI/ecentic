import { getLocale, getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

import { MarketingScreenshot } from "@/components/marketing/primitives";

export const generateMetadata = async () => {
  const { enterprisePlatform } = await getMessages();
  return marketingMetadata(enterprisePlatform.overview.meta, "/platform");
};

export default async () => {
  const locale = await getLocale();
  const { enterprisePlatform } = await getMessages();
  return (
    <MarketingPage
      content={enterprisePlatform.overview}
      path="/platform"
      heroChildren={
        <MarketingScreenshot
          src={
            locale === "es"
              ? "/screenshots/enterprise-dashboard-sample-es.png"
              : "/screenshots/enterprise-dashboard-sample.png"
          }
          alt={enterprisePlatform.screenshot.alt}
          caption={enterprisePlatform.screenshot.caption}
        />
      }
    />
  );
};
