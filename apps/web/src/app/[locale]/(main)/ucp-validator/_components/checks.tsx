import { CheckIcon } from "@zenncore/icons";
import { getMessages, getTranslations } from "next-intl/server";
import { UcpArt } from "@/app/[locale]/(main)/resources/_components/resource-art";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

export const Checks = async () => {
  const translate = await getTranslations("ucpValidator");
  const messages = await getMessages();
  const checks = messages.ucpValidator.checks.items;

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("checks.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("checks.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("checks.description")}
            </p>
          </RevealItem>
        </Reveal>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="relative min-h-64 bg-background-dimmed md:min-h-72">
            <RevealItem className="h-full w-full">
              <UcpArt className="h-full min-h-64 w-full md:min-h-72" />
            </RevealItem>
          </div>

          <div className="flex flex-col gap-px bg-accent-foreground">
            {checks.map((check) => (
              <div
                key={check.title}
                className="flex flex-1 bg-background-rich p-6 md:p-8"
              >
                <RevealItem className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                    <h3 className="font-body font-medium text-foreground text-xl">
                      {check.title}
                    </h3>
                  </div>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {check.description}
                  </p>
                </RevealItem>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
