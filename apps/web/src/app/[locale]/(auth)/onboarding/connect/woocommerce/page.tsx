import { getMessages, getTranslations } from "next-intl/server";
import { SetupPage, SetupSteps } from "../../_components/setup-page";
import { OneClickConnect } from "./_components/one-click-connect";
import { WooCommerceForm } from "./_components/woocommerce-form";

export default async () => {
  const translate = await getTranslations("onboarding.connect");
  const messages = await getMessages();
  return (
    <SetupPage
      title={translate("woocommerce.title")}
      description={translate("woocommerce.description")}
      image="/images/woocommerce.svg"
      guidance={
        <SetupSteps
          title={translate("woocommerce.manual.title")}
          steps={messages.onboarding.connect.woocommerce.manual.steps}
        />
      }
    >
      <div className="space-y-4">
        <h2 className="font-medium text-foreground-rich text-lg">
          {translate("woocommerce.oneClick.title")}{" "}
          <span className="text-primary-text text-sm">
            {translate("woocommerce.oneClick.recommended")}
          </span>
        </h2>
        <p className="text-foreground-dimmed text-sm leading-relaxed">
          {translate("woocommerce.oneClick.description")}
        </p>
        <OneClickConnect />
      </div>
      <div className="mt-8 border-accent-foreground border-t pt-8">
        <h2 className="mb-6 font-medium text-foreground-rich text-lg">
          {translate("woocommerce.manual.title")}
        </h2>
        <WooCommerceForm />
      </div>
    </SetupPage>
  );
};
