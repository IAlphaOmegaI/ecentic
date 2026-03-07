type Status = "yes" | "no" | "partial";

const capabilities = [
  {
    label: 'Tells you if products are "AI-ready"',
    audit: "yes" as Status,
    geo: "no" as Status,
    ecentric: "yes" as Status,
  },
  {
    label: "Tracks brand mentions in AI search",
    audit: "no" as Status,
    geo: "yes" as Status,
    ecentric: "yes" as Status,
  },
  {
    label: "Simulates actual agent purchasing",
    audit: "no" as Status,
    geo: "no" as Status,
    ecentric: "yes" as Status,
  },
  {
    label: "Measures win rate vs. specific competitors",
    audit: "no" as Status,
    geo: "no" as Status,
    ecentric: "yes" as Status,
  },
  {
    label: "Auto-generates optimized listings",
    audit: "partial" as Status,
    geo: "no" as Status,
    ecentric: "yes" as Status,
  },
  {
    label: "Re-optimizes when models update",
    audit: "no" as Status,
    geo: "no" as Status,
    ecentric: "yes" as Status,
  },
] as const;

const StatusCell = ({ status }: { status: Status }) => {
  switch (status) {
    case "yes":
      return <span className="text-primary">✓</span>;
    case "partial":
      return <span className="font-light text-foreground-dimmed text-sm">Partial</span>;
    case "no":
      return <span className="text-foreground-dimmed">—</span>;
  }
};

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
    </div>
  </section>
);
