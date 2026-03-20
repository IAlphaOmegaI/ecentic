import { DocumentPdfIcon, DownloadIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";

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
        return { label: "All plans", color: "bg-primary/10 text-primary" };
      case "compete":
        return { label: "Compete+", color: "bg-foreground/10 text-foreground" };
      case "dominate":
        return { label: "Dominate+", color: "bg-warning/10 text-warning" };
      default:
        return { label: tier, color: "bg-primary/10 text-primary" };
    }
  })();

  return (
    <span className={cn("px-1.5 py-0.5 font-medium text-xs", config.color)}>
      {config.label}
    </span>
  );
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-center justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-3xl text-foreground">
              Reports & Exports
            </h1>
            <p className="font-light text-foreground-dimmed text-sm">
              Download or schedule automated reports on your agent performance.
            </p>
          </div>
          <button
            type="button"
            className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
          >
            Schedule Reports
          </button>
        </div>
      </div>

      {/* Featured shareable report */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8">
          <div className="flex items-start gap-3 bg-primary/5 px-6 py-6">
            <div className="flex size-8 shrink-0 items-center justify-center bg-primary/10 font-bold text-primary text-sm">
              ↗
            </div>
            <div>
              <p className="font-medium text-base text-foreground">
                Shareable Win Rate Report
              </p>
              <p className="font-light text-foreground-dimmed text-xs">
                Generate a public URL for a beautifully formatted win rate
                report — designed for sharing on Twitter, LinkedIn, or with your
                team.
              </p>
              <button
                type="button"
                className="mt-2 bg-primary px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-primary/90"
              >
                Generate Shareable Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report cards grid */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <div key={report._id} className="flex flex-col bg-background p-4">
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
                      <DownloadIcon className="size-3" />
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled reports */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-6">
          <p className="mb-3 font-medium text-base text-foreground">
            Scheduled Reports
          </p>
          <p className="font-light text-foreground-dimmed text-sm">
            No scheduled reports configured.
          </p>
          <button
            type="button"
            className="mt-3 border border-primary px-3 py-1.5 font-medium text-primary text-sm transition-colors hover:bg-primary/10"
          >
            Set Up Weekly Digest
          </button>
        </div>
      </div>
    </div>
  </div>
);
