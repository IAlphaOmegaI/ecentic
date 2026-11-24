"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@zenncore/web/components/alert-dialog";
import { Button } from "@zenncore/web/components/button";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import * as Recharge from "@/server/app/integration/recharge/actions";
import type { Status } from "@/server/app/integration/recharge/types";

export namespace RechargeControls {
  export type Props = { store: string; status: Status | null };
}

export const RechargeControls = ({ store, status }: RechargeControls.Props) => {
  const translate = useTranslations("dashboard.recharge");
  const formatter = useFormatter();
  const router = useRouter();
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [run, pending] = useAsyncAction(
    async (operation: "sync" | "disconnect") => {
      setError(false);
      const result = await (operation === "sync"
        ? Recharge.sync({ store })
        : Recharge.disconnect({ store }));
      if (!result.success) {
        setError(true);
        return;
      }
      setOpen(false);
      router.refresh();
    },
  );
  if (status && !status.supported) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <h4 className="font-semibold text-sm">Recharge</h4>
        <p className="mt-2 text-foreground-dimmed text-sm">
          {status
            ? translate(`status.${status.status}`)
            : translate("unavailable")}
          {status?.lastSyncedAt &&
            ` · ${translate("synced", { date: formatter.dateTime(new Date(status.lastSyncedAt), { dateStyle: "medium", timeStyle: "short" }) })}`}
        </p>
        {status && !status.configured && (
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("notConfigured")}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-error text-sm">
            {translate("actionFailed")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {status?.connected ? (
          <>
            <Button
              variant="soft"
              color="neutral"
              disabled={pending || status.status === "syncing"}
              onClick={() => run("sync")}
            >
              {translate("action.secondary")}
            </Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" color="neutral" disabled={pending} />
                }
              >
                {translate("action.tertiary")}
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogTitle>
                  {translate("disconnectTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translate("disconnectDescription")}
                </AlertDialogDescription>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <AlertDialogClose
                    render={
                      <Button
                        variant="soft"
                        color="neutral"
                        disabled={pending}
                      />
                    }
                  >
                    {translate("cancel")}
                  </AlertDialogClose>
                  <Button
                    color="error"
                    disabled={pending}
                    onClick={() => run("disconnect")}
                  >
                    {translate("action.tertiary")}
                  </Button>
                </div>
              </AlertDialogPopup>
            </AlertDialog>
          </>
        ) : (
          <Button
            variant="soft"
            disabled={!status?.configured}
            render={
              <a
                href={`/api/integrations/recharge/install?store=${encodeURIComponent(store)}&return_to=${encodeURIComponent("/dashboard/settings")}`}
              />
            }
          >
            {translate("action.primary")}
          </Button>
        )}
      </div>
    </div>
  );
};
