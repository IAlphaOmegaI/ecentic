import {
  ArrowRightIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
  CreditCardIcon,
} from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SupportContact } from "./_components/support-contact";

const directoryIcons = [
  CommerceCode_3Icon,
  CommercePlug_3SparkleIcon,
  CreditCardIcon,
  CommerceFileShieldIcon,
  CommerceFilePenIcon,
] as const;

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.support.meta, "/support");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.support;
  const help = content.sections.find((section) => section.id === "help");
  const directory = content.sections.find(
    (section) => section.id === "self-service",
  );

  return (
    <MarketingPage
      content={{ ...content, sections: [] }}
      path="/support"
      heroArtwork="console"
    >
      {help && <SupportContact section={help} />}
      <SectionGutter />
      {directory && (
        <MarketingBand
          id={directory.id}
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
            <div className="relative min-w-0 border-accent-foreground border-r bg-background-dimmed max-md:border-r-0 max-md:border-b">
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
              <div
                className="px-8 py-12 max-sm:px-4 max-sm:py-8 md:sticky md:top-24"
                data-support-self-service-illustration
              >
                <h2>{directory.title}</h2>
                <CommerceFigure
                  kind="documentStack"
                  surface="field"
                  className="mx-auto mt-6 max-w-sm"
                />
              </div>
            </div>
            <div className="min-w-0">
              {directory.items.map((item, index) => {
                const Icon = directoryIcons[index] ?? CommerceFilePenIcon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group grid min-h-28 grid-cols-[1fr_1.6fr_auto] items-center gap-6 border-accent-foreground border-b px-8 py-6 transition-colors last:border-b-0 hover:bg-background-dimmed/60 focus-visible:bg-background-dimmed focus-visible:-outline-offset-4 max-sm:grid-cols-[1fr_auto] max-sm:gap-x-4 max-sm:gap-y-2 max-sm:px-4"
                  >
                    <h3 className="flex items-center gap-3 text-xl group-hover:text-primary-text max-sm:row-start-1">
                      <Icon
                        aria-hidden
                        className="size-6 shrink-0 text-primary-text"
                      />
                      <span>{item.title}</span>
                    </h3>
                    <p className="text-foreground-dimmed text-sm leading-relaxed max-sm:col-start-1 max-sm:row-start-2">
                      {item.body}
                    </p>
                    <ArrowRightIcon className="size-4 shrink-0 text-primary-text max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1" />
                  </Link>
                );
              })}
            </div>
          </div>
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
