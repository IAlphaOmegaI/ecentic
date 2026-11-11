"use client";

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
          className="items-center gap-6 bg-transparent py-2 font-heading text-[clamp(1.65rem,2.5vw,2.4rem)] leading-tight tracking-[-0.025em] hover:text-primary-text"
          classList={{ trigger: { icon: "mr-0 size-5 shrink-0" } }}
        >
          {title}
        </AccordionTrigger>
        <AccordionPanel keepMounted className="motion-reduce:transition-none">
          <div className="pt-6">{children}</div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

export namespace EvidenceDisclosure {
  export type Props = { id: string; title: string; children: ReactNode };
}
