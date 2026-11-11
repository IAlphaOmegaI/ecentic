import { ArrowRightIcon, FileIcon } from "@zenncore/icons";
import { Plus } from "@/components/plus";
import { MarketingBand } from "./primitives";

export const MarketingSources = ({
  title,
  description,
  sources,
  checked,
  date,
  dateTime,
}: MarketingSources.Props) => {
  if (!sources.length) return null;
  return (
    <MarketingBand>
      <div className="marketing-cell relative min-w-0 px-7 py-10 max-sm:px-4 max-sm:py-8">
        <h2>{title}</h2>
        {description && (
          <p className="mt-4 max-w-[70ch] text-foreground-dimmed">
            {description}
          </p>
        )}
      </div>
      <ul>
        {sources.map((source) => (
          <li
            key={source.href}
            className="relative border-accent-foreground border-t"
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <a
              href={source.href}
              className="group/source grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 gap-y-4 px-7 py-6 text-foreground-rich transition-colors hover:bg-background-dimmed hover:text-primary-text focus-visible:bg-background-dimmed focus-visible:text-primary-text focus-visible:-outline-offset-4 motion-reduce:transition-none max-sm:gap-x-4 max-sm:px-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <FileIcon
                aria-hidden
                className="size-8 shrink-0 text-primary-text max-sm:row-span-2"
              />
              <span className="min-w-0">
                <span className="block break-words font-medium text-lg">
                  {source.label}
                </span>
                <span className="mt-2 block break-all font-mono text-foreground-dimmed text-xs">
                  {new URL(source.href).hostname}
                </span>
              </span>
              <span className="text-foreground-dimmed text-sm max-sm:col-start-2 max-sm:row-start-2">
                {checked}: <time dateTime={dateTime}>{date}</time>
              </span>
              <ArrowRightIcon
                aria-hidden
                className="size-4 text-primary-text transition-transform group-hover/source:translate-x-1 motion-reduce:transition-none max-sm:col-start-3 max-sm:row-span-2 max-sm:row-start-1"
              />
            </a>
          </li>
        ))}
      </ul>
    </MarketingBand>
  );
};

export namespace MarketingSources {
  export type Props = {
    title: string;
    description?: string;
    sources: readonly { label: string; href: string }[];
    checked: string;
    date: string;
    dateTime: string;
  };
}
