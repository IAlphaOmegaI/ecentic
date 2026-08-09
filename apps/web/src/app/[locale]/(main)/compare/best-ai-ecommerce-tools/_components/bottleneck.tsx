import { cn } from "@zenncore/utils";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";

export const Bottleneck = async () => {
  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const body = messages.compare.bottleneck.body;
  const mappings = messages.compare.bottleneck.mappings;

  return (
    <section className="scroll-mt-24 border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("bottleneck.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("bottleneck.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("bottleneck.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="flex flex-col bg-background-dimmed md:min-h-0">
            <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
              {body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="font-body font-light text-foreground-dimmed text-lg leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </RevealItem>
          </div>

          <div className="flex flex-col gap-px bg-accent-foreground">
            <h3 className="bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
              {translate("bottleneck.mappingsHeading")}
            </h3>
            {mappings.map((mapping, index) => (
              <div
                key={mapping.title}
                className="grid grid-cols-[2.5rem_1fr] bg-background-rich px-6 py-5 md:grid-cols-[5rem_1fr] md:px-8"
              >
                <span className="font-normal text-lg text-primary tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <RevealItem className="flex flex-col gap-1">
                  <h4
                    className={cn(
                      "font-body font-medium text-xl",
                      "emphasized" in mapping && mapping.emphasized
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    {mapping.title}
                  </h4>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {mapping.description}
                  </p>
                </RevealItem>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
