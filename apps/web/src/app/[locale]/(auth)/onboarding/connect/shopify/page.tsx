import { getMessages, getTranslations } from "next-intl/server";
import { SetupPage, SetupSteps } from "../../_components/setup-page";
import { ShopifyForm } from "./_components/shopify-form";

export default async () => {
  const translate = await getTranslations("onboarding.connect");
  const messages = await getMessages();
  return (
    <SetupPage
      title={translate("shopify.title")}
      description={translate("shopify.description")}
      image="/images/shopify.svg"
      guidance={
        <SetupSteps
          title={translate("shopify.howItWorks")}
          steps={messages.onboarding.connect.shopify.steps}
        />
      }
    >
      <ShopifyForm />
    </SetupPage>
  );
};
