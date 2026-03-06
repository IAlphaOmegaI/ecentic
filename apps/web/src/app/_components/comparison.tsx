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
      return <span className="text-blue-600">✓</span>;
    case "partial":
      return <span className="text-sm text-zinc-400">Partial</span>;
    case "no":
      return <span className="text-zinc-300">—</span>;
  }
};

export const Comparison = () => (
  <section className="px-10 py-8">
    <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-white px-14 py-16 shadow-sm">
      <h2 className="mb-14 text-center font-bold text-5xl text-zinc-900 leading-tight tracking-tight">
        Audits tell you what's broken.{" "}
        <span className="text-blue-600">ecentric fixes it.</span>
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-zinc-100 border-b">
            <th className="pb-4 text-left font-normal text-sm text-zinc-400">
              Capabilities
            </th>
            <th className="pb-4 text-center font-normal text-sm text-zinc-400">
              Audit Tools
            </th>
            <th className="pb-4 text-center font-normal text-sm text-zinc-400">
              GEO Monitoring
            </th>
            <th className="pb-4 text-center font-semibold text-blue-600 text-sm">
              ecentric
            </th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map(({ label, audit, geo, ecentric }) => (
            <tr key={label} className="border-zinc-100 border-b last:border-0">
              <td className="py-5 pr-8 text-sm text-zinc-700">{label}</td>
              <td className="py-5 text-center text-base">
                <StatusCell status={audit} />
              </td>
              <td className="py-5 text-center text-base">
                <StatusCell status={geo} />
              </td>
              <td className="rounded-sm bg-blue-50 py-5 text-center text-base">
                <StatusCell status={ecentric} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
