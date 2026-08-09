"use client";

import { PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { Suspense, use, useState } from "react";
import { SimulationModal } from "./simulation-modal";

type StoreParams = PageProps<"/dashboard/[store]">["params"];

// The modal is the only part that needs a store id, and it reads `params` with
// `use()` behind its own boundary. That keeps the trigger button in the page's
// static shell instead of popping in once the route params resolve.
const StoreSimulationModal = ({
  params,
  open,
  onClose,
}: {
  params: StoreParams;
  open: boolean;
  onClose: () => void;
}) => {
  const { store } = use(params);

  return <SimulationModal store={store} open={open} onClose={onClose} />;
};

export const OverviewActions = ({ params }: { params: StoreParams }) => {
  const translate = useTranslations("dashboard.shared.action");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button color="primary" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          {translate("runSimulation")}
        </Button>
      </div>
      <Suspense fallback={null}>
        <StoreSimulationModal
          params={params}
          open={open}
          onClose={() => setOpen(false)}
        />
      </Suspense>
    </>
  );
};
