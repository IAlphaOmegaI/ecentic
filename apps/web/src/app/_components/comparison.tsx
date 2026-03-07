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
  ecentric: Status;
};

const capabilities: Capability[] = [
  {
    _id: "ai-ready",
    label: 'Tells you if products are "AI-ready"',
    audit: "yes",
    geo: "no",
    ecentric: "yes",
  },
  {
    _id: "brand-mentions",
    label: "Tracks brand mentions in AI search",
    audit: "no",
    geo: "yes",
    ecentric: "yes",
  },
  {
    _id: "agent-purchasing",
    label: "Simulates actual agent purchasing",
    audit: "no",
    geo: "no",
    ecentric: "yes",
  },
  {
    _id: "win-rate",
    label: "Measures win rate vs. specific competitors",
    audit: "no",
    geo: "no",
    ecentric: "yes",
  },
  {
    _id: "optimized-listings",
    label: "Auto-generates optimized listings",
    audit: "partial",
    geo: "no",
    ecentric: "yes",
  },
  {
    _id: "model-updates",
    label: "Re-optimizes when models update",
    audit: "no",
    geo: "no",
    ecentric: "yes",
  },
];

const StatusCell = ({ status }: { status: Status }) => {
  switch (status) {
    case "yes":
      return <span className="text-primary">✓</span>;
      return <CheckIcon className="mx-auto size-4 text-primary" />;
    case "partial":
      return (
        <span className="font-light text-foreground-dimmed text-sm">
          Partial
        </span>
      );
      return (
        <span className="font-body font-light text-foreground-dimmed text-sm">
          Partial
        </span>
      );
    case "no":
      return <span className="text-foreground-dimmed">—</span>;
  }
};
return <span className="text-foreground">—</span>;
}
}

const columns = [
  {
    accessorKey: "label",
    header: () => (
      <span className="text-left w-full min-w-82 w-82 flex">Capabilities</span>
    ),
    cell: ({ row }: { row: { original: Capability } }) => (
      <span className="text-left w-full text-lg flex">
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
      <span className="w-32 min-w-32 flex justify-center">Audit Tools</span>
    ),
  },
  {
    accessorKey: "geo",
    cell: ({ row }: { row: { original: Capability } }) => (
      <StatusCell status={row.original.geo} />
    ),
    header: () => (
      <span className="w-48 min-w-48 flex justify-center">GEO Monitoring</span>
    ),
  },
  {
    accessorKey: "écentic",
    header: () => (
      <span className="text-primary w-32 min-w-32 flex justify-center">
        ecetric
      </span>
    ),
    cell: ({ row }: { row: { original: Capability } }) => (
      <StatusCell status={row.original.ecentric} />
    ),
  },
];

export const Comparison = () => (
  <section className="px-10 py-8">
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-10 text-center font-medium text-3xl text-foreground leading-tight">
        Audits tell you what's broken.{" "}
        <span className="text-primary">écentic fixes it.</span>
      </h2>
      <table className="w-full border-collapse border border-accent-foreground">
        <thead>
          <tr className="border-accent-foreground border-b">
            <th className="px-6 py-4 text-left font-light text-foreground-dimmed text-sm">
              Capabilities
            </th>
            <th className="px-6 py-4 text-center font-light text-foreground-dimmed text-sm">
              Audit Tools
            </th>
            <th className="px-6 py-4 text-center font-light text-foreground-dimmed text-sm">
              GEO Monitoring
            </th>
            <th className="bg-primary/5 px-6 py-4 text-center font-medium text-primary text-sm">
              écentic
            </th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map(({ label, audit, geo, ecentric }) => (
            <tr key={label} className="border-accent-foreground border-b last:border-0">
              <td className="px-6 py-4 font-light text-foreground text-sm">{label}</td>
              <td className="px-6 py-4 text-center text-base">
                <StatusCell status={audit} />
              </td>
              <td className="px-6 py-4 text-center text-base">
                <StatusCell status={geo} />
              </td>
              <td className="bg-primary/5 px-6 py-4 text-center text-base">
                <StatusCell status={ecentric} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  <section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground p-2 h-screen">
    <div className="bg-background-rich rounded-xl size-full p-12 md:p-20 flex flex-col items-center justify-center gap-8">
      <div className="relative mx-auto max-w-6xl border-accent-foreground px-6 md:px-12">
        <h2 className="font-body font-medium text-3xl md:text-5xl text-center">
          Audits tell you what's broken. <br />
          <span className="text-primary">ecentric fixes it.</span>
        </h2>
      </div>
      <div className="mx-auto max-w-6xl border-accent-foreground border-t">
        <DataTableProvider rows={capabilities} columns={columns}>
          <DataTable className="w-full" />
        </DataTableProvider>
      </div>
    </div>
  </section>
);
