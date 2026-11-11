"use client";

import { Accordion } from "@zenncore/web/components/accordion";
import { type PropsWithChildren, useEffect, useState } from "react";
import { integrationGroups } from "@/content/integrations";
import { useDocument } from "@/hooks/use-document";

export const IntegrationGroups = ({ children }: PropsWithChildren) => {
  const [expanded, setExpanded] = useState<string[]>(["commerce"]);
  const { window } = useDocument();

  useEffect(() => {
    if (!window) return;
    const reveal = () => {
      const group = window.location.hash.slice(1);
      if (!integrationGroups.some((entry) => entry === group)) return;
      setExpanded((current) =>
        current.includes(group) ? current : [...current, group],
      );
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [window]);

  return (
    <Accordion
      multiple
      value={expanded}
      onValueChange={(value) =>
        setExpanded(value.filter((entry) => typeof entry === "string"))
      }
    >
      {children}
    </Accordion>
  );
};
