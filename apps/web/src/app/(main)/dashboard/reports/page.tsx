import {
  ArrowRightIcon,
  DocumentPdfIcon,
  DownloadIcon,
  ShareIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { Crosshair, SectionGutter, SectionKicker } from "../_components/grid";

const reports = [
  {
    _id: "r1",
    title: "Win Rate Summary",
    description: "Overall performance across all products and models",
    formats: ["PDF", "CSV"],
    tier: "all",
    lastGenerated: "Today, 2:00 PM",
  },
  {
    _id: "r2",
    title: "Product Performance",
    description:
      "Per-product detailed report with trends and competitor comparison",
    formats: ["PDF", "CSV"],
    tier: "compete",
    lastGenerated: "Yesterday",
  },
  {
    _id: "r3",
    title: "Competitor Analysis",
    description:
      "Full competitive landscape with battlecards for all tracked brands",
    formats: ["PDF"],
    tier: "compete",
    lastGenerated: "2 days ago",
  },
  {
    _id: "r4",
    title: "Optimization Impact",
    description: "Before/after analysis of all published optimizations",
    formats: ["PDF", "CSV"],
    tier: "compete",
    lastGenerated: "3 days ago",
  },
  {
    _id: "r5",
    title: "Category Benchmark",
    description: "How your category performs across the AI agent ecosystem",
    formats: ["PDF"],
    tier: "dominate",
    lastGenerated: "Last week",
  },
  {
    _id: "r6",
    title: "Model Drift History",
    description:
      "Historical log of all AI model behavior changes affecting your products",
    formats: ["CSV"],
    tier: "dominate",
    lastGenerated: "Last week",
  },
  {
    _id: "r7",
    title: "UCP Compliance Audit",
    description: "Full audit of UCP profile completeness and schema issues",
    formats: ["PDF"],
    tier: "dominate",
    lastGenerated: "Last week",
  },
] as const;

const TierBadge = ({ tier }: { tier: string }) => {
  const config = (() => {
    switch (tier) {
      case "all":
        return { label: "All plans", color: "text-primary" };
      case "compete":
        return { label: "Compete+", color: "text-foreground" };
      case "dominate":
        return { label: "Dominate+", color: "text-warning" };
      default:
        return { label: tier, color: "text-primary" };
    }
  })();

  return (
    <span
      className={cn(
        "font-medium text-xs uppercase tracking-[0.2em]",
        config.color,
      )}
    >
      {config.label}
    </span>
  );
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              <span className="size-2 bg-success" />
              {reports.length} report types available
            </div>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              Reports & Exports
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Download or schedule automated reports on your agent performance.
            </p>
          </div>
          <Button variant="outline" color="primary">
            Schedule Reports
          </Button>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-start gap-4 px-6 py-6 transition-colors hover:bg-background">
            <ShareIcon className="size-8 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-base text-foreground">
                Shareable Win Rate Report
              </p>
              <p className="mt-1 font-light text-foreground-dimmed text-sm">
                Generate a public URL for a beautifully formatted win rate
                report — designed for sharing on Twitter, LinkedIn, or with your
                team.
              </p>
              <Button variant="flat" color="primary" className="mt-3">
                Generate Shareable Report <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Library</SectionKicker>
            <p className="mt-2 font-medium text-2xl text-foreground">
              Available Reports
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <div
                key={report._id}
                className="flex flex-col bg-background-rich p-5 transition-colors hover:bg-background"
              >
                <div className="flex items-start justify-between">
                  <DocumentPdfIcon className="size-8 text-foreground-dimmed" />
                  <TierBadge tier={report.tier} />
                </div>
                <div className="mt-3 flex-1">
                  <p className="font-medium text-base text-foreground">
                    {report.title}
                  </p>
                  <p className="mt-1 font-light text-foreground-dimmed text-xs leading-relaxed">
                    {report.description}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="mb-2 font-light text-foreground-dimmed text-xs">
                    Last generated: {report.lastGenerated}
                  </p>
                  <div className="flex gap-2">
                    {report.formats.map((format) => (
                      <button
                        key={format}
                        type="button"
                        className="flex flex-1 items-center justify-center gap-1.5 border border-accent-foreground bg-background-dimmed px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-accent-foreground"
                      >
                        <DownloadIcon className="size-4" />
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>02 — Automation</SectionKicker>
            <p className="mt-2 font-medium text-2xl text-foreground">
              Scheduled Reports
            </p>
          </div>
          <div className="px-6 py-6">
            <p className="font-light text-foreground-dimmed">
              No scheduled reports configured.
            </p>
            <Button variant="outline" color="primary" className="mt-3">
              Set Up Weekly Digest
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
