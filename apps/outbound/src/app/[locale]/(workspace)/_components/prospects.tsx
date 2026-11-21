"use client";
import {
  CheckBadgeIcon,
  FileSearchIcon,
  OfficeIcon,
  QuoteIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { useMessages, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  EMAIL_STATUSES,
  type Prospect,
  type ProspectInput,
  prospectSchema,
} from "@/lib/outbound";
import { sentHref } from "@/lib/outbound-sent";
import * as Outbound from "@/server/app/outbound";
import { fields, Notice, Submit, useMutation } from "./common";

const groups = [
  {
    title: "identityTitle",
    icon: OfficeIcon,
    keys: [
      "company",
      "domain",
      "website",
      "country",
      "platform",
      "relationship",
      "name",
      "first",
      "title",
      "email",
      "linkedinUrl",
      "roleSource",
      "roleCheckedAt",
      "timezone",
      "legitEvidence",
      "source",
      "lang",
      "notes",
    ],
  },
  {
    title: "evidenceTitle",
    icon: FileSearchIcon,
    keys: [
      "product",
      "productUrl",
      "productCategory",
      "reviewCount",
      "distributionSource",
      "gap",
      "finding",
      "evidence",
      "evidenceCheckedAt",
      "findingReviewed",
    ],
  },
  {
    title: "personalTitle",
    icon: QuoteIcon,
    keys: [
      "personalLine",
      "personalSource",
      "personalPublishedAt",
      "personalCheckedAt",
    ],
  },
  {
    title: "verificationTitle",
    icon: ShieldCheckIcon,
    keys: [
      "emailStatus",
      "emailVerifiedAt",
      "emailSource",
      "mxProvider",
      "mxCheckedAt",
    ],
  },
] as const;

export const ProspectEditor = ({
  prospect,
  seed,
  campaignCompany,
}: {
  prospect?: Prospect;
  seed?: Partial<ProspectInput>;
  campaignCompany?: { id: string; revision: number };
}) => {
  const messages = useMessages();
  const t = useTranslations("outbound");
  const router = useRouter();
  const mutation = useMutation();
  const findingTypes = {
    "product-published-data": messages.outbound.playbook.publishedProductTitle,
    "barcode-missing-from-page-data": messages.outbound.playbook.barcodeTitle,
    "rating-missing-from-page-data": messages.outbound.playbook.reviewsTitle,
    "barcode-not-observed": messages.outbound.playbook.noBarcodeTitle,
    "product-data-not-observed": messages.outbound.playbook.noProductTitle,
  };
  const config = fields(
    groups.flatMap((group) => [...group.keys]),
    messages.outbound.prospect.fields,
    {
      validators: prospectSchema.shape,
      invalid: t("common.invalidField"),
      descriptions: {
        country: t("prospect.countryHelp"),
        timezone: t("prospect.timeHelp"),
        roleCheckedAt: t("prospect.dateHelp"),
        evidenceCheckedAt: t("prospect.dateHelp"),
        emailVerifiedAt: t("prospect.dateHelp"),
        mxCheckedAt: t("prospect.dateHelp"),
        personalPublishedAt: t("prospect.dateHelp"),
        personalCheckedAt: t("prospect.dateHelp"),
        legitEvidence: t("prospect.legitHelp"),
        productCategory: t("prospect.productCategoryHelp"),
        reviewCount: t("prospect.reviewCountHelp"),
        distributionSource: t("prospect.distributionSourceHelp"),
        findingReviewed: t("prospect.findingReviewedHelp"),
      },
      errors: {
        company: t("common.required"),
        name: t("common.required"),
        country: t("prospect.countryHelp"),
        email: t("common.invalidEmail"),
        roleCheckedAt: t("prospect.dateHelp"),
        evidenceCheckedAt: t("prospect.dateHelp"),
        emailVerifiedAt: t("prospect.dateHelp"),
        mxCheckedAt: t("prospect.dateHelp"),
        personalPublishedAt: t("prospect.dateHelp"),
        personalCheckedAt: t("prospect.dateHelp"),
      },
      multiline: [
        "finding",
        "evidence",
        "personalLine",
        "legitEvidence",
        "notes",
      ],
      booleans: ["findingReviewed"],
      choices: {
        gap: {
          "": t("prospect.noFinding"),
          ...findingTypes,
          ...(prospect?.gap && !Object.hasOwn(findingTypes, prospect.gap)
            ? { [prospect.gap]: t("prospect.unsupportedFinding") }
            : {}),
        },
        platform: messages.outbound.platforms,
        relationship: messages.outbound.relationships,
        emailStatus: Object.fromEntries(
          EMAIL_STATUSES.map((key) => [key, messages.outbound.status[key]]),
        ),
        mxProvider: messages.outbound.emailHosts,
        lang: messages.outbound.languages,
      },
    },
  );
  const defaults = prospect ?? {
    ...Object.fromEntries(Object.keys(config).map((key) => [key, ""])),
    platform: "unknown",
    relationship: "cold",
    emailStatus: "unknown",
    mxProvider: "unknown",
    lang: "en",
    ...seed,
    findingReviewed: false,
  };
  return (
    <InferredForm
      key={prospect ? `${prospect.id}-${prospect.revision}` : "new"}
      config={config}
      defaultValues={defaults}
      renderFields={false}
      onSubmit={(values) =>
        mutation.run(
          () =>
            campaignCompany
              ? Outbound.saveCampaignProspect({
                  company: campaignCompany.id,
                  revision: campaignCompany.revision,
                  prospect: prospectSchema.parse({
                    ...values,
                    id: prospect?.id,
                  }),
                })
              : Outbound.saveProspect(
                  prospectSchema.parse({ ...values, id: prospect?.id }),
                ),
          (saved) => {
            if (!prospect && saved?.prospect)
              router.replace(`/prospects/${saved.prospect}`);
          },
        )
      }
    >
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <section
            key={group.title}
            className="grid gap-6 border-accent-foreground border-b px-4 py-7 last-of-type:border-b-0 sm:px-6 xl:grid-cols-[15rem_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              <h2 className="mb-3 flex items-center gap-2.5 font-semibold text-base text-foreground-rich">
                <Icon aria-hidden className="size-4 text-foreground-dimmed" />
                {t(`prospect.${group.title}`)}
              </h2>
              {group.title === "verificationTitle" && (
                <p className="text-foreground-dimmed text-sm leading-6">
                  {t("prospect.verificationHelp")}
                </p>
              )}
              {group.title === "evidenceTitle" && (
                <p className="text-foreground-dimmed text-sm leading-6">
                  {t("prospect.findingHelp")}
                </p>
              )}
              {group.title === "personalTitle" && (
                <p className="text-foreground-dimmed text-sm leading-6">
                  {t("prospect.personalHelp")}
                </p>
              )}
            </div>
            <div className="grid min-w-0 max-w-4xl gap-5 sm:grid-cols-2">
              {group.keys.map((key) => (
                <InferredFormField {...config[key]} key={key} name={key} />
              ))}
            </div>
          </section>
        );
      })}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-4 border-accent-foreground border-t bg-background-rich/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <Submit pending={mutation.pending}>
          <CheckBadgeIcon aria-hidden className="size-4" />
          {t("prospect.action.primary")}
        </Submit>
        {prospect && (
          <Button
            type="button"
            variant="soft"
            color="neutral"
            render={<Link href={sentHref({ prospect: prospect.id })} />}
          >
            {t("prospect.progress.action.secondary")}
          </Button>
        )}
        {prospect && (
          <Button
            type="button"
            variant="soft"
            color="neutral"
            disabled={mutation.pending}
            onClick={() =>
              mutation.run(() =>
                Outbound.generateDrafts({ prospect: prospect.id }),
              )
            }
          >
            {t("prospect.action.secondary")}
          </Button>
        )}
        <Notice value={mutation.notice} />
      </div>
    </InferredForm>
  );
};
