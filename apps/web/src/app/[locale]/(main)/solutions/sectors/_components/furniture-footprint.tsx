import type { AppConfig } from "next-intl";

/** A dimensional relationship, deliberately unscaled; source values remain text. */
export const FurnitureFootprint = ({
  copy,
  source,
}: {
  copy: AppConfig["Messages"]["round14Sectors"]["dimensions"];
  source: string;
}) => (
  <figure className="min-w-0" data-furniture-footprint>
    <div className="relative mx-auto aspect-[5/3] w-full max-w-md text-foreground-dimmed">
      <svg viewBox="0 0 400 240" className="size-full" aria-hidden>
        <path
          d="M83 153V173M302 153V173M83 167H302M324 80H340M324 155H340M334 80V155M61 152L46 166M81 178L66 192M52 161L72 185"
          className="stroke-primary-text"
          fill="none"
          strokeWidth="1"
        />
        <path
          d="M80 132V89Q80 81 89 81H290Q299 81 299 90V132L278 157H96Z"
          className="fill-background-rich stroke-cross"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M86 127L105 143H286L299 128M108 85V130M201 85V138"
          className="stroke-accent-rich"
          fill="none"
          strokeWidth="1"
        />
        <path
          d="M79 117Q72 117 72 125V143Q72 153 82 155L96 158V135L88 120Q85 117 79 117ZM291 118Q298 114 304 118L314 131V151Q314 159 306 159H292V137Z"
          className="fill-background-rich stroke-cross"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M98 157V169M294 158V169M91 143H293M200 132V143"
          className="stroke-cross"
          fill="none"
          strokeWidth="1.2"
        />
      </svg>
      <span className="absolute bottom-[17%] left-1/2 -translate-x-1/2 bg-background-dimmed px-2 text-primary-text text-sm">
        {copy.width}
      </span>
      <span className="absolute top-[45%] right-[8%] bg-background-dimmed py-2 text-primary-text text-xs [writing-mode:vertical-rl]">
        {copy.height}
      </span>
      <span className="absolute bottom-[10%] left-[7%] text-primary-text text-xs">
        {copy.depth}
      </span>
    </div>
    <figcaption className="space-y-3">
      <p className="font-medium text-foreground-rich">{source}</p>
      <p className="max-w-[54ch] text-foreground-dimmed text-sm leading-relaxed">
        {copy.note}
      </p>
    </figcaption>
  </figure>
);
