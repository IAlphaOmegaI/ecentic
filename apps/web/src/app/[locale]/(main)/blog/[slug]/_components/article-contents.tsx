import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";

const ContentsLinks = ({ entries }: { entries: ArticleContents.Entry[] }) => (
  <ol className="flex flex-col">
    {entries.map((entry, index) => (
      <li key={entry.id}>
        <a
          href={`#${entry.id}`}
          className="group flex min-h-10 items-baseline gap-4 py-2 text-foreground-dimmed text-sm leading-snug transition-colors hover:text-primary-text focus-visible:text-primary-text"
        >
          <span className="w-4 shrink-0 text-primary-text text-xs tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="group-hover:underline group-hover:underline-offset-4">
            {entry.title}
          </span>
        </a>
      </li>
    ))}
  </ol>
);

export const ArticleContents = ({ entries, copy }: ArticleContents.Props) => (
  <>
    <nav aria-label={copy.contents} className="hidden lg:block">
      <p className="mb-4 font-medium text-foreground text-sm">
        {copy.contents}
      </p>
      <ContentsLinks entries={entries} />
      <a
        href="#article-top"
        className="mt-6 inline-flex min-h-10 items-center gap-2 text-foreground-dimmed text-sm hover:text-primary-text hover:underline hover:underline-offset-4"
      >
        <ArrowRightIcon className="size-4 -rotate-90" />
        {copy.action.primary}
      </a>
    </nav>
    <Accordion className="lg:hidden">
      <AccordionItem value="contents" className="border-b-0">
        <AccordionTrigger
          className="min-h-12 py-4"
          classList={{ trigger: { icon: "mr-0 size-4 shrink-0" } }}
        >
          {copy.contents}
        </AccordionTrigger>
        <AccordionPanel>
          <nav aria-label={copy.contents} className="pb-4">
            <ContentsLinks entries={entries} />
          </nav>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  </>
);

export namespace ArticleContents {
  export type Entry = { id: string; title: string };
  export type Props = {
    entries: Entry[];
    copy: AppConfig["Messages"]["blogArticlePage"];
  };
}
