"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import * as Lifecycle from "@/server/app/account-lifecycle";

export const StoreDisconnection = ({
  store,
  domain,
}: {
  store: string;
  domain: string;
}) => {
  const translate = useTranslations("dashboard.lifecycle");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [disconnect, pending] = useAsyncAction(async () => {
    setMessage(null);
    const result = await Lifecycle.disconnectStore({ store });
    if (!result.success) {
      setMessage(translate("error"));
      return;
    }
    if (result.data.status === "blocked") {
      setMessage(translate(`blocked.${result.data.reason}`));
      return;
    }
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="soft" color="neutral" onClick={() => setOpen(true)}>
        {translate("disconnect.action.primary")}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle>{translate("disconnect.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translate("disconnect.description", { domain })}
          </AlertDialogDescription>
          {message && (
            <p role="alert" className="mt-4 text-error text-sm">
              {message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              variant="soft"
              color="neutral"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {translate("action.secondary")}
            </Button>
            <Button color="error" disabled={pending} onClick={disconnect}>
              {pending
                ? translate("action.pending")
                : translate("disconnect.action.primary")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};

export const AccountDeletion = () => {
  const locale = useLocale();
  const translate = useTranslations("dashboard.lifecycle");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [remove, pending] = useAsyncAction(async (data: { email: string }) => {
    setMessage(null);
    const result = await Lifecycle.deleteAccount({ ...data, locale });
    if (!result.success) {
      setMessage(translate("error"));
      return;
    }
    if (result.data.status === "blocked") {
      setMessage(translate(`blocked.${result.data.reason}`));
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  });
  const config = {
    email: field({
      shape: "text",
      type: "email",
      label: translate("delete.email"),
      validator: z.string().email(translate("delete.validation")),
    }),
  };

  return (
    <>
      <Button color="error" onClick={() => setOpen(true)}>
        {translate("delete.action.primary")}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogTitle>{translate("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translate("delete.description")}
          </AlertDialogDescription>
          <p className="my-4 text-foreground-dimmed text-sm">
            {translate("delete.assistance")}{" "}
            <Link
              className="text-primary underline"
              href="mailto:privacy@ecentic.ai"
            >
              privacy@ecentic.ai
            </Link>
          </p>
          <InferredForm
            config={config}
            onSubmit={remove}
            className="grid gap-4"
          >
            {message && (
              <p role="alert" className="text-error text-sm">
                {message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="soft"
                color="neutral"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {translate("action.secondary")}
              </Button>
              <Button type="submit" color="error" disabled={pending}>
                {pending
                  ? translate("action.pending")
                  : translate("delete.action.primary")}
              </Button>
            </div>
          </InferredForm>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};
