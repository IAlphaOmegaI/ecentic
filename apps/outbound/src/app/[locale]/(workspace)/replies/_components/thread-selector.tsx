"use client";
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
import type { ConversationSummary } from "@/lib/outbound-conversations";
export const ConversationThreadSelector = ({
  selected,
  threads,
  disabled = false,
}: {
  selected: ConversationSummary;
  threads: ConversationSummary[];
  disabled?: boolean;
}) => {
  const t = useTranslations("outbound.conversations");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = threads.map((thread) => ({
    value: thread.id,
    label: `${t(`channel.${thread.channel}`)} · ${thread.accountLabel}${thread.archivedAt ? ` · ${t("views.archived")}` : thread.needsReply ? ` · ${t("needsReply")}` : ""}`,
  }));
  return (
    <div className="mb-6 space-y-2">
      <p className="text-foreground-dimmed text-sm">{t("replyAccount")}</p>
      <Select
        value={selected.id}
        items={items}
        disabled={disabled || pending}
        onValueChange={(threadId) => {
          if (threadId)
            startTransition(() =>
              router.push(
                `/replies/${selected.prospectId}?thread=${threadId}`,
                { scroll: false },
              ),
            );
        }}
      >
        <SelectTrigger
          aria-label={t("replyAccount")}
          className="w-full min-w-0 text-sm"
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
    </div>
  );
};
