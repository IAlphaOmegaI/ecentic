"use client";

import { CheckIcon } from "@zenncore/icons";
import {
  DataTable,
  DataTableProvider,
} from "@zenncore/web/components/data-table";

type Status = "yes" | "no" | "partial";

type Capability = {
  _id: string;
  label: string;
  audit: Status;
  geo: Status;
  ecentic: Status;
};

const capabilities: Capability[] = [
  {
    _id: "ai-ready",
    label: 'Tells you if products are "AI-ready"',
    audit: "yes",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "brand-mentions",
    label: "Tracks brand mentions in AI agent search",
    audit: "no",
    geo: "yes",
    ecentic: "yes",
  },
  {
    _id: "agent-purchasing",
    label: "Simulates actual agent purchasing",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "win-rate",
    label: "Measures win rate vs. specific competitors",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "optimized-listings",
    label: "Auto-generates optimized listings",
    audit: "partial",
    geo: "no",
    ecentic: "yes",
  },
  {
    _id: "model-updates",
    label: "Re-optimizes when models update",
    audit: "no",
    geo: "no",
    ecentic: "yes",
  },
];

const StatusCell = ({ status }: { status: Status }) => {
  switch (status) {
    case "yes":
      return <CheckIcon className="mx-auto size-4 text-primary" />;
    case "partial":
      return (
        <span className="font-body font-light text-foreground-dimmed text-lg text-center w-full flex items-center justify-center">
          Partial
        </span>
      );
    case "no":
      return (
        <span className="text-foreground-dimmed text-lg text-center w-full flex items-center justify-center">
          —
        </span>
      );
  }
};

const columns = [
  {
    accessorKey: "label",
    header: () => (
      <span className="flex w-full min-w-48 text-left text-lg md:min-w-82">
        Capabilities
      </span>
    ),
    cell: ({ row }: { row: { original: Capability } }) => (
      <span className="flex w-full min-w-48 text-left text-lg md:min-w-82">
        {row.original.label}
      </span>
    ),
  },
  {
    accessorKey: "audit",
    cell: ({ row }: { row: { original: Capability } }) => (
      <StatusCell status={row.original.audit} />
    ),
    header: () => (
      <span className="flex w-full min-w-20 justify-center text-center text-lg md:min-w-32">
        Audit Tools
      </span>
    ),
  },
  {
    accessorKey: "geo",
    cell: ({ row }: { row: { original: Capability } }) => (
      <StatusCell status={row.original.geo} />
    ),
    header: () => (
      <span className="flex w-full min-w-28 justify-center text-center text-lg md:min-w-48">
        GEO Monitoring
      </span>
    ),
  },
  {
    accessorKey: "ecentic",
    header: () => (
      <span className="flex w-full min-w-20 justify-center text-center text-lg text-primary lowercase md:min-w-32">
        écentic
      </span>
    ),
    cell: ({ row }: { row: { original: Capability } }) => (
      <StatusCell status={row.original.ecentic} />
    ),
  },
];

export const Comparison = () => (
  <section className="relative -left-[calc(50vw-50%)] w-screen p-2">
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-background-rich p-4 md:gap-8 md:p-20">
      <div className="relative mx-auto max-w-6xl px-2 md:px-12">
        <h2 className="text-center font-body font-medium text-3xl text-foreground md:text-5xl">
          Audits tell you what's broken. <br />
          <span className="mt-1 text-primary">
            ecentic writes and ships the fix.
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
