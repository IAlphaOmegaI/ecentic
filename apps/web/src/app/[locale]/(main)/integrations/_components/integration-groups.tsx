"use client";

import { Accordion } from "@zenncore/web/components/accordion";
import { type PropsWithChildren, useEffect, useState } from "react";
import { integrationGroups } from "@/content/integrations";
import { useDocument } from "@/hooks/use-document";

export const IntegrationGroups = ({ children }: PropsWithChildren) => {
  const [expanded, setExpanded] = useState<string[]>([...integrationGroups]);
  const [reduced, setReduced] = useState(false);
  const { window } = useDocument();

  useEffect(() => {
    if (!window) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialize = () => {
      const group = window.location.hash.slice(1);
      setReduced(preference.matches);
      setExpanded(
        preference.matches
          ? [...integrationGroups]
          : [
              integrationGroups.some((entry) => entry === group)
                ? group
                : "commerce",
            ],
      );
    };
    const reveal = () => {
      const group = window.location.hash.slice(1);
      if (!integrationGroups.some((entry) => entry === group)) return;
      setExpanded((current) =>
        current.includes(group) ? current : [...current, group],
      );
    };
    initialize();
    window.addEventListener("hashchange", reveal);
    preference.addEventListener("change", initialize);
    return () => {
      window.removeEventListener("hashchange", reveal);
      preference.removeEventListener("change", initialize);
    };
  }, [window]);

  return (
    <Accordion
      multiple
      disabled={reduced}
      value={expanded}
      onValueChange={(value) =>
        setExpanded(value.filter((entry) => typeof entry === "string"))
      }
    >
      {children}
    </Accordion>
  );
};
