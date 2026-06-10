"use client";

import { PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useState } from "react";
import { SimulationModal } from "./simulation-modal";

export const OverviewActions = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* <Button color="accent">
          <DownloadIcon className="size-4" />
          Export
        </Button> */}
        <Button color="primary" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          Run Simulation
        </Button>
      </div>
      <SimulationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
