"use client";

import { ChevronDownIcon } from "@zenncore/icons";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import type { ReactNode } from "react";

export const EvidenceDetails = ({ label, children }: EvidenceDetails.Props) => (
  <Collapsible className="mt-6 w-full">
    <CollapsibleTrigger className="group w-fit py-2 text-foreground-dimmed text-sm transition-colors hover:text-primary-text">
      {label}
      <ChevronDownIcon
        aria-hidden
        className="size-4 transition-transform duration-200 group-data-panel-open:rotate-180"
      />
    </CollapsibleTrigger>
    <CollapsiblePanel className="bg-transparent text-foreground-dimmed text-sm leading-relaxed">
      <div className="space-y-3 pt-2 pb-4">{children}</div>
    </CollapsiblePanel>
  </Collapsible>
);

export namespace EvidenceDetails {
  export type Props = { label: string; children: ReactNode };
}
