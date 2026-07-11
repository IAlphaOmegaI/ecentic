import { ArrowRightIcon, FaceSearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";

const fits = [
  {
    title: "Managing competitive catalogs",
    description:
      "Large or competitive categories where missing attributes quietly cost selection.",
  },
  {
    title: "Comparing tool categories",
    description:
      "Weighing agent-commerce optimization against content generators or analytics tools.",
  },
  {
    title: "Running multiple stores",
    description: "Considering a custom Enterprise setup across brands.",
  },
  {
    title: "Short on time",
    description:
      "You want the diagnosis explained in plain language, not another report to read.",
  },
] as const;

export const WhoShouldBook = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Who should book.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The call is most useful when you have a real catalog to look at and a
          reason to act on the results.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <FaceSearchIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            A demo is the fastest path when you want a second set of eyes on the
            results rather than reading the report alone.
          </p>
          <div className="mt-auto flex flex-col gap-3">
            <p className="font-body font-light text-foreground-dimmed leading-relaxed">
              Rather see your numbers first? The free Scan runs the same
              simulation on your top 10 products in about two minutes.
            </p>
            <Button
              color="accent"
              className="w-fit"
              render={<Link href="/sign-up" />}
            >
              Run the free scan
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            The call helps most when you are
          </p>
          {fits.map((fit) => (
            <div
              key={fit.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {fit.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {fit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
