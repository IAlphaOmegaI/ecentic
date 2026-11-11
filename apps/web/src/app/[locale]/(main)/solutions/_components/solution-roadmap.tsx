import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

/** Every milestone is readable at once; the figure responds without gating the explanation. */
export const SolutionRoadmap = ({
  items,
  label,
  tone = "light",
}: SolutionRoadmap.Props) => (
  <ol
    aria-label={label}
    data-solution-roadmap
    className="relative m-0 list-none border-accent-foreground border-t p-0"
  >
    {items.map((item, index) => (
      <li
        key={item.title}
        className="relative grid min-w-0 border-accent-foreground border-b last:border-b-0 md:grid-cols-[3fr_2fr]"
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <div className="relative flex min-w-0 gap-6 px-8 py-10 max-sm:gap-4 max-sm:px-4 max-sm:py-8">
          <div
            aria-hidden
            className="relative flex w-10 shrink-0 flex-col items-center"
          >
            <span className="relative z-1 bg-background pb-5 font-heading text-3xl text-primary-text leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="absolute top-10 -bottom-10 w-px bg-linear-to-b from-primary/40 to-accent-foreground max-sm:-bottom-8" />
          </div>
          <div className="min-w-0 flex-1">
            {item.eyebrow && (
              <p className="mb-3 text-primary-text text-sm">{item.eyebrow}</p>
            )}
            <h3 className="max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.2rem)]! leading-tight">
              {item.title}
            </h3>
            {item.scope && (
              <p className="mt-3 text-foreground-dimmed text-sm">
                {item.scope}
              </p>
            )}
            <p className="mt-5 max-w-[52ch] text-foreground-dimmed leading-relaxed">
              {item.body}
            </p>
            {item.href && (
              <div className="mt-6">
                <Button render={<Link href={item.href} />}>
                  {item.action ?? item.title}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            "relative flex min-w-0 flex-col justify-center border-accent-foreground max-md:border-t md:border-l",
            tone === "dark" ? "bg-emphasis-dimmed" : "bg-background-rich",
          )}
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
          <CommerceFigure
            kind={item.figure}
            surface={tone === "dark" ? "dark" : "rich"}
            className="mx-auto aspect-[5/3] max-w-lg"
          />
          {!!item.path?.length && (
            <ol className="relative m-0 grid list-none gap-4 px-8 pb-8 max-sm:px-5">
              {item.path.map((step, position) => (
                <li
                  key={step}
                  className="relative flex items-center gap-4 text-foreground-dimmed text-sm"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full border border-primary/50"
                  />
                  <span>{step}</span>
                  {position < (item.path?.length ?? 0) - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-4 -bottom-4 left-[3px] w-px bg-accent-foreground"
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </li>
    ))}
    <Plus className="bottom-0 left-[60%] -translate-x-1/2 translate-y-1/2 max-md:hidden" />
  </ol>
);

export namespace SolutionRoadmap {
  export type Props = {
    label?: string;
    tone?: "light" | "dark";
    items: readonly {
      title: string;
      body: string;
      eyebrow?: string;
      scope?: string;
      href?: string;
      action?: string;
      path?: readonly string[];
      figure: CommerceFigure.Props["kind"];
    }[];
  };
}
