import { ArrowRightIcon, PlusIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { competitors } from "@/lib/mock-data";

const attributes = [
  "Battery life",
  "Warranty",
  "Price",
  "Shipping",
  "Return policy",
  "Material specs",
  "Dimensions",
  "Certification",
] as const;

const heatmapData: Record<string, Record<string, "win" | "tie" | "loss">> = {
  SoundMax: {
    "Battery life": "loss",
    Warranty: "loss",
    Price: "loss",
    Shipping: "loss",
    "Return policy": "tie",
    "Material specs": "win",
    Dimensions: "win",
    Certification: "tie",
  },
  EcoHome: {
    "Battery life": "win",
    Warranty: "win",
    Price: "win",
    Shipping: "tie",
    "Return policy": "loss",
    "Material specs": "win",
    Dimensions: "win",
    Certification: "win",
  },
  TechPro: {
    "Battery life": "loss",
    Warranty: "loss",
    Price: "tie",
    Shipping: "loss",
    "Return policy": "win",
    "Material specs": "win",
    Dimensions: "tie",
    Certification: "loss",
  },
  PrimeBrands: {
    "Battery life": "tie",
    Warranty: "win",
    Price: "win",
    Shipping: "loss",
    "Return policy": "win",
    "Material specs": "win",
    Dimensions: "win",
    Certification: "tie",
  },
};

const HeatCell = ({ result }: { result: "win" | "tie" | "loss" }) => {
  const config = (() => {
    switch (result) {
      case "win":
        return { bg: "bg-success/20 text-success", label: "W" };
      case "tie":
        return { bg: "bg-primary/10 text-primary", label: "=" };
      case "loss":
        return { bg: "bg-error/20 text-error", label: "L" };
    }
  })();

  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center text-xs font-bold",
        config.bg,
      )}
    >
      {config.label}
    </div>
  );
};

export default () => (
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-xl text-foreground">
          Competitor Intelligence
        </h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Tracking {competitors.length} brands · Updated 1 hour ago
        </p>
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
      >
        <PlusIcon className="size-3.5" />
        Add Competitor
      </button>
    </div>

    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Brands Tracked
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {competitors.length}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Winning Against
        </p>
        <p className="mt-1 font-semibold text-3xl text-success">
          {competitors.filter((c) => c.yourWinRate >= 50).length} of{" "}
          {competitors.length}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Most Dangerous
        </p>
        <p className="mt-1 font-medium text-foreground text-base">
          {
            competitors.reduce((worst, c) =>
              c.yourWinRate < worst.yourWinRate ? c : worst,
            ).brand
          }
        </p>
        <p className="font-light text-error text-xs">
          {
            competitors.reduce((worst, c) =>
              c.yourWinRate < worst.yourWinRate ? c : worst,
            ).yourWinRate
          }
          % win rate against them
        </p>
      </div>
    </div>

    <div className="mb-6 border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
        <p className="font-medium text-foreground text-sm">Competitor Brands</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse [&_th]:border-x [&_th]:border-accent-foreground [&_td]:border-x [&_td]:border-accent-foreground [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0">
          <thead>
            <tr className="border-accent-foreground border-b">
              {[
                "Brand",
                "Products",
                "Your Win Rate",
                "Their Strongest",
                "Your Strongest",
                "Last Updated",
                "",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => (
              <tr
                key={competitor._id}
                className="border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center bg-foreground/10 font-bold text-foreground text-xs">
                      {competitor.brand.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground text-sm">
                      {competitor.brand}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-foreground text-sm">
                  {competitor.productsTracked}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-accent-foreground h-1.5">
                      <div
                        className={cn(
                          "h-full",
                          competitor.yourWinRate >= 60
                            ? "bg-success"
                            : competitor.yourWinRate >= 30
                              ? "bg-warning"
                              : "bg-error",
                        )}
                        style={{ width: `${competitor.yourWinRate}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-medium text-xs",
                        competitor.yourWinRate >= 60
                          ? "text-success"
                          : competitor.yourWinRate >= 30
                            ? "text-warning"
                            : "text-error",
                      )}
                    >
                      {competitor.yourWinRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                  {competitor.theirStrongestAttribute}
                </td>
                <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                  {competitor.yourStrongestAttribute}
                </td>
                <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                  {competitor.lastUpdated}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-light text-primary text-xs hover:underline whitespace-nowrap"
                  >
                    View Battlecard <ArrowRightIcon className="size-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="mb-6 border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Attribute Heatmap
        </p>
        <p className="font-light text-foreground-dimmed text-xs">
          W = you win · = = tie · L = they win
        </p>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs border-collapse [&_th]:border-x [&_th]:border-accent-foreground [&_td]:border-x [&_td]:border-accent-foreground [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0">
          <thead>
            <tr>
              <th className="pr-4 text-left font-medium text-foreground-dimmed text-xs">
                Attribute
              </th>
              {competitors.map((c) => (
                <th
                  key={c._id}
                  className="px-1 text-center font-medium text-foreground-dimmed"
                >
                  {c.brand}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attributes.map((attr) => (
              <tr key={attr} className="border-accent-foreground border-t">
                <td className="py-1.5 pr-4 font-light text-foreground text-xs">
                  {attr}
                </td>
                {competitors.map((c) => (
                  <td key={c._id} className="px-1 py-1 text-center">
                    <div className="flex justify-center">
                      <HeatCell
                        result={heatmapData[c.brand]?.[attr] ?? "tie"}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Competitor Alerts
        </p>
      </div>
      <div className="divide-y divide-accent-foreground">
        {[
          {
            type: "update",
            message: "SoundMax just updated their X3 listing — added 'Bluetooth 5.3' spec",
            time: "2 hours ago",
          },
          {
            type: "increase",
            message: "BassKing Pro's win rate against you increased by 8% this week",
            time: "Yesterday",
          },
          {
            type: "new",
            message: "New competitor detected in your category: AudioPeak ZX1",
            time: "2 days ago",
          },
        ].map((alert) => (
          <div
            key={alert.message}
            className="flex items-start gap-3 px-4 py-3"
          >
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center text-xs font-bold",
                alert.type === "update" && "bg-primary/10 text-primary",
                alert.type === "increase" && "bg-warning/10 text-warning",
                alert.type === "new" && "bg-success/10 text-success",
              )}
            >
              {alert.type === "update" && "↻"}
              {alert.type === "increase" && "↑"}
              {alert.type === "new" && "+"}
            </div>
            <div>
              <p className="font-light text-foreground text-sm">
                {alert.message}
              </p>
              <p className="font-light text-foreground-dimmed text-xs">
                {alert.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
