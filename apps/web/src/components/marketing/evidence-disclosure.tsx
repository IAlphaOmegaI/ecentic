"use client";

import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { type ReactNode, useState } from "react";
import { useInteractive } from "./interactive/use-interactive";

/** Evidence remains in the server HTML; enhancement folds the detailed charts. */
export const EvidenceDisclosure = ({
  id,
  title,
  children,
  compact = false,
}: EvidenceDisclosure.Props) => {
  const { ready } = useInteractive();
  const [value, setValue] = useState<string[]>([]);

  return (
    <Accordion
      value={ready ? value : [id]}
      onValueChange={(next) =>
        setValue(next.filter((entry) => typeof entry === "string"))
      }
    >
      <AccordionItem value={id} className="border-0">
        <AccordionTrigger
          id={`${id}-title`}
          className={cn(
            "items-center gap-6 bg-transparent font-heading leading-tight tracking-tight hover:text-primary-text",
            compact ? "py-6 text-xl" : "py-2 text-2xl xl:text-3xl 2xl:text-4xl",
          )}
          classList={{ trigger: { icon: "mr-0 size-5 shrink-0" } }}
        >
          {title}
        </AccordionTrigger>
        <AccordionPanel keepMounted className="motion-reduce:transition-none">
          <div className={compact ? "pb-8" : "pt-6"}>{children}</div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

export namespace EvidenceDisclosure {
  export type Props = {
    id: string;
    title: string;
    children: ReactNode;
    compact?: boolean;
  };
}
