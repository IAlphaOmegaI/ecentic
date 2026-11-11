import {
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

/** A compact record-to-comparison diagram, using the selected scenario's actual labels. */
export const ShelfSignal = ({
  question,
  titles,
  fields,
  fixed,
}: ShelfSignal.Props) => (
  <div
    data-shelf-signal
    className="relative grid border-background-rich/15 border-y lg:grid-cols-[5fr_7fr]"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <div className="flex min-w-0 flex-col justify-center gap-7 px-4 py-8 sm:px-8">
      <CommerceChartActivity_2Icon
        aria-hidden
        className="size-8 text-primary-rich"
      />
      <blockquote className="max-w-[32ch] font-heading text-2xl text-background-rich leading-snug tracking-tight sm:text-3xl">
        “{question}”
      </blockquote>
    </div>
    <div className="relative grid min-w-0 grid-cols-2 gap-4 overflow-hidden border-background-rich/15 border-t px-4 py-10 sm:px-8 lg:border-t-0 lg:border-l">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-radial-[at_55%_60%] from-primary/25 via-primary/5 to-transparent"
      />
      {titles.map((title, position) => (
        <div
          key={title}
          className={cn(
            "relative min-w-0 rounded-lg border border-background-rich/25 bg-emphasis-dimmed p-4 sm:p-5",
            position === 0 &&
              fixed &&
              "border-primary-rich/60 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed",
          )}
        >
          <CommerceFileShieldIcon
            aria-hidden
            className={cn(
              "mb-5 size-7 text-background-rich/55",
              position === 0 && fixed && "text-primary-rich",
            )}
          />
          <p className="min-h-14 font-medium text-background-rich text-sm leading-snug">
            {title}
          </p>
          <div aria-hidden className="mt-5 grid gap-3">
            {fields.map((field) => (
              <div
                key={field}
                className="h-px bg-linear-to-r from-primary-rich/65 to-background-rich/20"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
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
