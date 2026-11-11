import { ArrowRightIcon } from "@zenncore/icons";

export const ProductJourney = ({ items }: ProductJourney.Props) => (
  <ol className="flex flex-col border-accent-foreground border-t min-[1001px]:flex-row">
    {items.map((item, index) => (
      <li
        key={item.title}
        className="grid min-w-0 flex-1 grid-cols-[48px_1fr] gap-5 border-accent-foreground border-b px-4 py-7 last:border-0 min-[1001px]:block min-[641px]:grid-cols-[80px_1fr] min-[641px]:gap-x-7 min-[1001px]:border-r min-[1001px]:border-b-0 min-[641px]:px-7"
      >
        <div className="row-span-2 flex flex-col items-start justify-start gap-7 min-[1001px]:mb-10 min-[1001px]:flex-row min-[1001px]:items-center min-[1001px]:justify-between">
          <span
            aria-hidden="true"
            className="font-medium font-superior text-[44px] text-primary leading-none tracking-[-0.06em] min-[641px]:text-[64px]"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {index < items.length - 1 && (
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 rotate-90 text-primary min-[1001px]:rotate-0"
            />
          )}
        </div>
        <h3 className="text-2xl">{item.title}</h3>
        <p className="col-start-2 min-[1001px]:mt-5">{item.body}</p>
      </li>
    ))}
  </ol>
);

export namespace ProductJourney {
  export type Props = { items: readonly { title: string; body: string }[] };
}
