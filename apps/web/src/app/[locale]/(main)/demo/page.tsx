import { getLocale, getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { DemoForm } from "./_components/demo-form";

export const generateMetadata = async () => {
  const { enterpriseDemo } = await getMessages();
  return marketingMetadata(enterpriseDemo.meta, "/demo");
};

export default async () => {
  const locale = await getLocale();
  const { enterpriseDemo, enterpriseLead } = await getMessages();
  return (
    <MarketingPage
      content={enterpriseDemo}
      path="/demo"
      sectionChildren={{
        request: (
          <DemoForm
            copy={enterpriseLead}
            formCopy={enterpriseDemo.form}
            locale={locale}
          />
        ),
      }}
    />
  );
};
