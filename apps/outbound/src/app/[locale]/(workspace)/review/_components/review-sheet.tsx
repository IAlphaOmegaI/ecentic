"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import { Button } from "@zenncore/web/components/button";
import {
  Sheet,
  SheetDescription,
  SheetPopup,
  SheetTitle,
} from "@zenncore/web/components/sheet";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ReviewContext } from "@/lib/outbound-review-context";
import * as ReviewData from "@/server/app/outbound/review-context";
import { ReviewEditor } from "../[id]/_components/editor";
import { ReviewDetailSkeleton } from "./skeletons";

export const ReviewSheet = ({
  prospectId,
  onClose,
}: {
  prospectId: string;
  onClose: () => void;
}) => {
  const t = useTranslations("outbound");
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setFailed(false);
      try {
        const result = await ReviewData.readReviewContext({ prospectId });
        if (signal?.aborted) return;
        if (result.success && result.data) setContext(result.data);
        else setFailed(true);
      } catch {
        if (!signal?.aborted) setFailed(true);
      }
    },
    [prospectId],
  );
  useEffect(() => {
    const controller = new AbortController();
    startTransition(() => load(controller.signal));
    return () => controller.abort();
  }, [load]);
  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => {
          if (open) return;
          if (dirty) setLeaving(true);
          else onClose();
        }}
      >
        <SheetPopup
          side="right"
          closeLabel={t("review.composition.close")}
          className="h-dvh max-h-dvh w-full max-w-full gap-0 overflow-y-auto bg-background-rich p-0 motion-reduce:transition-none sm:w-5xl sm:max-w-5xl"
          classList={{
            backdrop:
              "bg-emphasis/40 backdrop-blur-sm motion-reduce:transition-none",
          }}
        >
          <div className="border-accent-foreground border-b px-4 py-5 pr-12 sm:px-6 sm:pr-12">
            <SheetTitle>{t("review.composition.title")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("review.composition.why")}
            </SheetDescription>
          </div>
          {pending && !context && <ReviewDetailSkeleton />}
          {failed && (
            <div className="space-y-4 p-6">
              <p role="alert" className="text-error text-sm">
                {t("review.composition.loadError")}
              </p>
              <Button
                variant="soft"
                onClick={() => startTransition(() => load())}
              >
                {t("review.composition.retry")}
              </Button>
            </div>
          )}
          {context && (
            <ReviewEditor
              key={`${context.prospect.id}-${context.prospect.revision}`}
              context={context}
              onChanged={load}
              onDirtyChange={setDirty}
            />
          )}
        </SheetPopup>
      </Sheet>
      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogPopup>
          <AlertDialogTitle>{t("review.queue.discard.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("review.queue.discard.description")}
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogClose
              render={<Button variant="soft" color="neutral" />}
            >
              {t("review.queue.discard.action.secondary")}
            </AlertDialogClose>
            <Button onClick={onClose}>
              {t("review.queue.discard.action.primary")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};
