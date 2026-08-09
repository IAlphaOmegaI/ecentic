import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export const Workflows = async () => {
  const translate = await getTranslations("features");
  const messages = await getMessages();
  const workflows = messages.features.workflows.items;

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("workflows.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("workflows.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("workflows.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
          {workflows.map((workflow) => (
            <article
              key={workflow.href}
              className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
            >
              <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                {workflow.eyebrow}
              </p>
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
                  {workflow.title}
                </h3>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {workflow.description}
                </p>
              </div>
              <Button
                color={workflow.color}
                className="w-fit"
                render={<Link href={workflow.href} />}
              >
                {workflow.label}
                <ArrowRightIcon className="size-4" />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
