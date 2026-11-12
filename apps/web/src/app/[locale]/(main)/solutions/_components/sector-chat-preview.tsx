import { CommerceCode_3Icon } from "@zenncore/icons";
import type { getMessages } from "next-intl/server";
import type { Sector } from "@/content/sectors";
import { ShoppingConversation } from "./shopping-conversation";
import { shoppingProductImage } from "./shopping-products";

type Copy = Awaited<ReturnType<typeof getMessages>>["reviewSolutionsChannels"];

export const SectorChatPreview = ({
  prompt,
  example,
  copy,
  sector,
  provider,
}: {
  prompt: string;
  example: Copy["sectors"][number];
  copy: Pick<Copy, "sample" | "assistant" | "discovery" | "discoveryNote">;
  sector: Sector;
  provider: "chatgpt" | "gemini";
}) => (
  <div data-sector-chat className="mt-6 min-w-0">
    <ShoppingConversation
      provider={provider}
      prompt={prompt}
      response={example.response}
      products={[
        {
          name: example.product,
          label: copy.sample,
          image: shoppingProductImage(sector),
          details: example.details,
        },
      ]}
      sample={copy.sample}
      note={example.limit}
    />
    <div className="mt-3 rounded-xl bg-emphasis-dimmed px-5 py-4 text-background-rich">
      <div className="mb-2 flex items-center gap-2 text-background-rich/75 text-xs">
        <CommerceCode_3Icon aria-hidden className="size-4 text-primary-rich" />
        {copy.discovery}
      </div>
      <code className="block break-words text-primary-rich text-xs">
        {'{ "ucp": { "version": "2026-04-08" } }'}
      </code>
      <p className="mt-2 text-background-rich/70 text-xs leading-relaxed">
        {copy.discoveryNote}
      </p>
    </div>
  </div>
);
