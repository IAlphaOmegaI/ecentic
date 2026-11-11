import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { UcpValidatorForm } from "./ucp-validator-form";

export const ValidatorSection = async () => {
  const translate = await getTranslations("ucpValidator");

  return (
    <section id="validate" className="border-accent-foreground border-b">
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="px-7 pt-24 pb-12 max-sm:px-4 max-sm:pt-14 max-sm:pb-8">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("validator.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-heading font-medium text-4xl text-foreground md:text-6xl">
              {translate("validator.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-2xl font-normal text-foreground-dimmed text-xl">
              {translate("validator.description")}
            </p>
          </RevealItem>
        </Reveal>

        <div className="relative border-accent-foreground border-t">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          <UcpValidatorForm hideIntro />
        </div>
      </div>
    </section>
  );
};
