import { ArrowRightIcon, ShieldCheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Plus } from "@/components/plus";

export const UCPCallout = async ({ locale }: UCPCallout.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section className="relative border-accent-foreground border-y p-6">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="flex flex-col items-start gap-6 md:flex-row md:justify-between">
        <div className="flex items-start gap-4">
          <ShieldCheckIcon className="size-14 shrink-0 text-primary" />
          <div>
            <h2 className="font-medium text-2xl text-foreground md:text-3xl">
              {translate("ucpCallout.title")}
            </h2>
            <p className="mt-2 max-w-xl font-light text-base text-foreground-dimmed md:text-lg">
              {translate("ucpCallout.description")}
            </p>
          </div>
        </div>
        <Button
          variant="flat"
          color="primary"
          render={<Link href="/ucp-validator" />}
        >
          {translate("action.checkStoreFree")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </section>
  );
};

export namespace UCPCallout {
  export type Props = {
    locale: Locale;
  };
}
