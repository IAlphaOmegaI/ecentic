"use client";

import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

export const PipelineRefresh = () => {
  const t = useTranslations("outbound.pipeline");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  useEffect(() => {
    busy.current = pending;
  }, [pending]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden" || busy.current) return;
      startTransition(() => router.refresh());
    }, 30_000);
    return () => clearInterval(interval);
  }, [router]);
  return (
    <Button
      variant="soft"
      color="neutral"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {t(pending ? "refreshing" : "refresh")}
    </Button>
  );
};
