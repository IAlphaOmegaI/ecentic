"use client";

import type { getMessages } from "next-intl/server";
import { useState } from "react";
import { FlowDiagram } from "@/components/marketing/interactive/flow-diagram";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";

const nodes = [
  "source",
  "ecentic",
  "providers",
  "store",
  "merchantCenter",
] as const;
const connectors = [
  { id: "import", from: "source", to: "ecentic" },
  { id: "request", from: "ecentic", to: "providers" },
  { id: "response", from: "providers", to: "ecentic" },
  { id: "apply", from: "ecentic", to: "store" },
  { id: "structuredData", from: "ecentic", to: "store" },
  { id: "merchantCenter", from: "ecentic", to: "merchantCenter" },
] as const;

type Copy = Awaited<ReturnType<typeof getMessages>>["interactiveSecurity"];

export const SecurityFlowClient = ({ copy }: { copy: Copy }) => {
  const { ready, reduced } = useInteractive();
  const [selected, setSelected] = useState("import");
  const interactive = ready && !reduced;

  return (
    <div
      data-security-flow-content
      data-interactive={interactive}
      className="border-accent-foreground border-t bg-background"
    >
      <FlowDiagram
        label={copy.title}
        orientation={interactive ? "horizontal" : "vertical"}
        nodes={nodes.map((id) => ({
          id,
          label: copy.nodes[id].label,
          description: copy.nodes[id].description,
          href: id === "providers" ? "/security#sub-processors" : undefined,
        }))}
        connectors={connectors.map((connector) => ({
          ...connector,
          label: copy.connectors[connector.id].label,
          details: (["what", "when", "control"] as const).map((key) => ({
            label: copy.details[key],
            value: copy.connectors[connector.id][key],
          })),
        }))}
        selectedConnector={interactive ? selected : undefined}
        onConnectorSelect={interactive ? setSelected : undefined}
      />
    </div>
  );
};
