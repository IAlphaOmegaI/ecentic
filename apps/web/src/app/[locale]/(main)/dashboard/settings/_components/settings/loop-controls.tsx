"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import * as Loop from "@/server/app/integration/loop/actions";
import type { Status } from "@/server/app/integration/loop/types";
import { LoopReasonMappings } from "./loop-reason-mappings";

export namespace LoopControls {
  export type Props = { store: string; status: Status | null };
}

type Operation = "connect" | "rotate" | "disconnect" | "delete";

/** Keep consent and credentials within the existing store's integration row. */
export const LoopControls = ({ store, status }: LoopControls.Props) => {
  const translate = useTranslations("dashboard.loop");
  const formatter = useFormatter();
  const router = useRouter();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState(false);
  const [run, pending] = useAsyncAction(
    async (
      action: Operation | "sync",
      credentials?: { apiKey?: string; webhookSecret: string },
    ) => {
      setError(false);
      const result = await (async () => {
        switch (action) {
          case "connect":
            return Loop.connect({
              store,
              apiKey: credentials?.apiKey ?? "",
              webhookSecret: credentials?.webhookSecret ?? "",
            });
          case "rotate":
            return Loop.rotateWebhookSecret({
              store,
              webhookSecret: credentials?.webhookSecret ?? "",
            });
          case "disconnect":
            return Loop.disconnect({ store });
          case "delete":
            return Loop.deleteData({ store });
          case "sync":
            return Loop.sync({ store });
        }
      })();
      if (!result.success) {
        setError(true);
        return;
      }
      setOperation(null);
      router.refresh();
    },
  );
  if (status && !status.supported) return null;
  const statusKey = (() => {
    switch (status?.status) {
      case "connected":
        return "connected";
      case "syncing":
        return "syncing";
      case "disconnected":
        return "disconnected";
      case "error":
      case "reconnect_required":
        return "error";
      default:
        return status?.connected ? "pending" : "not_connected";
    }
  })();
  const secret = {
    shape: "text" as const,
    type: "password" as const,
    autoComplete: "off",
    maskToggleLabels: {
      show: translate("showSecret"),
      hide: translate("hideSecret"),
    },
    validator: z
      .string({ error: translate("required") })
      .trim()
      .min(1, translate("required")),
  };

  return (
    <section className="min-w-0 border-accent-foreground border-t">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="min-w-0 max-w-2xl">
          <h4 className="font-semibold text-sm">{translate("title")}</h4>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate(`status.${statusKey}`)}
            {status?.lastSyncedAt && (
              <span className="ml-2">
                {translate("synced", {
                  date: formatter.dateTime(new Date(status.lastSyncedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </span>
            )}
          </p>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("readOnly")}
          </p>
          {status && !status.configured && (
            <p className="mt-2 text-foreground-dimmed text-sm">
              {translate("notConfigured")}
            </p>
          )}
          {status?.cleanupRequired && (
            <p className="mt-2 text-sm text-warning">
              {translate("cleanupRequired")}
            </p>
          )}
          {status?.lastError === "webhook_secret_required" && (
            <p className="mt-2 text-sm text-warning">
              {translate("secretRequired")}
            </p>
          )}
          {status?.status === "reconnect_required" && (
            <p className="mt-2 text-sm text-warning">
              {translate("reconnectRequired")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {status?.connected ? (
            <>
              {status.status !== "reconnect_required" && (
                <>
                  <Button
                    variant="soft"
                    color="neutral"
                    disabled={pending}
                    onClick={() => run("sync")}
                  >
                    {translate("action.secondary")}
                  </Button>
                  <Button
                    variant="ghost"
                    color="neutral"
                    disabled={pending}
                    onClick={() => setOperation("rotate")}
                  >
                    {translate("action.rotate")}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                color="neutral"
                disabled={pending}
                onClick={() => setOperation("disconnect")}
              >
                {translate("action.tertiary")}
              </Button>
            </>
          ) : (
            <Button
              variant="soft"
              disabled={!status?.configured || pending}
              onClick={() => setOperation("connect")}
            >
              {translate("action.primary")}
            </Button>
          )}
          {status && status.status !== "not_connected" && (
            <Button
              variant="ghost"
              color="error"
              disabled={pending}
              onClick={() => setOperation("delete")}
            >
              {translate("action.quaternary")}
            </Button>
          )}
        </div>
      </div>
      {error && !operation && (
        <p role="alert" className="px-4 pb-6 text-error text-sm sm:px-6">
          {translate("actionFailed")}
        </p>
      )}
      {status?.connected && <LoopReasonMappings store={store} />}
      <Dialog
        open={operation !== null}
        onOpenChange={(open) => !open && !pending && setOperation(null)}
      >
        <DialogPopup className="mt-0 max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <DialogTitle>
            {translate(
              operation === "disconnect"
                ? "disconnectTitle"
                : operation === "delete"
                  ? "deleteTitle"
                  : operation === "rotate"
                    ? "rotateTitle"
                    : "setupTitle",
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              operation === "disconnect"
                ? "disconnectBody"
                : operation === "delete"
                  ? "deleteBody"
                  : operation === "rotate"
                    ? "rotateBody"
                    : "intro",
            )}
          </DialogDescription>
          {operation === "connect" && (
            <>
              <ol className="my-6 list-decimal space-y-4 pl-6 text-foreground text-sm">
                <li>{translate("stepOne")}</li>
                <li>{translate("stepTwo")}</li>
                <li>{translate("stepThree")}</li>
              </ol>
              <InferredForm
                key="connect"
                config={{
                  apiKey: field({ ...secret, label: translate("apiKey") }),
                  webhookSecret: field({
                    ...secret,
                    label: translate("webhookSecret"),
                  }),
                }}
                onSubmit={(values) => run("connect", values)}
              >
                <p className="text-foreground-dimmed text-sm">
                  {translate("privacy")}
                </p>
                <Button type="submit" disabled={pending}>
                  {translate(pending ? "working" : "action.primary")}
                </Button>
              </InferredForm>
            </>
          )}
          {operation === "rotate" && (
            <div className="mt-6">
              <InferredForm
                key="rotate"
                config={{
                  webhookSecret: field({
                    ...secret,
                    label: translate("webhookSecret"),
                  }),
                }}
                onSubmit={(values) => run("rotate", values)}
              >
                <Button type="submit" disabled={pending}>
                  {translate(pending ? "working" : "action.save")}
                </Button>
              </InferredForm>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-error text-sm">
              {translate("actionFailed")}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <DialogClose
              render={
                <Button variant="soft" color="neutral" disabled={pending} />
              }
            >
              {translate("cancel")}
            </DialogClose>
            {(operation === "disconnect" || operation === "delete") && (
              <Button
                color="error"
                disabled={pending}
                onClick={() => run(operation)}
              >
                {translate(
                  operation === "disconnect"
                    ? "action.tertiary"
                    : "action.quaternary",
                )}
              </Button>
            )}
          </div>
        </DialogPopup>
      </Dialog>
    </section>
  );
};
