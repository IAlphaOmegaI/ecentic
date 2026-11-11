import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { ContactRouting } from "./_components/contact-routing";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.contact.meta, "/contact");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.contact;
  const contacts = content.sections.find(
    (section) => section.id === "contacts",
  );
  const company = content.sections.find((section) => section.id === "company");
  const rows = company?.rows?.filter((row) => row.value.trim());

  return (
    <MarketingPage
      content={{
        ...content,
        actions: contacts ? [{ label: contacts.title, href: "#contacts" }] : [],
        sections: [],
      }}
      path="/contact"
      heroArtwork="console"
    >
      {contacts && <ContactRouting section={contacts} />}
      {company && (
        <MarketingBand
          id={company.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
        >
          <div className="flex flex-wrap items-center justify-between gap-6 px-7 py-10 max-sm:px-4 max-sm:py-8">
            <h2>{company.title}</h2>
            <div className="flex flex-wrap gap-4">
              {company.links?.map((link) => (
                <Button
                  key={link.href}
                  color="neutral"
                  render={<Link href={link.href} />}
                >
                  {link.label}
                  <ArrowRightIcon className="size-4" />
                </Button>
              ))}
            </div>
          </div>
          {rows && rows.length > 0 && (
            <dl className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="bg-background-dimmed px-7 py-8 max-sm:px-4"
                >
                  <dt className="text-foreground-dimmed text-sm">
                    {row.label}
                  </dt>
                  <dd className="mt-3 text-foreground-rich">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </MarketingBand>
      )}
    </MarketingPage>
  );
};
