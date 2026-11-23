"use client";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import type { Prospect } from "@/lib/outbound";
import type { ProspectTools as Tools } from "../../../_components/integrations";

const ProspectEditor = dynamic(() =>
  import("../../../_components/prospects").then(
    (module) => module.ProspectEditor,
  ),
);
const ProspectTools = dynamic(() =>
  import("../../../_components/integrations").then(
    (module) => module.ProspectTools,
  ),
);
export const ProspectEditorPanel = ({
  prospect,
  clay,
}: {
  prospect: Prospect;
  clay: ComponentProps<typeof Tools>["clay"];
}) => {
  const t = useTranslations("outbound.prospect.summary");
  const [opened, setOpened] = useState(false);
  return (
    <Accordion
      onValueChange={(value) => {
        if (value.includes("edit")) setOpened(true);
      }}
    >
      <AccordionItem value="edit" className="border-b-0">
        <AccordionTrigger className="px-4 py-5 sm:px-6">
          <span>
            <span className="block text-sm">{t("manualTitle")}</span>
            <span className="mt-1 block font-normal text-foreground-dimmed text-xs leading-5">
              {t("manualHelp")}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionPanel keepMounted>
          {opened && (
            <>
              <ProspectTools prospect={prospect} clay={clay} />
              <ProspectEditor prospect={prospect} />
            </>
          )}
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
