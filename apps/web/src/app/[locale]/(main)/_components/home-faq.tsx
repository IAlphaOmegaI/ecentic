import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Faq } from "../pricing/_components/faq";

export const HomeFaq = async () => {
  const translate = await getTranslations("home");
  const messages = await getMessages();

  return (
    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-y bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="flex flex-col gap-4 bg-background-dimmed p-6 md:p-12">
          <h2 className="font-body font-medium text-3xl text-foreground md:text-4xl">
            {translate("faq.title")}
          </h2>
          <p className="max-w-sm font-light text-foreground-dimmed text-lg">
            {translate("faq.description")}
          </p>
        </div>
        <div className="bg-background">
          <Faq items={messages.home.faq.items} />
        </div>
      </div>
    </section>
  );
};
