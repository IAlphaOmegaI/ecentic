import { ArrowRightIcon } from "@zenncore/icons";

export const SpecificationMap = ({ items, labels }: SpecificationMap.Props) => (
  <div>
    <div className="hidden grid-cols-[72px_1fr_2fr] gap-8 border-accent-foreground border-t px-8 py-4 md:grid">
      <span aria-hidden="true" />
      <p className="marketing-note">{labels.question}</p>
      <p className="marketing-note">{labels.data}</p>
    </div>
    <ol>
      {items.map((item, index) => (
        <li
          key={item.title}
          className="grid grid-cols-[48px_1fr] gap-x-4 gap-y-4 border-accent-foreground border-t p-4 sm:p-8 md:grid-cols-[72px_1fr_2fr] md:gap-x-8"
        >
          <span
            aria-hidden="true"
            className="font-superior text-3xl text-primary md:text-5xl"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="flex items-start justify-between gap-4">
            {item.title}
            <ArrowRightIcon
              aria-hidden="true"
              className="mt-2 hidden size-4 shrink-0 text-primary md:block"
            />
          </h3>
          <p className="col-start-2 max-w-xl md:col-start-auto">{item.body}</p>
        </li>
      ))}
    </ol>
  </div>
);

export namespace SpecificationMap {
  export type Props = {
    items: readonly { title: string; body: string }[];
    labels: { question: string; data: string };
  };
}
