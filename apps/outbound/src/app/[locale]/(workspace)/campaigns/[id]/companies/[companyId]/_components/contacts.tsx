"use client";

import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CampaignCompany } from "@/lib/outbound-campaigns";
import * as Contacts from "@/server/app/outbound/campaign-contacts";
import type { Person } from "@/server/utils/outbound/providers";
import { Notice, useMutation } from "../../../../../_components/common";
import { ProspectEditor } from "../../../../../_components/prospects";

const column = createColumnHelper<Person & { _id: string }>();

export const ContactResearch = ({
  company,
  campaign,
}: {
  company: Pick<
    CampaignCompany,
    "id" | "name" | "domain" | "website" | "country" | "platform" | "source"
  >;
  campaign: { id: string; revision: number };
}) => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const search = (requested: number) =>
    mutation.run(
      () =>
        Contacts.searchPeople({
          campaign: campaign.id,
          company: company.id,
          page: requested,
        }),
      (data) => {
        if (!data) return;
        setPeople(data.people);
        setPage(data.page);
        setTotal(data.total);
        setSearched(true);
      },
    );
  const columns = [
    column.accessor("name", {
      header: t("prospect.fields.name"),
      cell: ({ getValue }) => (
        <p className="truncate font-medium text-foreground-rich">
          {getValue()}
        </p>
      ),
    }),
    column.accessor("title", {
      header: t("prospect.fields.title"),
      cell: ({ getValue }) => (
        <p className="truncate text-foreground-dimmed" title={getValue()}>
          {getValue()}
        </p>
      ),
    }),
    column.display({
      id: "choose",
      header: "",
      meta: { className: "w-44" },
      cell: ({ row }) => (
        <Button
          variant="soft"
          color="neutral"
          onClick={() => setSelected(row.original)}
        >
          {t("campaigns.chooseContact")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      ),
    }),
  ];
  return (
    <>
      <section className="border-accent-foreground border-b">
        <div className="space-y-4 px-4 py-6 sm:px-6">
          <p className="max-w-2xl text-foreground-dimmed text-sm leading-6">
            {t("campaigns.contactSearchHelp")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={mutation.pending} onClick={() => search(1)}>
              <SearchIcon aria-hidden className="size-4" />
              {t("campaigns.findContacts")}
            </Button>
            <Button
              variant="soft"
              color="neutral"
              onClick={() => setSelected(null)}
            >
              {t("campaigns.manualContact")}
            </Button>
          </div>
          <Notice value={mutation.notice} />
        </div>
        {searched && (
          <DataTableProvider
            rows={people.map((person) => ({ ...person, _id: person.id }))}
            columns={columns}
            handler="server"
            pageIndex={page}
            pageSize={25}
            rowCount={total ?? people.length}
          >
            <div className="max-w-full overflow-x-auto">
              <DataTable
                className="min-w-160 table-fixed"
                classList={{
                  "header-cell":
                    "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
                  "body-cell": "px-4 py-4 text-sm",
                  "body-row": "hover:bg-background/70",
                }}
              >
                <DataTableEmpty>
                  <p className="px-4 py-6 text-foreground-dimmed text-sm sm:px-6">
                    {t("campaigns.contactSearchEmpty")}
                  </p>
                </DataTableEmpty>
              </DataTable>
            </div>
          </DataTableProvider>
        )}
        {searched && (
          <div className="flex gap-2 px-4 py-4 sm:px-6">
            <Button
              variant="soft"
              color="neutral"
              disabled={mutation.pending || page <= 1}
              onClick={() => search(page - 1)}
              size="icon"
              aria-label={t("review.queue.previous")}
            >
              <ChevronLeftIcon aria-hidden className="size-4" />
            </Button>
            <Button
              variant="soft"
              color="neutral"
              disabled={
                mutation.pending ||
                page >= 100 ||
                (total === null ? people.length < 25 : page * 25 >= total)
              }
              onClick={() => search(page + 1)}
              size="icon"
              aria-label={t("review.queue.next")}
            >
              <ChevronRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        )}
      </section>
      {selected !== undefined && (
        <ProspectEditor
          key={selected?.id ?? "manual"}
          campaignCompany={{ id: company.id, revision: campaign.revision }}
          seed={{
            company: company.name,
            domain: company.domain,
            website: company.website,
            country: company.country ?? "",
            platform: company.platform ?? "unknown",
            name: selected?.name ?? "",
            first: selected?.first ?? "",
            title: selected?.title ?? "",
            linkedinUrl: selected?.linkedinUrl ?? "",
            source: `${company.source} company discovery`,
            email: "",
            emailStatus: "unknown",
            roleSource: selected?.linkedinUrl ?? "",
            roleCheckedAt: "",
          }}
        />
      )}
    </>
  );
};
