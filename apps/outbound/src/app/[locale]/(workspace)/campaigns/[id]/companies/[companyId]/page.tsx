import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Contacts from "@/server/app/outbound/campaign-contacts";
import { Environment } from "@/server/utils/environment";
import { ContactResearch } from "./_components/contacts";
import { ContactShell } from "./_components/shell";
import { ContactSkeleton } from "./_components/skeletons";

type PageProps = { params: Promise<{ id: string; companyId: string }> };

export default function Page({ params }: PageProps) {
  return (
    <ContactShell>
      <Suspense fallback={<ContactSkeleton />}>
        <ContactData params={params} />
      </Suspense>
    </ContactShell>
  );
}

const ContactData = async ({ params }: PageProps) => {
  const path = await params;
  const t = await getTranslations("outbound");
  const target = await Contacts.getCompany(Environment.SERVER, {
    campaign: path.id,
    company: path.companyId,
  });
  if (!target.success)
    return (
      <p role="alert" className="px-4 py-6 text-error text-sm sm:px-6">
        {t("common.error")}
      </p>
    );
  const { company, campaign } = target.data;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-heading font-medium text-foreground-rich text-xl">
            {company.name}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {company.domain}
          </p>
        </div>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href={`/campaigns/${campaign.id}`} />}
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {campaign.name}
        </Button>
      </div>
      {company.status === "added" && company.prospectId ? (
        <div className="px-4 py-6 sm:px-6">
          <Button
            variant="soft"
            render={<Link href={`/prospects/${company.prospectId}`} />}
          >
            {t("nav.prospects")}
          </Button>
        </div>
      ) : company.status === "candidate" &&
        company.criteriaRevision === campaign.revision &&
        ["draft", "active"].includes(campaign.status) ? (
        <ContactResearch
          company={{
            id: company.id,
            name: company.name,
            domain: company.domain,
            website: company.website,
            country: company.country,
            platform: company.platform,
            source: company.source,
          }}
          campaign={{ id: campaign.id, revision: campaign.revision }}
        />
      ) : (
        <p className="px-4 py-6 text-foreground-dimmed text-sm sm:px-6">
          {t("campaigns.contactSearchEmpty")}
        </p>
      )}
    </>
  );
};
