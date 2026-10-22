"use client";

import { cn } from "@zenncore/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useTranslations } from "next-intl";
import type * as Rules from "@/server/app/intelligence/claim-check-rules";
import { StatusPill } from "../../../../../_components/grid";
import {
  ASSISTANT_LABEL,
  CONSISTENCY_TONE,
  NOTE_KEY,
  STANCE_TONE,
} from "./verdicts";

const AVAILABILITY_KEY = {
  in_stock: "inStock",
  out_of_stock: "outOfStock",
  discontinued: "discontinued",
} as const;

const isAvailability = (
  value: string,
): value is keyof typeof AVAILABILITY_KEY => value in AVAILABILITY_KEY;

const STANCE_TEXT: Record<Rules.AssistantStance, string> = {
  agrees: "text-foreground",
  diverges: "text-error",
  unknown: "text-foreground-dimmed",
};

/**
 * Catalog vs live page, fact by fact — compared by code, no model. What the
 * assistants said sits beside each fact as their own column: it never decides
 * the status.
 */
export const CoreFactsTable = ({ facts }: { facts: Rules.CoreFact[] }) => {
  const translate = useTranslations("dashboard.claims.facts");

  const display = (fact: Rules.CoreFact, value: string | null) => {
    if (value === null) return translate("notStated");
    if (fact.key === "availability" && isAvailability(value))
      return translate(`availability.${AVAILABILITY_KEY[value]}`);
    return value;
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[44rem] border-b-0">
        <TableHeader>
          <TableRow>
            <TableHead>{translate("columns.fact")}</TableHead>
            <TableHead>{translate("columns.catalog")}</TableHead>
            <TableHead>{translate("columns.page")}</TableHead>
            <TableHead>{translate("columns.status")}</TableHead>
            <TableHead>{translate("columns.assistants")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facts.map((fact) => (
            <TableRow key={fact.key} className="align-top hover:bg-background">
              <TableCell className="font-medium text-foreground">
                {translate(`keys.${fact.key}`)}
              </TableCell>
              <TableCell className="text-foreground tabular-nums">
                {display(fact, fact.listing)}
              </TableCell>
              <TableCell className="text-foreground tabular-nums">
                {display(fact, fact.page)}
              </TableCell>
              <TableCell>
                <StatusPill tone={CONSISTENCY_TONE[fact.consistency]}>
                  {translate(`status.${fact.consistency}`)}
                </StatusPill>
                {fact.note && (
                  <p className="mt-1.5 max-w-56 whitespace-normal text-foreground-dimmed text-xs">
                    {translate(`notes.${NOTE_KEY[fact.note]}`)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {fact.assistants.length === 0 ? (
                  <span className="text-foreground-dimmed">
                    {translate("notStated")}
                  </span>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {fact.assistants.map((view) => (
                      <li
                        key={view.assistant}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-16 shrink-0 text-foreground-dimmed">
                          {ASSISTANT_LABEL[view.assistant]}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            STANCE_TEXT[view.stance],
                          )}
                        >
                          {view.value
                            ? display(fact, view.value)
                            : translate("stance.unknown")}
                        </span>
                        {view.stance === "diverges" && (
                          <StatusPill tone={STANCE_TONE.diverges}>
                            {translate("stance.diverges")}
                          </StatusPill>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
