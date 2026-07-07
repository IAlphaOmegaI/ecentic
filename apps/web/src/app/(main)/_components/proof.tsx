import { Counter } from "./counter";

const stats = [
  {
    value: "+15%",
    label: "AI-agent visits for DUA Flavours in 30 days",
    source: "Ecentic customer",
  },
  {
    value: "+12%",
    label: "sales for DUA Flavours in 30 days",
    source: "Ecentic customer",
  },
  {
    value: "31%",
    label: "higher conversion from AI-referred shoppers",
    source: "Salesforce, 2025",
  },
  {
    value: "13%",
    label: "sales growth for stores built for AI agents (vs 2% without)",
    source: "Adobe / Bain",
  },
] as const;

export const Proof = () => (
  <section className="flex flex-col gap-10 px-4 py-16">
    <h2 className="max-w-5xl text-balance font-body font-medium text-3xl text-foreground md:text-5xl">
      AI is already sending shoppers. The only question is whether they land on
      you.
    </h2>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex flex-col gap-2">
          <Counter
            value={stat.value}
            delay={index * 0.1}
            className="font-body font-semibold text-4xl text-primary"
          />
          <span className="text-foreground">{stat.label}</span>
          <span className="text-foreground-dimmed text-xs">{stat.source}</span>
        </div>
      ))}
    </div>
  </section>
);
