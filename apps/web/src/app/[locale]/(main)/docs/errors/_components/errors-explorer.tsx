"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useEffect, useState } from "react";
import { useDocument } from "@/hooks/use-document";

export const ErrorsExplorer = ({ problems, copy }: ErrorsExplorer.Props) => {
  const [open, setOpen] = useState<string[]>(["not-found"]);
  const { window } = useDocument();
  const expanded = open.length === problems.length;

  useEffect(() => {
    if (!window) return;

    const reveal = () => {
      const code = window.location.hash.slice(1);
      if (!problems.some((problem) => problem.code === code)) return;
      setOpen((current) =>
        current.includes(code) ? current : [...current, code],
      );
    };

    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [problems, window]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-6 border-accent-foreground border-b bg-background-dimmed px-8 py-6 max-sm:px-4">
        <div className="flex flex-col gap-2">
          <p className="flex items-baseline gap-4 text-foreground">
            <span className="text-3xl tabular-nums">{problems.length}</span>
            <span className="font-medium">{copy.label}</span>
          </p>
          <p className="max-w-xl text-foreground-dimmed text-sm leading-relaxed">
            {copy.description}
          </p>
        </div>
        <Button
          type="button"
          color="neutral"
          onClick={() =>
            setOpen(expanded ? [] : problems.map((problem) => problem.code))
          }
        >
          {expanded ? copy.action.secondary : copy.action.primary}
        </Button>
      </div>

      <Accordion
        multiple
        value={open}
        onValueChange={(value) =>
          setOpen(value.filter((entry) => typeof entry === "string"))
        }
      >
        {problems.map((problem) => (
          <AccordionItem
            key={problem.code}
            value={problem.code}
            id={problem.code}
            className="scroll-mt-28 border-accent-foreground last:border-b-0 target:bg-background-dimmed"
          >
            <div className="grid grid-cols-[1fr_auto] items-center pr-4 sm:pr-8">
              <AccordionTrigger
                className="items-center px-4 py-6 hover:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary-text sm:px-8"
                classList={{
                  trigger: {
                    icon: "mr-0 size-4 shrink-0 transition-none",
                  },
                }}
              >
                <span className="grid min-w-0 flex-1 grid-cols-[3rem_1fr] items-center gap-x-4 sm:grid-cols-[4rem_1fr_1fr] sm:gap-x-8">
                  <span className="row-span-2 font-normal text-2xl text-foreground-dimmed tabular-nums sm:row-span-1">
                    {problem.status}
                  </span>
                  <code className="wrap-anywhere font-mono text-primary-text text-sm">
                    {problem.code}
                  </code>
                  <span className="col-start-2 mt-2 font-normal text-foreground text-sm sm:col-start-auto sm:mt-0 sm:text-base">
                    {problem.title}
                  </span>
                </span>
              </AccordionTrigger>
              <a
                href={`#${problem.code}`}
                onClick={() =>
                  setOpen((current) =>
                    current.includes(problem.code)
                      ? current
                      : [...current, problem.code],
                  )
                }
                className="flex size-10 items-center justify-center text-foreground-dimmed hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary-text"
              >
                <span aria-hidden="true">#</span>
                <span className="sr-only">
                  {copy.permalink} {problem.code}
                </span>
              </a>
            </div>
            <AccordionPanel keepMounted className="transition-none">
              <div className="grid gap-2 px-4 pt-0 pb-6 sm:grid-cols-[4rem_1fr] sm:gap-x-8 sm:px-8">
                <p className="text-foreground-dimmed text-sm sm:col-start-2">
                  {copy.resolution}
                </p>
                <p className="wrap-anywhere max-w-3xl text-foreground leading-relaxed sm:col-start-2">
                  {problem.resolution}
                </p>
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export namespace ErrorsExplorer {
  export type Props = {
    problems: readonly {
      code: string;
      status: number;
      title: string;
      resolution: string;
    }[];
    copy: AppConfig["Messages"]["docsErrorsPage"]["catalogue"];
  };
}
