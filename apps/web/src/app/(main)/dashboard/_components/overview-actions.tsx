"use client";

import { DownloadIcon, PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useState } from "react";
import { SimulationModal } from "./simulation-modal";

export const OverviewActions = () => {
  const [simOpen, setSimOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" color="accent" className="border-primary text-primary">
          <DownloadIcon className="size-4" />
          Export
        </Button>
        <Button variant="flat" color="primary" onClick={() => setSimOpen(true)}>
          <PlusIcon className="size-4" />
          Run Simulation
        </Button>
      </div>
      <SimulationModal open={simOpen} onClose={() => setSimOpen(false)} />
    </>
  );
};
