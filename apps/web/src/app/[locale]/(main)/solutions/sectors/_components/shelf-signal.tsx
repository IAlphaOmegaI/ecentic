import { CommerceChartActivity_2Icon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Plus } from "@/components/plus";

/** The physical card tray frames the real selected scenario, not a fabricated result. */
export const ShelfSignal = ({
  question,
  titles,
  fields,
  fixed,
}: ShelfSignal.Props) => (
  <div
    data-shelf-signal
    className="relative grid border-background-rich/15 border-y bg-emphasis-dimmed lg:grid-cols-[5fr_7fr]"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="top-0 left-[41.666%] -translate-x-1/2 -translate-y-1/2 max-lg:hidden [&>span]:bg-background-rich/35" />
    <div className="flex min-w-0 flex-col justify-center gap-7 px-4 py-8 sm:px-8">
      <CommerceChartActivity_2Icon
        aria-hidden
        className="size-8 text-primary-rich"
      />
      <p className="max-w-[32ch] font-heading text-2xl text-background-rich leading-snug tracking-tight sm:text-3xl">
        {question}
      </p>
      <ul className="grid gap-3 text-background-rich/65 text-sm">
        {fields.map((field) => (
          <li key={field} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-2 size-1 shrink-0 rounded-full bg-primary-rich"
            />
            {field}
          </li>
        ))}
      </ul>
    </div>
    <div className="relative min-w-0 border-background-rich/15 border-t lg:border-t-0 lg:border-l">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 lg:hidden [&>span]:bg-background-rich/35" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 lg:hidden [&>span]:bg-background-rich/35" />
      <CommerceFigure
        kind="catalog"
        surface="dark"
        className="mx-auto aspect-[5/3] max-w-xl"
      />
      <div className="grid grid-cols-2 border-background-rich/15 border-t">
        {titles.map((title, position) => (
          <div
            key={title}
            className={cn(
              "min-w-0 border-background-rich/15 border-r px-5 py-5 text-background-rich/75 text-sm last:border-r-0",
              position === 0 &&
                fixed &&
                "bg-primary-dimmed/40 text-background-rich",
            )}
          >
            <p>{title}</p>
          </div>
        ))}
      </div>
    </div>
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="bottom-0 left-[41.666%] -translate-x-1/2 translate-y-1/2 max-lg:hidden [&>span]:bg-background-rich/35" />
  </div>
);

export namespace ShelfSignal {
  export type Props = {
    question: string;
    titles: readonly string[];
    fields: readonly string[];
    fixed: boolean;
  };
}
