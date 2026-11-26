"use client";
import { Button } from "@zenncore/web/components/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
export type ConversationView =
  | "all"
  | "needsReply"
  | "sent"
  | "scheduled"
  | "archived";
export const ConversationViews = ({ view }: { view: ConversationView }) => {
  const t = useTranslations("outbound.conversations");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = (
    ["all", "needsReply", "sent", "scheduled", "archived"] as const
  ).map((value) => ({ value, label: t(`views.${value}`) }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <Select
        value={view}
        items={items}
        disabled={pending}
        onValueChange={(selected) =>
          startTransition(() =>
            router.push(
              selected === "needsReply"
                ? "/replies?needsReply=1"
                : selected === "sent" ||
                    selected === "scheduled" ||
                    selected === "archived"
                  ? `/replies?view=${selected}`
                  : "/replies",
              { scroll: false },
            ),
          )
        }
      >
        <SelectTrigger
          aria-label={t("views.label")}
          className="min-w-48 text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectPositioner align="start" className="z-40">
          <SelectPopup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </Select>
      <Button
        variant="soft"
        color="neutral"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {t("action.quaternary")}
      </Button>
    </div>
  );
};
