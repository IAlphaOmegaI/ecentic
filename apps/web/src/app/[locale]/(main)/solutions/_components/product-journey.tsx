import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";
import { JourneyFigure } from "./journey-figure";

export const ProductJourney = ({ items }: ProductJourney.Props) => (
  <ol
    data-product-bento
    className="relative grid grid-cols-1 gap-px border border-background-rich/15 border-x-transparent bg-background-rich/15 bg-clip-padding sm:grid-cols-2 lg:grid-cols-6"
  >
    {items.map((item, index) => (
      <li
        key={item.title}
        className={cn(
          "relative flex min-w-0 flex-col bg-emphasis-dimmed",
          index === 0
            ? "bg-linear-to-br from-primary-dimmed/70 via-emphasis-dimmed to-emphasis-dimmed sm:col-span-2 lg:col-span-4"
            : index === 1
              ? "sm:col-span-2 lg:col-span-2"
              : index === 4
                ? "sm:col-span-2 lg:col-span-2"
                : "lg:col-span-2",
        )}
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
        {index > 0 && (
          <Plus
            className={cn(
              "top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35",
              (index === 1 || index === 3) && "lg:hidden",
              index === 2 && "sm:hidden",
            )}
          />
        )}
        {index === 4 && (
          <Plus className="top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block lg:hidden [&>span]:bg-background-rich/35" />
        )}
        <div className="flex items-center justify-between gap-5 px-6 pt-7 sm:px-8">
          <span
            aria-hidden
            className="font-heading text-3xl text-primary-rich leading-none"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className="h-px w-10 bg-linear-to-r from-primary-rich/60 to-transparent"
          />
        </div>
        <div className="px-6 pt-6 sm:px-8">
          <h3 className="text-background-rich">{item.title}</h3>
          <p className="mt-4 max-w-[58ch] text-background-rich/75">
            {item.body}
          </p>
        </div>
        <div className="mt-auto pt-6">
          <JourneyFigure stage={index} large={index === 0} animate />
        </div>
      </li>
    ))}
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
    <Plus className="bottom-0 left-1/3 hidden -translate-x-1/2 translate-y-1/2 lg:block [&>span]:bg-background-rich/35" />
    <Plus className="bottom-0 left-2/3 hidden -translate-x-1/2 translate-y-1/2 lg:block [&>span]:bg-background-rich/35" />
  </ol>
);

export namespace ProductJourney {
  export type Props = { items: readonly { title: string; body: string }[] };
}
