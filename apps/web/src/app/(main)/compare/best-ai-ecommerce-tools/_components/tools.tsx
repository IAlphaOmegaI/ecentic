import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

export const tools = [
  {
    name: "ecentic",
    category: "Agent-commerce optimization",
    bestAt:
      "Seeing why AI assistants pick a competitor over you, and rewriting the listing so they stop.",
    wrongPick:
      "Buyers still arrive from search and ads, and no meaningful share of your traffic is AI-mediated yet.",
    us: true,
  },
  {
    name: "Hypotenuse AI",
    category: "Product content generation",
    bestAt:
      "Drafting descriptions, bullets, and marketplace copy across a catalog too large to write by hand.",
    wrongPick:
      "The copy already reads well and the real problem is which products get surfaced, not how they are written.",
    us: false,
  },
  {
    name: "Shopify Magic",
    category: "Platform-native drafting",
    bestAt:
      "Quick AI assistance inside the admin you already use, with nothing new to buy, learn, or integrate.",
    wrongPick:
      "You need competitive context. It only ever sees your own store, never the products you lose to.",
    us: false,
  },
  {
    name: "Nosto",
    category: "Personalization",
    bestAt:
      "Changing what each returning visitor sees onsite: recommendations, segments, and merchandising rules.",
    wrongPick:
      "Traffic is thin, or the decision is being made before anyone reaches your storefront at all.",
    us: false,
  },
  {
    name: "Constructor",
    category: "Search and discovery",
    bestAt:
      "Making a large catalog findable: query understanding, ranking, and browse relevance at scale.",
    wrongPick:
      "Your catalog is small enough that shoppers rarely search, or discovery is not where you lose them.",
    us: false,
  },
  {
    name: "Bloomreach",
    category: "Enterprise intelligence",
    bestAt:
      "Running search, merchandising, and campaign data as one stack across a large organization.",
    wrongPick:
      "You are a lean team. The implementation and onboarding cost outruns the problem you have today.",
    us: false,
  },
] as const;

const columns = [
  { label: "Tool", className: "w-[18%]" },
  { label: "Category", className: "w-[20%]" },
  { label: "Best at", className: "w-[31%]" },
  { label: "When it's the wrong pick", className: "w-[31%]" },
] as const;

const cell = "px-6 py-5 align-top md:px-8";

export const Tools = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          The tools most merchants compare.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          One row per tool, ours included. The last column is the one worth
          reading: every tool here is the wrong pick for someone, and knowing
          who that is shortens the shortlist faster than a feature checklist.
        </p>
      </div>

      <div className="relative border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <p className="border-accent-foreground border-b bg-background-dimmed px-6 py-3 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:hidden">
          Scroll to compare &rarr;
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-accent-foreground border-b bg-background-dimmed">
                {columns.map((column) => (
                  <th
                    key={column.label}
                    scope="col"
                    className={cn(
                      "px-6 py-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.16em] md:px-8",
                      column.className,
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr
                  key={tool.name}
                  className="border-accent-foreground border-b bg-background-rich last:border-b-0"
                >
                  <th
                    scope="row"
                    className={cn(
                      cell,
                      "font-body font-medium text-foreground text-xl",
                    )}
                  >
                    {tool.name}
                    {/* Our own row is disclosed, not promoted — the same
                        columns and weight as every other tool on the page. */}
                    {tool.us && (
                      <span className="ml-2 font-normal text-base text-primary">
                        &middot;us
                      </span>
                    )}
                  </th>
                  <td className={cn(cell, "font-light text-foreground")}>
                    {tool.category}
                  </td>
                  <td
                    className={cn(
                      cell,
                      "font-light text-foreground-dimmed leading-relaxed",
                    )}
                  >
                    {tool.bestAt}
                  </td>
                  <td
                    className={cn(
                      cell,
                      "font-light text-foreground-dimmed leading-relaxed",
                    )}
                  >
                    {tool.wrongPick}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
);
