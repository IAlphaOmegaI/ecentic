import { getMessages, getTranslations } from "next-intl/server";
import { ItemCycle } from "@/app/[locale]/(main)/_components/item-cycle";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { ShopifyWorkflowCycle } from "./shopify-workflow-cycle";

export const Workflow = async () => {
  const translate = await getTranslations("shopify");
  const messages = await getMessages();
  const outcomes = messages.shopify.workflow.outcomes;

  return (
    <section className="scroll-mt-24 border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <Reveal className="p-6 md:p-12">
          <RevealItem>
            <span className="font-normal text-3xl text-primary">
              {translate("workflow.number")}
            </span>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
              {translate("workflow.title")}
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
              {translate("workflow.description")}
            </p>
          </RevealItem>
        </Reveal>

        <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

          <div className="flex flex-col bg-background-dimmed md:min-h-0">
            <RevealItem className="flex flex-col gap-4 p-6 md:p-8">
              <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
                {translate("workflow.paragraph")}
              </p>
            </RevealItem>
            <ItemCycle items={outcomes} />
          </div>

          <div className="flex min-h-0 flex-col gap-px bg-accent-foreground md:h-full">
            <h3 className="shrink-0 bg-background-rich px-6 pt-6 pb-4 font-body font-medium text-3xl text-foreground md:px-8">
              {translate("workflow.panelTitle")}
            </h3>
            <ShopifyWorkflowCycle />
          </div>
        </Reveal>
      </div>
    </section>
  );
};
