import { ArrowRightIcon, PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { products } from "@/lib/mock-data";

const StatusBadge = ({
  status,
}: {
  status: "optimized" | "pending" | "unoptimized";
}) => {
  const styles = (() => {
    switch (status) {
      case "optimized":
        return "bg-success/10 text-success";
      case "pending":
        return "bg-warning/10 text-warning";
      case "unoptimized":
        return "bg-error/10 text-error";
    }
  })();

  const label = (() => {
    switch (status) {
      case "optimized":
        return "Optimized";
      case "pending":
        return "Pending";
      case "unoptimized":
        return "Unoptimized";
    }
  })();

  return (
    <span className={cn("px-1.5 py-0.5 text-xs font-medium", styles)}>
      {label}
    </span>
  );
};

export default () => (
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-xl text-foreground">Products</h1>
        <p className="font-light text-foreground-dimmed text-sm">
          {products.length} products · Last simulated 30 minutes ago
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
        >
          Export CSV
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
        >
          <PlusIcon className="size-3.5" />
          Add Products
        </button>
      </div>
    </div>

    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-1 items-center gap-2 border border-accent-foreground bg-background-rich px-3 py-1.5 min-w-48">
        <svg
          className="size-3.5 text-foreground-dimmed"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM15 15l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-light text-foreground-dimmed text-sm">
          Search products...
        </span>
      </div>
      <select className="border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm focus:outline-none">
        <option>All categories</option>
        <option>Electronics</option>
        <option>Kitchen</option>
        <option>Fitness</option>
        <option>Bedding</option>
        <option>Footwear</option>
      </select>
      <select className="border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm focus:outline-none">
        <option>All statuses</option>
        <option>Optimized</option>
        <option>Pending</option>
        <option>Unoptimized</option>
      </select>
      <select className="border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm focus:outline-none">
        <option>Sort: Win Rate ↓</option>
        <option>Sort: Win Rate ↑</option>
        <option>Sort: Title A-Z</option>
        <option>Sort: Price ↓</option>
      </select>
    </div>

    <div className="border border-accent-foreground bg-background-rich">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-accent-foreground border-b bg-background-dimmed">
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  className="border border-accent-foreground"
                  aria-label="Select all"
                />
              </th>
              {[
                "Product",
                "Price",
                "Win Rate",
                "GPT-4",
                "Claude",
                "Gemini",
                "Gap",
                "Quality",
                "Last Scan",
                "Status",
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
            {products.map((product) => (
              <tr
                key={product._id}
                className="border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="border border-accent-foreground"
                    aria-label={`Select ${product.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/products/${product._id}`}
                    className="group"
                  >
                    <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                      {product.title}
                    </p>
                    <p className="font-light text-foreground-dimmed text-xs">
                      {product.category} · {product.sku}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3 font-light text-foreground text-sm">
                  ${product.price}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-accent-foreground h-1.5">
                      <div
                        className={cn(
                          "h-full",
                          product.winRate >= 60
                            ? "bg-success"
                            : product.winRate >= 30
                              ? "bg-warning"
                              : "bg-error",
                        )}
                        style={{ width: `${product.winRate}%` }}
                      />
                    </div>
                    <span className="font-medium text-foreground text-xs">
                      {product.winRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.gpt4WinRate}%
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.claudeWinRate}%
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.geminiWinRate}%
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      product.winRate > product.competitorWinRate
                        ? "text-success"
                        : "text-error",
                    )}
                  >
                    {product.winRate > product.competitorWinRate ? "+" : ""}
                    {product.winRate - product.competitorWinRate}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 bg-accent-foreground h-1">
                      <div
                        className={cn(
                          "h-full",
                          product.dataQuality >= 75
                            ? "bg-success"
                            : product.dataQuality >= 50
                              ? "bg-warning"
                              : "bg-error",
                        )}
                        style={{ width: `${product.dataQuality}%` }}
                      />
                    </div>
                    <span className="font-light text-foreground-dimmed text-xs">
                      {product.dataQuality}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-foreground-dimmed text-xs whitespace-nowrap">
                  {product.lastSimulated}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={product.optimizationStatus} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/products/${product._id}`}
                    className="flex items-center gap-1 font-light text-primary text-xs hover:underline whitespace-nowrap"
                  >
                    View <ArrowRightIcon className="size-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-accent-foreground border-t px-4 py-3">
        <p className="font-light text-foreground-dimmed text-xs">
          Showing 1–{products.length} of {products.length} products
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="border border-accent-foreground px-2.5 py-1 text-foreground-dimmed text-xs hover:bg-background-dimmed"
          >
            Previous
          </button>
          <button
            type="button"
            className="border border-primary bg-primary px-2.5 py-1 text-white text-xs"
          >
            1
          </button>
          <button
            type="button"
            className="border border-accent-foreground px-2.5 py-1 text-foreground-dimmed text-xs hover:bg-background-dimmed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
);
