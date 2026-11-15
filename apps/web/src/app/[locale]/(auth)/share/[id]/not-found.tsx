import { FileSearchIcon } from "@zenncore/icons";
import { getTranslations } from "next-intl/server";
import { MarketingBand } from "@/components/marketing/primitives";
import { ShareCallToAction, ShareShell } from "./_components/shell";

export default async () => {
  const translate = await getTranslations("share.review.unavailable");
  return (
    <ShareShell>
      <MarketingBand className="bg-background-rich">
        <div className="flex items-start gap-4 px-4 py-10 sm:px-6 sm:py-14">
          <FileSearchIcon
            aria-hidden
            className="mt-1 size-8 shrink-0 text-primary"
          />
          <div>
            <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
              {translate("title")}
            </h2>
            <p className="mt-3 max-w-2xl text-foreground-dimmed leading-relaxed">
              {translate("description")}
            </p>
          </div>
        </div>
      </MarketingBand>
      <ShareCallToAction />
    </ShareShell>
  );
};
