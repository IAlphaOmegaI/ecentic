import { getLocale, getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { AgentReplay } from "@/components/marketing/interactive/agent-replay";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { SectionGutter } from "../dashboard/_components/grid";
import { DemoAgenda } from "./_components/demo-agenda";
import { DemoForm } from "./_components/demo-form";

export const generateMetadata = async () => {
  const { enterpriseDemo } = await getMessages();
  return marketingMetadata(enterpriseDemo.meta, "/demo");
};

export default async () => {
  const locale = await getLocale();
  const { enterpriseDemo, enterpriseLead, enterpriseChrome, demoPage } =
    await getMessages();
  const agenda = enterpriseDemo.sections.find(
    (section) => section.id === "what-we-cover",
  );
  const request = enterpriseDemo.sections.find(
    (section) => section.id === "request",
  );
  const store = enterpriseDemo.sections.find(
    (section) => section.id === "single-store",
  );

  return (
    <MarketingPage
      content={{
        ...enterpriseDemo,
        actions: [
          { label: enterpriseChrome.action.primary, href: "#request" },
          { label: enterpriseChrome.action.secondary, href: "/sign-up" },
        ],
        sections: [],
      }}
      path="/demo"
      heroArtwork="console"
    >
      {agenda && <DemoAgenda section={agenda} copy={demoPage.agenda} />}
      <SectionGutter />
      <AgentReplay />
      <SectionGutter />
      {request && (
        <MarketingBand
          id="request"
          className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid grid-cols-[2fr_1fr] border-accent-foreground border-b bg-background-dimmed max-md:grid-cols-1">
            <div className="relative min-w-0 border-accent-foreground border-r px-8 py-12 max-sm:px-4 max-sm:pt-8 max-md:border-r-0 max-md:pb-0">
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
              <h2>{request.title}</h2>
              <p className="mt-4 max-w-[55ch] text-foreground-dimmed text-lg">
                {request.description}
              </p>
            </div>
            <div className="relative min-h-56 text-primary max-md:h-44 max-md:min-h-0">
              <div className="absolute inset-4">
                <EvolvingAscii artwork="commerce" />
              </div>
            </div>
          </div>
          <DemoForm
            copy={enterpriseLead}
            formCopy={enterpriseDemo.form}
            locale={locale}
          />
        </MarketingBand>
      )}
      <SectionGutter />
      {store && (
        <MarketingBand
          id={store.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden"
        >
          <div className="grid grid-cols-[1fr_1fr] items-center bg-background-dimmed max-md:grid-cols-1">
            <div className="min-w-0 px-8 py-12 max-sm:px-4 max-sm:py-8">
              <h2>{store.title}</h2>
              <p className="mt-4 text-foreground-dimmed">{store.description}</p>
            </div>
            <div className="px-8 py-12 max-sm:px-4 max-sm:pb-8 max-md:pt-0 [&>.marketing-actions]:mt-0">
              <MarketingActions actions={store.links ?? []} />
            </div>
          </div>
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
