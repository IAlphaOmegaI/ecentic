"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import * as Checks from "@/server/app/recharge-offer-check-actions";

export const RechargeCheckControl = ({
  store,
  configured,
  pending,
}: {
  store: string;
  configured: boolean;
  pending: boolean;
}) => {
  const translate = useTranslations("dashboard.recharge");
  const router = useRouter();
  const [message, setMessage] = useState<
    "queued" | "limit" | "actionFailed" | null
  >(null);
  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [pending, router]);
  const [run, running] = useAsyncAction(async () => {
    const result = await Checks.request({ store });
    setMessage(
      !result.success
        ? "actionFailed"
        : result.data.queued > 0
          ? "queued"
          : "limit",
    );
    if (result.success) router.refresh();
  });
  return (
    <div className="max-w-sm">
      <Button
        variant="soft"
        color="neutral"
        disabled={!configured || pending || running}
        onClick={() => run()}
      >
        {translate(pending ? "checking" : "action.quaternary")}
      </Button>
      <p className="mt-2 text-foreground-dimmed text-xs">
        {translate(configured ? "checkCost" : "checksNotConfigured")}
      </p>
      {message && (
        <p role="status" className="mt-2 text-foreground-dimmed text-sm">
          {translate(message)}
        </p>
      )}
    </div>
  );
};
