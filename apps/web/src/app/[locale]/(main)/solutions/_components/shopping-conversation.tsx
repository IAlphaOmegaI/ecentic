import { ArrowRightIcon, SearchIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import type { ReactNode } from "react";
import { ProviderLogo } from "@/components/marketing/provider-logo";

/** An open shopping column; the surrounding section owns its edges. */
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
    className="relative flex min-w-0 flex-1 flex-col bg-background-rich text-foreground-rich"
  >
    {provider === "gemini" ? (
      <header className="border-accent-foreground border-b px-5 pt-6 sm:px-8">
        <div className="flex items-start gap-4">
          <ProviderLogo
            provider="google"
            decorative
            className="mt-3 size-7 shrink-0 rounded-none object-center"
          />
          <div className="flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-full bg-background px-5 py-3 shadow-emphasis/5 shadow-sm">
            <p className="min-w-0 flex-1 text-sm leading-relaxed">{prompt}</p>
            <SearchIcon
              aria-hidden
              className="size-5 shrink-0 text-foreground-dimmed"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-6 pl-11">
          <span className="border-primary-text border-b-2 px-1 pb-3 font-medium text-primary-text text-sm">
            AI Mode
          </span>
          <span className="max-w-[28ch] pb-3 text-right text-foreground-dimmed text-xs leading-relaxed">
            {sample}
          </span>
        </div>
      </header>
    ) : (
      <header className="flex items-center justify-between gap-6 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5 font-medium text-lg">
          <ProviderLogo
            provider="chatgpt"
            decorative
            className="size-6 rounded-none object-center"
          />
          <span>ChatGPT</span>
        </div>
        <span className="max-w-[28ch] text-right text-foreground-dimmed text-xs leading-relaxed">
          {sample}
        </span>
      </header>
    )}
    <div className="min-w-0 px-5 pt-7 pb-6 sm:px-8 sm:pt-8">
      {provider === "chatgpt" && (
        <div className="mb-8 ml-auto w-fit max-w-[88%] rounded-lg bg-background px-5 py-3 text-sm leading-relaxed">
          {prompt}
        </div>
      )}
      <p className="max-w-[58ch] text-base leading-relaxed">{response}</p>
      <ul
        className={cn(
          "mt-6 grid min-w-0 gap-5",
          products.length > 1 && "grid-cols-2",
        )}
      >
        {products.map((product) => (
          <li key={product.name} className="min-w-0">
            <div
              className={cn(
                "relative overflow-hidden rounded-lg bg-background-rich",
                product.imageFit === "cover"
                  ? "aspect-[4/3]"
                  : "aspect-[7/8] max-h-64",
              )}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 44vw, (max-width: 1023px) 40vw, 300px"
                className={
                  product.imageFit === "cover"
                    ? "object-cover"
                    : "object-contain"
                }
              />
            </div>
            <div className="pt-4">
              {product.label !== sample && (
                <p className="mb-2 text-foreground-dimmed text-xs">
                  {product.label}
                </p>
              )}
              <p
                className={cn(
                  "font-medium text-base leading-snug",
                  provider === "gemini" && "text-primary-text",
                )}
              >
                {product.name}
              </p>
              <ul className="mt-3 space-y-2 text-foreground text-sm leading-relaxed">
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      {note && (
        <p className="mt-6 max-w-[62ch] text-foreground-dimmed text-sm leading-relaxed">
          {note}
        </p>
      )}
    </div>
    {children && (
      <div className="mt-auto border-accent-foreground border-t px-5 py-5 sm:px-8">
        {children}
      </div>
    )}
  </div>
);

export const ShoppingFollowUp = ({ children }: { children: ReactNode }) => (
  <span className="flex min-w-0 items-center gap-3 whitespace-normal text-left text-sm">
    <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
    {children}
  </span>
);

export namespace ShoppingConversation {
  export type Product = {
    name: string;
    label: string;
    image: string;
    imageFit?: "contain" | "cover";
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
