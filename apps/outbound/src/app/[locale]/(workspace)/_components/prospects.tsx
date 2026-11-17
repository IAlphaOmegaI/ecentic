"use client";

import {
  ArrowRightIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileSearchIcon,
  FilterIcon,
  OfficeIcon,
  PlusIcon,
  QuoteIcon,
  SearchIcon,
  ShieldCheckIcon,
  UploadIcon,
  XIcon,
} from "@zenncore/icons";
import { Avatar, AvatarFallback } from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@zenncore/web/components/dialog";
import {
  field,
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  EMAIL_STATUSES,
  LINKEDIN_STATUSES,
  PROSPECT_STATUSES,
  type Prospect,
  type ProspectInput,
  prospectSchema,
} from "@/lib/outbound";
import {
  PROSPECT_LIFECYCLES,
  type ProspectProgress,
  prospectLifecycles,
} from "@/lib/outbound-prospect-progress";
import { sentHref } from "@/lib/outbound-sent";
import * as Outbound from "@/server/app/outbound";
import {
  Empty,
  fields,
  Multiline,
  Notice,
  Status,
  Submit,
  useMutation,
} from "./common";
import { PreparationBatch } from "./preparation";

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

export const ProspectEmailProgress = ({
  prospect,
  progress,
}: {
  prospect: Prospect;
  progress?: ProspectProgress;
}) => {
  const t = useTranslations("outbound.prospect.progress");
  return (
    <div className="space-y-1">
      <Status value={prospect.status} />
      {prospectLifecycles(prospect, progress)
        .filter((value) => !["replied", "held"].includes(value))
        .map((value) => (
          <p key={value} className="text-foreground-dimmed text-xs">
            {t(`lifecycle.${value}`)}
          </p>
        ))}
    </div>
  );
};

