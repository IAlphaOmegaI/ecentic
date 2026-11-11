import { getMessages } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import {
  MarketingFaq,
  MarketingShell,
  marketingMetadata,
} from "@/components/marketing/page";
import { ClientMessages } from "@/i18n/client-messages";
import {
  createSoftwareApplicationSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";
import { Capabilities } from "./_components/enterprise/capabilities";
import {
  Findings,
  PricingPaths,
  Procurement,
  Resources,
} from "./_components/enterprise/closing-sections";
import { Journey } from "./_components/enterprise/journey";
import { CommerceLayer } from "./_components/enterprise/layer";
import { Overview } from "./_components/enterprise/overview";
import {
  Businesses,
  Channels,
  Integrations,
  ProductFilm,
} from "./_components/enterprise/sections";
import { Programs } from "./_components/enterprise/shared";
import { SectionGutter } from "./dashboard/_components/grid";

export const generateMetadata = async () => {
  const { enterpriseHome } = await getMessages();
  return marketingMetadata(enterpriseHome.meta, "/");
};

export default async () => {
  const {
    enterpriseHome: copy,
    enterpriseIntegrations,
    pricing,
  } = await getMessages();
  return (
    <ClientMessages scope="home">
      <MarketingShell>
        <JsonLd
          schemas={[
            organizationSchema,
            websiteSchema,
            createSoftwareApplicationSchema(pricing.schema.plans),
          ]}
        />
        <Overview copy={copy.hero} />
        <Journey copy={copy.loop} />
        <Programs copy={copy.programs} />
        <SectionGutter />
        <CommerceLayer />
        <SectionGutter />
        <Businesses copy={copy.businesses} />
        <ProductFilm copy={copy.film} />
        <Channels copy={copy.channels} />
        <Integrations
          copy={copy.integration}
          directory={enterpriseIntegrations}
        />
        <SectionGutter />
        <Capabilities copy={copy.mechanisms} />
        <Findings copy={copy.proof} />
        <SectionGutter />
        <Procurement copy={copy.procurement} />
        <PricingPaths copy={copy.pricing} />
        <Resources copy={copy.editorial} />
        <SectionGutter />
        <MarketingFaq title={copy.faq.title} items={copy.faq.items} />
      </MarketingShell>
    </ClientMessages>
  );
};
