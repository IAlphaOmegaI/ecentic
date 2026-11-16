"use client";

import { CopyIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";

export const FeedUrlCard = ({ url }: { url: string }) => {
  const translate = useTranslations("dashboard.visibility.feedUrl");
  const toast = useToastManager();
  const errors = useTranslations("dashboard.research.unavailable");

  return (
    <div className="flex flex-col gap-3 border-accent-foreground border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      <p className="min-w-0 flex-1 truncate font-mono text-foreground-dimmed text-xs">
        {url}
      </p>
      <Button
        color="neutral"
        variant="soft"
        className="w-fit shrink-0 gap-1.5"
        onClick={async () => {
          const result = await resultify(() =>
            navigator.clipboard.writeText(url),
          );
          if (!result.success) {
            toast.add({
              title: errors("title"),
              description: errors("description"),
              type: "error",
            });
            return;
          }
          toast.add({
            title: translate("toast.title"),
            description: translate("toast.description"),
            type: "success",
          });
        }}
      >
        <CopyIcon aria-hidden className="size-4" />
        {translate("action.primary")}
      </Button>
    </div>
  );
};
