import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { UcpValidatorForm } from "./ucp-validator-form";

export const ValidatorSection = async () => {
  const translate = await getTranslations("ucpValidator");
  const messages = await getMessages();

  return (
    <section
      id="validate"
      className="scroll-mt-24 border-accent-foreground border-b"
    >
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />

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
    </section>
  );
};
