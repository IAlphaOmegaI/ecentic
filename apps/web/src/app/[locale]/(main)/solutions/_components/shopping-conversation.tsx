import { ArrowRightIcon, ChevronDownIcon, SearchIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import type { ReactNode } from "react";
import { ProviderLogo } from "@/components/marketing/provider-logo";

/** A scripted shopping surface, informed by the supplied provider captures. */
export const ShoppingConversation = ({
  provider = "chatgpt",
  prompt,
  response,
  products,
  sample,
  note,
  children,
}: ShoppingConversation.Props) => (
  <div
    data-shopping-conversation={provider}
    className={cn(
      "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-accent-foreground bg-background-rich text-foreground-rich shadow-emphasis/5 shadow-sm",
      provider === "gemini" &&
        "bg-linear-to-b from-primary/5 via-background-rich to-background-rich",
    )}
  >
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-2 font-medium text-base">
        <ProviderLogo
          provider={provider === "gemini" ? "google" : provider}
          decorative
          className="size-6 rounded-none object-center"
        />
        <span>{provider === "chatgpt" ? "ChatGPT" : "AI Mode"}</span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 text-foreground-dimmed"
        />
      </div>
      <span className="text-right text-foreground-dimmed text-xs">
        {sample}
      </span>
    </header>
    <div className="min-w-0 px-4 pt-6 pb-4 sm:px-6">
      <div
        className={cn(
          provider === "chatgpt"
            ? "ml-auto w-fit max-w-[92%] rounded-3xl bg-background-dimmed px-5 py-3 text-sm leading-relaxed"
            : "max-w-[32ch] font-heading text-xl leading-snug",
        )}
      >
        {prompt}
      </div>
      <div className="mt-8 flex items-center gap-2 text-foreground-dimmed text-xs">
        <SearchIcon aria-hidden className="size-4" />
        <span>
          {products.length === 1
            ? products[0]?.label
            : products.map((product) => product.label).join(" · ")}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed">{response}</p>
      <div
        className={cn(
          "mt-5 grid min-w-0 gap-3",
          products.length > 1 && "grid-cols-2",
        )}
      >
        {products.map((product) => (
          <article
            key={product.name}
            className="min-w-0 overflow-hidden rounded-xl border border-accent-foreground bg-background-rich"
          >
            <div
              className={cn(
                "relative bg-background-rich",
                products.length === 1 ? "h-52" : "h-40 sm:h-48",
              )}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 42vw, 240px"
                className="object-contain p-2"
              />
            </div>
            <div className="px-4 pt-2 pb-4">
              <p className="text-foreground-dimmed text-xs">{product.label}</p>
              <p className="mt-2 font-medium text-sm leading-snug">
                {product.name}
              </p>
              <ul className="mt-3 space-y-2 text-foreground-dimmed text-xs leading-relaxed">
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
      {note && (
        <p className="mt-4 text-foreground-dimmed text-xs leading-relaxed">
          {note}
        </p>
      )}
    </div>
    {children && (
      <div className="mt-auto border-accent-foreground border-t px-4 py-4 sm:px-6">
        {children}
      </div>
    )}
  </div>
);

export const ShoppingFollowUp = ({ children }: { children: ReactNode }) => (
  <span className="flex min-w-0 items-center gap-2 whitespace-normal text-left text-sm">
    <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
    {children}
  </span>
);

export namespace ShoppingConversation {
  export type Product = {
    name: string;
    label: string;
    image: string;
    details: readonly string[];
  };
  export type Props = {
    provider?: "chatgpt" | "gemini";
    prompt: string;
    response: string;
    products: readonly Product[];
    sample: string;
    note?: string;
    children?: ReactNode;
  };
}