export const ProspectList = ({
  prospects,
  target,
  progress,
  automationEnabled,
}: {
  prospects: Prospect[];
  target: number;
  progress: ProspectProgress[] | null;
  automationEnabled: boolean;
}) => {
  const t = useTranslations("outbound");
  const router = useRouter();
  const progressById = new Map(
    (progress ?? []).map((entry) => [entry.prospectId, entry]),
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [linkedin, setLinkedin] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = prospects.filter(
    (prospect) =>
      (status === "all" || prospect.status === status) &&
      (linkedin === "all" ||
        (Boolean(prospect.linkedinUrl) &&
          prospect.linkedinStatus === linkedin)) &&
      (lifecycle === "all" ||
        prospectLifecycles(prospect, progressById.get(prospect.id)).some(
          (value) => value === lifecycle,
        )) &&
      `${prospect.company} ${prospect.name} ${prospect.email} ${prospect.domain}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const pageSize = 50;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1),
  );
  const rows = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const activeFilter =
    search.length > 0 ||
    status !== "all" ||
    lifecycle !== "all" ||
    linkedin !== "all";
  const statusItems = [
    { value: "all", label: t("prospect.list.allStatuses") },
    ...PROSPECT_STATUSES.map((value) => ({
      value,
      label: t(`status.${value}`),
    })),
  ];
  const lifecycleItems = [
    { value: "all", label: t("prospect.progress.allLifecycle") },
    ...PROSPECT_LIFECYCLES.map((value) => ({
      value,
      label: t(`prospect.progress.lifecycle.${value}`),
    })),
  ];
  const linkedinItems = [
    { value: "all", label: t("prospect.progress.allLinkedin") },
    ...LINKEDIN_STATUSES.map((value) => ({
      value,
      label: t(`linkedin.status.${value}`),
    })),
  ];
  const clear = () => {
    setSearch("");
    setStatus("all");
    setLifecycle("all");
    setLinkedin("all");
    setPage(0);
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <p className="font-medium text-foreground-rich text-sm tabular-nums">
          {t("prospect.list.count", { count: prospects.length })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="soft"
            color="neutral"
            onClick={() => router.refresh()}
          >
            {t("prospect.progress.action.primary")}
          </Button>
          <Button variant="soft" color="neutral" render={<Link href="/sent" />}>
            {t("nav.sent")}
          </Button>
          <Dialog>
            <DialogTrigger render={<Button variant="soft" color="neutral" />}>
              <UploadIcon aria-hidden className="size-4" />
              {t("import.action.primary")}
            </DialogTrigger>
            <DialogPopup
              className="z-50 mt-0 max-h-[85dvh] w-2xl overflow-y-auto bg-background-rich p-0"
              classList={{ backdrop: "z-50" }}
            >
              <div className="flex items-start gap-4 border-accent-foreground border-b p-6">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="m-0 font-semibold text-xl">
                    {t("import.title")}
                  </DialogTitle>
                  <DialogDescription className="mt-2 mb-0 text-sm leading-6">
                    {t("import.description")}
                  </DialogDescription>
                </div>
                <DialogClose
                  render={
                    <Button variant="ghost" color="neutral" size="icon" />
                  }
                  aria-label={t("prospect.list.action.quaternary")}
                >
                  <XIcon aria-hidden className="size-4" />
                </DialogClose>
              </div>
              <ImportForm />
            </DialogPopup>
          </Dialog>
          <Button render={<Link href="/prospects/new" />}>
            <PlusIcon aria-hidden className="size-4" />
            {t("prospect.newTitle")}
          </Button>
        </div>
        {!automationEnabled && (
          <PreparationBatch prospects={prospects} target={target} />
        )}
      </div>
      <div className="space-y-2 border-accent-foreground border-b px-4 py-3 sm:px-6">
        <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
          {t("prospect.progress.help")}
        </p>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href="/campaigns" />}
        >
          {t("prospect.progress.action.tertiary")}
        </Button>
        {progress === null && (
          <p role="alert" className="text-error text-sm">
            {t("prospect.progress.error")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-accent-foreground border-b px-4 py-3 sm:px-6">
        <div className="min-w-48 max-w-sm flex-1">
          <TextField
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
          >
            <SearchIcon
              aria-hidden
              className="ml-3 size-4 shrink-0 text-foreground-dimmed"
            />
            <TextFieldInput
              aria-label={t("prospect.search")}
              placeholder={t("prospect.search")}
              className="text-sm"
            />
          </TextField>
        </div>
        <Select
          items={statusItems}
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all");
            setPage(0);
          }}
        >
          <SelectTrigger
            aria-label={t("prospect.list.filter")}
            className="min-w-44 text-sm"
            classList={{ icon: { icon: "size-4" } }}
          >
            <FilterIcon aria-hidden className="size-4 text-foreground-dimmed" />
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup className="min-w-48">
              {statusItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
        {[
          {
            key: "lifecycle",
            value: lifecycle,
            setter: setLifecycle,
            items: lifecycleItems,
            label: t("prospect.progress.lifecycleFilter"),
          },
          {
            key: "linkedin",
            value: linkedin,
            setter: setLinkedin,
            items: linkedinItems,
            label: t("prospect.progress.linkedinFilter"),
          },
        ].map((filter) => (
          <Select
            key={filter.key}
            items={filter.items}
            value={filter.value}
            onValueChange={(value) => {
              filter.setter(value ?? "all");
              setPage(0);
            }}
          >
            <SelectTrigger
              aria-label={filter.label}
              className="min-w-44 text-sm"
              disabled={filter.key === "lifecycle" && progress === null}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner align="start" className="z-40">
              <SelectPopup className="min-w-48">
                {filter.items.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="text-sm"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </Select>
        ))}
        {activeFilter && (
          <Button variant="soft" color="neutral" onClick={clear}>
            <XIcon aria-hidden className="size-3.5" />
            {t("prospect.list.action.tertiary")}
          </Button>
        )}
      </div>
      {rows.length ? (
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-240 table-fixed [&_td]:font-normal">
            <TableHeader>
              <TableRow>
                {[
                  { key: "company", label: t("prospect.fields.company") },
                  { key: "name", label: t("prospect.fields.name") },
                  { key: "email", label: t("prospect.fields.email") },
                  {
                    key: "review",
                    label: t("prospect.progress.emailProgress"),
                  },
                  { key: "linkedin", label: t("nav.linkedin") },
                  { key: "sent", label: t("nav.sent") },
                ].map(({ key, label }) => (
                  <TableHead
                    key={key}
                    className="h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal sm:px-6"
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className="group hover:bg-background/70"
                >
                  <TableCell className="px-4 py-3 sm:px-6">
                    <Link
                      href={`/prospects/${prospect.id}`}
                      className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <Avatar className="size-9 shrink-0 rounded-lg border border-accent-foreground bg-background text-foreground-dimmed">
                        <AvatarFallback className="text-sm">
                          {prospect.company.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground-rich group-hover:text-primary-text">
                          {prospect.company}
                        </span>
                        <span className="mt-0.5 block truncate text-foreground-dimmed text-xs">
                          {prospect.domain}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <p className="truncate text-sm">{prospect.name}</p>
                    <p className="mt-0.5 truncate text-foreground-dimmed text-xs">
                      {prospect.title}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <p className="truncate text-foreground-dimmed text-sm">
                      {prospect.email || t("common.emptyValue")}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <ProspectEmailProgress
                        prospect={prospect}
                        progress={progressById.get(prospect.id)}
                      />
                      <Link
                        href={`/prospects/${prospect.id}`}
                        aria-label={`${t("prospect.editTitle")}: ${prospect.company}`}
                        className="shrink-0 rounded-sm p-1 text-foreground-dimmed hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <ArrowRightIcon aria-hidden className="size-4" />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    {prospect.linkedinUrl ? (
                      <span className="text-sm">
                        {t(`linkedin.status.${prospect.linkedinStatus}`)}
                      </span>
                    ) : (
                      t("common.emptyValue")
                    )}
                  </TableCell>
                  <TableCell className="px-4 sm:px-6">
                    <Button
                      variant="soft"
                      color="neutral"
                      render={
                        <Link
                          href={sentHref({ prospect: prospect.id })}
                          prefetch={false}
                        />
                      }
                    >
                      {t("prospect.progress.action.secondary")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty
          title={t(
            activeFilter ? "prospect.searchEmptyTitle" : "prospect.emptyTitle",
          )}
          description={t(
            activeFilter
              ? "prospect.searchEmptyDescription"
              : "prospect.emptyDescription",
          )}
        >
          {activeFilter && (
            <Button variant="soft" color="neutral" onClick={clear}>
              {t("prospect.list.action.tertiary")}
            </Button>
          )}
        </Empty>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-3 sm:px-6">
        <p
          aria-live="polite"
          className="text-foreground-dimmed text-xs tabular-nums"
        >
          {t("prospect.list.range", {
            start: filtered.length ? currentPage * pageSize + 1 : 0,
            end: Math.min((currentPage + 1) * pageSize, filtered.length),
            total: filtered.length,
          })}
        </p>
        <nav
          aria-label={t("prospect.list.pagination")}
          className="flex items-center gap-2"
        >
          <Button
            variant="soft"
            color="neutral"
            size="icon"
            disabled={currentPage === 0}
            aria-label={t("prospect.list.action.primary")}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Button>
          <Button
            variant="soft"
            color="neutral"
            size="icon"
            disabled={(currentPage + 1) * pageSize >= filtered.length}
            aria-label={t("prospect.list.action.secondary")}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </nav>
      </div>
    </>
  );
};

const ImportForm = () => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const [summary, setSummary] = useState<
    | Extract<
        Awaited<ReturnType<typeof Outbound.importProspects>>,
        { success: true }
      >["data"]
    | null
  >(null);
  return (
    <div className="p-6">
      <InferredForm
        config={{
          content: field({
            shape: "custom",
            Component: Multiline,
            validator: z
              .string({ error: t("common.required") })
              .trim()
              .min(1, { error: t("common.required") })
              .max(2_000_000, { error: t("import.help") }),
            label: t("import.fields.content"),
            description: t("import.help"),
          }),
        }}
        defaultValues={{ content: "" }}
        onSubmit={({ content }) => {
          setSummary(null);
          return mutation.run(
            () => Outbound.importProspects({ content }),
            (saved) => setSummary(saved ?? null),
          );
        }}
        className="space-y-5"
      >
        <Submit pending={mutation.pending}>{t("import.action.primary")}</Submit>
        <Notice value={summary ? null : mutation.notice} />
        {summary && (
          <div className="space-y-4" role="status">
            <p className="text-foreground-dimmed text-sm">
              {t("import.summary", {
                imported: summary.imported,
                duplicate: summary.duplicate,
                suppressed: summary.suppressed,
                invalid: summary.invalid,
              })}
            </p>
            {summary.errors.length > 0 && (
              <ul className="list-disc space-y-2 pl-4 text-error text-sm">
                {summary.errors.map(({ row }) => (
                  <li key={row}>{t("import.rowError", { row })}</li>
                ))}
              </ul>
            )}
            {summary.invalid > summary.errors.length && (
              <p className="text-error text-sm">
                {t("import.moreErrors", {
                  count: summary.invalid - summary.errors.length,
                })}
              </p>
            )}
          </div>
        )}
      </InferredForm>
    </div>
  );
};
