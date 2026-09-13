"use client";

import { PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SimulationModal } from "./simulation-modal";

export const OverviewActions = () => {
  const translate = useTranslations("dashboard.shared.action");
  const { store } = useParams<{ store: string }>();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          color="primary"
          type="button"
          onClick={() => {
            if (!store) return;
            setOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          {translate("runSimulation")}
        </Button>
      </div>
      {store && (
        <SimulationModal
          store={store}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
