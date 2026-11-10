import { ArrowRightIcon } from "@zenncore/icons";
import "./product-journey.css";

export const ProductJourney = ({ items }: ProductJourney.Props) => (
  <ol className="product-journey">
    {items.map((item, index) => (
      <li key={item.title}>
        <div className="product-journey-heading">
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {index < items.length - 1 && (
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 text-primary"
            />
          )}
        </div>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </li>
    ))}
  </ol>
);

export namespace ProductJourney {
  export type Props = { items: readonly { title: string; body: string }[] };
}
