"use client";

import { CheckIcon } from "@zenncore/icons";
import {
  DataTable,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { useTranslations } from "next-intl";

type Status = "yes" | "no" | "partial";

type Capability = {
  _id: string;
  labelKey:
    | "aiReady"
    | "brandMentions"
    | "agentPurchasing"
    | "winRate"
    | "optimizedListings"
    | "modelUpdates";
  audit: Status;
  geo: Status;
  ecentic: Status;
};

const capabilities: Capability[] = [
  {
    _id: "ai-ready",
    labelKey: "aiReady",
    audit: "yes",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "brand-mentions",
    labelKey: "brandMentions",
    audit: "no",
    geo: "yes",
    ecentic: "yes",
  },
  {
    _id: "agent-purchasing",
    labelKey: "agentPurchasing",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "win-rate",
    labelKey: "winRate",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "optimized-listings",
    labelKey: "optimizedListings",
    audit: "partial",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "model-updates",
    labelKey: "modelUpdates",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
];

const StatusCell = ({
  status,
  partialLabel,
}: {
  status: Status;
  partialLabel: string;
}) => {
  switch (status) {
    case "yes":
      return <CheckIcon className="mx-auto size-4 text-primary" />;
    case "partial":
      return (
        <span className="flex w-full items-center justify-center text-center font-body font-light text-foreground-dimmed text-lg">
          {partialLabel}
        </span>
      );
    case "no":
      return (
        <span className="flex w-full items-center justify-center text-center text-foreground-dimmed text-lg">
          —
        </span>
      );
  }
};

export const Comparison = () => {
  const translate = useTranslations("home");
  const partialLabel = translate("comparison.states.partial");

  const columns = [
    {
      accessorKey: "label",
      header: () => (
        <span className="flex w-full min-w-48 text-left text-lg md:min-w-82">
          {translate("comparison.table.capabilities")}
        </span>
      ),
      cell: ({ row }: { row: { original: Capability } }) => (
        <span className="flex w-full min-w-48 text-left text-lg md:min-w-82">
          {translate(`comparison.rows.${row.original.labelKey}.label`)}
        </span>
      ),
    },
    {
      accessorKey: "audit",
      cell: ({ row }: { row: { original: Capability } }) => (
        <StatusCell status={row.original.audit} partialLabel={partialLabel} />
      ),
      header: () => (
        <span className="flex w-full min-w-20 justify-center text-center text-lg md:min-w-32">
          {translate("comparison.table.auditTools")}
        </span>
      ),
    },
    {
      accessorKey: "geo",
      cell: ({ row }: { row: { original: Capability } }) => (
        <StatusCell status={row.original.geo} partialLabel={partialLabel} />
      ),
      header: () => (
        <span className="flex w-full min-w-28 justify-center text-center text-lg md:min-w-48">
          {translate("comparison.table.geoMonitoring")}
        </span>
      ),
    },
    {
      accessorKey: "ecentic",
      header: () => (
        <span className="flex w-full min-w-20 justify-center text-center text-lg text-primary lowercase md:min-w-32">
          {translate("comparison.table.ecentic")}
        </span>
      ),
      cell: ({ row }: { row: { original: Capability } }) => (
        <StatusCell status={row.original.ecentic} partialLabel={partialLabel} />
      ),
    },
  ];

  return (
    <section className="relative -left-[calc(50vw-50%)] w-screen p-2">
      <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-background-rich p-4 md:gap-8 md:p-20">
        <div className="relative mx-auto max-w-6xl px-2 md:px-12">
          <h2 className="text-center font-body font-medium text-3xl text-foreground md:text-5xl">
            {translate("comparison.title.primary")} <br />
            <span className="mt-1 text-primary">
              {translate("comparison.title.accent")}
            </span>
          </h2>
        </div>
        <div className="w-full max-w-6xl overflow-x-auto border-accent-foreground border-t">
          <DataTableProvider rows={capabilities} columns={columns}>
            <DataTable className="w-full" />
          </DataTableProvider>
        </div>
      </div>
    </section>
  );
};
