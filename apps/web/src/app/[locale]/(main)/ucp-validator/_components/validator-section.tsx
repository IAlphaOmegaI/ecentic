import { getMessages, getTranslations } from "next-intl/server";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { UcpValidatorForm } from "./ucp-validator-form";

export const ValidatorSection = async () => {
  const translate = await getTranslations("ucpValidator");
  const messages = await getMessages();

  return (
    <MarketingLightBand id="validate">
      <div className="relative min-w-0">
        <div className="grid items-end gap-6 px-7 py-10 max-sm:px-4 max-sm:py-8 md:grid-cols-[5fr_8fr] md:gap-12">
          <div>
            <span className="text-3xl text-primary">
              {translate("validator.number")}
            </span>
            <h2 className="mt-4 text-foreground-rich">
              {translate("validator.title")}
            </h2>
          </div>
          <p className="max-w-xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {translate("validator.description")}
          </p>
        </div>

        <div className="border-accent-foreground border-t">
          <UcpValidatorForm
            hideIntro
            previewLabel={messages.validatorPage.discoveryRequest}
          />
        </div>
      </div>
    </MarketingLightBand>
  );
};
