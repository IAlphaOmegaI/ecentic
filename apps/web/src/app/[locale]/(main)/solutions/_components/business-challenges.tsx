import { ArrowRightIcon } from "@zenncore/icons";
import { Link } from "@/i18n/navigation";

export const BusinessChallenges = ({
  items,
  labels,
}: BusinessChallenges.Props) => (
  <div>
    {items.map((item) => (
      <article
        key={item.before}
        className="grid border-accent-foreground border-t md:grid-cols-2"
      >
        <div className="border-accent-foreground p-4 sm:p-8 md:border-r">
          <p className="marketing-note">{labels.before}</p>
          <h3 className="mt-4">{item.before}</h3>
        </div>
        <div className="p-4 sm:p-8">
          <p className="marketing-note">{labels.after}</p>
          <p className="mt-4">{item.after}</p>
          <Link
            className="marketing-text-link mt-6 inline-flex items-center gap-2"
            href={item.href}
          >
            {labels.link}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </article>
    ))}
  </div>
);

export namespace BusinessChallenges {
  export type Props = {
    labels: { before: string; after: string; link: string };
    items: readonly { before: string; after: string; href: string }[];
  };
}
