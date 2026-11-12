import {
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
} from "@zenncore/icons";
import type { getMessages } from "next-intl/server";

type Copy = Awaited<ReturnType<typeof getMessages>>["reviewSolutionsChannels"];

/** A neutral conversation mockup keeps the example separate from a provider's answer. */
export const SectorChatPreview = ({
  prompt,
  example,
  copy,
}: {
  prompt: string;
  example: Copy["sectors"][number];
  copy: Pick<Copy, "sample" | "assistant" | "discovery" | "discoveryNote">;
}) => (
  <div
    data-sector-chat
    className="mt-6 overflow-hidden rounded-lg border border-accent-foreground bg-background-rich shadow-emphasis/5 shadow-sm"
  >
    <div className="flex items-center justify-between gap-4 border-accent-foreground border-b px-4 py-3 text-foreground-dimmed text-xs">
      <span>{copy.assistant}</span>
      <span>{copy.sample}</span>
    </div>
    <div className="space-y-4 p-4">
      <p className="ml-8 rounded-xl rounded-tr-sm bg-background-dimmed px-4 py-3 text-foreground-rich text-sm leading-relaxed">
        {prompt}
      </p>
      <p className="max-w-[48ch] text-foreground text-sm leading-relaxed">
        {example.response}
      </p>
      <div className="flex items-center gap-4 rounded-md border border-accent-foreground bg-background p-3">
        <div
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-md border border-primary/15 bg-linear-to-br from-background-rich to-primary/10"
        >
          <CommerceBasketShoppingIcon className="size-8 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground-rich text-sm">
            {example.product}
          </p>
          <ul className="mt-2 space-y-1 text-foreground-dimmed text-xs">
            {example.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-foreground-dimmed text-xs leading-relaxed">
        {example.limit}
      </p>
    </div>
    <div className="border-accent-foreground border-t bg-emphasis-dimmed px-4 py-3 text-background-rich">
      <div className="mb-2 flex items-center gap-2 text-background-rich/65 text-xs">
        <CommerceCode_3Icon aria-hidden className="size-4 text-primary-rich" />
        {copy.discovery}
      </div>
      <code className="block break-words text-primary-rich text-xs">
        {'{ "ucp": { "version": "2026-04-08" } }'}
      </code>
      <p className="mt-2 text-background-rich/60 text-xs leading-relaxed">
        {copy.discoveryNote}
      </p>
    </div>
  </div>
);
