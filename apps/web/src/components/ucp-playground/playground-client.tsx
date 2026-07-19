"use client";

import { useChat } from "@ai-sdk/react";
import { LoaderIcon, RobotIcon, ShoppingCartIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type ToolUIPart,
} from "ai";
import Link from "next/link";
import { useCallback, useState } from "react";
import { z } from "zod";
import {
  SectionKicker,
  StatusPill,
} from "@/app/(main)/dashboard/_components/grid";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ui/ai/message";
import type { PromptInputMessage } from "@/components/ui/ai/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/ai/prompt-input";
import { Suggestion } from "@/components/ui/ai/suggestion";
import type {
  detailProductSchema,
  lookupProductSchema,
  priceSchema,
  productSchema,
} from "@/server/app/intelligence/ucp/advanced-validator";
import type {
  PlaygroundDataParts,
  PlaygroundUIMessage,
} from "@/server/app/intelligence/ucp/playground";
import { resolvePlaygroundStore } from "@/server/app/intelligence/ucp/playground-actions";

const connectFormConfig = {
  storeUrl: field({
    shape: "text",
    validator: z.string().min(1, "Enter a store domain"),
    label: "Store domain",
    placeholder: "store.example.com",
  }),
} satisfies GenericForm;

const starterSuggestions = [
  "Show me details for the first product",
  "Add the first product to a new cart",
  "Start a checkout for the cart",
];

const isClassicToolUIPart = (
  part: PlaygroundUIMessage["parts"][number],
): part is Extract<PlaygroundUIMessage["parts"][number], ToolUIPart> =>
  isToolUIPart(part) && part.type.startsWith("tool-");

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// Tools throw on failure, so the AI SDK surfaces errors as output-error parts
// (part.errorText) — a successful (output-available) result is always valid.

type UcpMoney = z.infer<typeof priceSchema>;

type UcpProduct = z.infer<
  typeof productSchema | typeof lookupProductSchema | typeof detailProductSchema
>;

// Pull products out of a validated catalog output: search/lookup return
// `products`, get_product returns a single `product`. The validated shapes are
// checked against the UcpProduct view-model — no casts.
const getProducts = (output: CatalogOutput | undefined): UcpProduct[] => {
  if (!output) return [];
  if ("products" in output) return output.products;
  if ("product" in output) return [output.product];
  return [];
};

// UCP money amounts are minor units (e.g. 24750 = $247.50).
const formatMoney = (money: UcpMoney): string => {
  const { amount, currency } = money;
  const value = amount / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const priceLabel = (product: UcpProduct): string | null => {
  const min = formatMoney(product.price_range?.min);
  const max = formatMoney(product.price_range?.max);

  if (!min) return null;
  return max && max !== min ? `${min} – ${max}` : min;
};

const productImage = (product: UcpProduct): string | undefined =>
  product.media?.find((item) => item?.url)?.url;

type UcpVariant = UcpProduct["variants"][number];

type AvailabilityTone = "success" | "warning" | "error" | "muted";

const availabilityDotClass: Record<AvailabilityTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  muted: "bg-foreground-dimmed/40",
};

const availabilityTextClass: Record<AvailabilityTone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  muted: "text-foreground-dimmed",
};

// Map a variant's availability to a short label + tone. Well-known status values
// (in_stock, backorder, preorder, out_of_stock, discontinued) win; otherwise the
// boolean `available` decides. `quantity` is an ecentic extension — appended when
// present and positive.
const variantAvailability = (
  variant: UcpVariant,
): { label: string; tone: AvailabilityTone } => {
  const availability = variant.availability;

  if (!availability) return { label: "—", tone: "muted" };

  const quantity = availability.quantity;
  const suffix =
    typeof quantity === "number" && quantity > 0 ? ` · ${quantity} left` : "";

  const base = ((): { label: string; tone: AvailabilityTone } => {
    switch (availability.status) {
      case "in_stock":
        return { label: "In stock", tone: "success" };
      case "backorder":
        return { label: "Backorder", tone: "warning" };
      case "preorder":
        return { label: "Preorder", tone: "warning" };
      case "out_of_stock":
        return { label: "Out of stock", tone: "error" };
      case "discontinued":
        return { label: "Discontinued", tone: "error" };
      default:
        return availability.available
          ? { label: "Available", tone: "success" }
          : { label: "Unavailable", tone: "error" };
    }
  })();

  return { label: `${base.label}${suffix}`, tone: base.tone };
};

const VariantList = ({ variants }: { variants: UcpVariant[] }) => (
  <ul className="mt-2 space-y-1 border-accent-foreground border-t pt-2">
    {variants.map((variant, index) => {
      const { label, tone } = variantAvailability(variant);
      return (
        <li
          className="flex items-center justify-between gap-2 text-[11px] leading-tight"
          key={variant.id ?? index}
        >
          <span className="min-w-0 flex-1 truncate text-foreground-dimmed">
            {variant.title}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="font-mono text-foreground/80">
              {formatMoney(variant.price)}
            </span>
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  availabilityDotClass[tone],
                )}
              />
              <span className={availabilityTextClass[tone]}>{label}</span>
            </span>
          </span>
        </li>
      );
    })}
  </ul>
);

// A tool message part narrowed by its `tool-<name>` type literal, so part.output
// carries that tool's zod-validated result instead of `unknown`.
type ToolPart<Type extends PlaygroundUIMessage["parts"][number]["type"]> =
  Extract<PlaygroundUIMessage["parts"][number], { type: Type }>;

type CatalogToolPart = ToolPart<
  "tool-search_catalog" | "tool-lookup_catalog" | "tool-get_product"
>;

// The validated output of a catalog tool (output-available). A UCP-level failure
// arrives as { error } and is filtered out before rendering.
type CatalogOutput = NonNullable<
  Extract<CatalogToolPart, { state: "output-available" }>["output"]
>;

// ─── Cart shaping ─────────────────────────────────────────────────────────────
// create_cart / get_cart / update_cart return the cart flat (id, line_items,
// totals, currency, continue_url). Amounts are minor units in the cart currency.

type UcpCartTotal = { type?: string; amount?: number; display_text?: string };

type UcpCartLineItem = {
  id?: string;
  quantity?: number;
  item?: { id?: string; title?: string; price?: number; image_url?: string };
};

type UcpCart = {
  id?: string;
  currency?: string;
  status?: string | null;
  continue_url?: string;
  line_items?: UcpCartLineItem[];
  totals?: UcpCartTotal[];
};

// cancel_cart is intentionally excluded — a cancellation shouldn't render a cart
type CartToolPart = ToolPart<
  "tool-create_cart" | "tool-get_cart" | "tool-update_cart"
>;

type CartOutput = NonNullable<
  Extract<CartToolPart, { state: "output-available" }>["output"]
>;

const isCartToolPart = (
  part: PlaygroundUIMessage["parts"][number],
): part is CartToolPart =>
  part.type === "tool-create_cart" ||
  part.type === "tool-get_cart" ||
  part.type === "tool-update_cart";

const getCart = (output: CartOutput | undefined): UcpCart | null => {
  if (!output) return null;
  return "line_items" in output ? output : null;
};

const ProductCard = ({ product }: { product: UcpProduct }) => {
  const image = productImage(product);
  const price = priceLabel(product);
  // On sale only when the compare-at (list) price is actually higher than the
  // current price — stores send list_price_range { amount: 0 } to mean "none".
  const listMin = product.list_price_range?.min;
  const priceMin = product.price_range?.min;
  const listPrice =
    listMin && priceMin && listMin.amount > priceMin.amount
      ? formatMoney(listMin)
      : null;
  const onSale = listPrice !== null;
  const variantCount = product.variants?.length ?? 0;

  const card = (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-accent-foreground bg-background-rich transition-colors hover:border-primary">
      <div className="aspect-square overflow-hidden bg-background-dimmed">
        {image ? (
          // biome-ignore lint/performance/noImgElement: arbitrary store CDNs can't be whitelisted for next/image
          <img
            alt={product.title ?? ""}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            src={image}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] text-foreground-dimmed/40 uppercase tracking-[0.08em]">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 font-medium text-foreground-rich text-sm leading-tight">
          {product.title ?? "Untitled product"}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="flex items-baseline gap-1.5">
            {price && (
              <span className="font-semibold text-primary text-sm">
                {price}
              </span>
            )}
            {onSale && (
              <span className="text-[11px] text-foreground-dimmed line-through">
                {listPrice}
              </span>
            )}
          </span>
          {variantCount > 1 && (
            <span className="shrink-0 text-[10px] text-foreground-dimmed uppercase tracking-[0.06em]">
              {variantCount} variants
            </span>
          )}
        </div>
        {product.variants && product.variants.length > 0 && (
          <VariantList variants={product.variants} />
        )}
      </div>
    </div>
  );

  if (!product.url) return card;

  return (
    <a
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      href={product.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {card}
    </a>
  );
};

const ProductGrid = ({ products }: { products: UcpProduct[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {products.map((product, index) => (
      <ProductCard key={product.id ?? index} product={product} />
    ))}
  </div>
);

const ToolView = ({ part }: { part: ToolUIPart }) => {
  const name = getToolName(part);
  const output = part.state === "output-available" ? part.output : undefined;
  const error = part.state === "output-error" ? part.errorText : undefined;
  const pending =
    part.state === "input-streaming" || part.state === "input-available";
  const tone = error ? "error" : pending ? "primary" : "success";
  const label = error ? "Failed" : pending ? "Running" : "Done";

  return (
    <div className="overflow-hidden rounded-lg border border-accent-foreground bg-background-dimmed font-mono text-xs">
      <div className="flex items-center gap-2 border-accent-foreground border-b px-3 py-2">
        <span className="text-foreground-dimmed">▶</span>
        <span className="font-semibold text-foreground-rich">{name}</span>
        <StatusPill className="ml-auto" tone={tone}>
          {label}
        </StatusPill>
      </div>
      <div className="space-y-3 p-3">
        {/* Errors stay visible; the raw arg/result JSON collapses so a multi-
            step agent session isn't a wall of monospace blobs. Matches the
            "Raw JSON" disclosure used by ProductsCard. */}
        {error && (
          <div>
            <p className="mb-1 font-medium text-[10px] text-error uppercase tracking-[0.08em]">
              Error
            </p>
            <p className="wrap-break-word text-error">{error}</p>
          </div>
        )}
        <details className="group">
          <summary className="w-fit cursor-pointer list-none font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em] hover:text-foreground [&::-webkit-details-marker]:hidden">
            Raw JSON
          </summary>
          <div className="mt-2 space-y-3">
            <div>
              <p className="mb-1 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Arguments
              </p>
              <pre className="overflow-x-auto text-foreground/80">
                {formatJson(part.input)}
              </pre>
            </div>
            {output !== undefined && (
              <div>
                <p className="mb-1 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                  Result
                </p>
                <pre className="max-h-64 overflow-auto text-foreground/80">
                  {formatJson(output)}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

const ErrorView = ({ message }: { message: string }) => (
  <div className="flex w-fit items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-error text-xs">
    <span className="shrink-0">✕</span>
    <span className="font-mono">{message}</span>
  </div>
);

const Thinking = () => (
  <div className="flex items-center gap-1.5 py-1.5">
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed [animation-delay:-0.2s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed [animation-delay:-0.1s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed" />
  </div>
);

const CartView = ({ cart }: { cart: UcpCart }) => {
  const currency = cart.currency ?? "USD";
  const lineItems = cart.line_items ?? [];
  const totalRow =
    cart.totals?.find((total) => total.type === "total") ?? cart.totals?.at(-1);
  const itemCount = lineItems.reduce(
    (sum, item) => sum + (item.quantity ?? 1),
    0,
  );

  return (
    <div className="w-fit overflow-hidden rounded-xl border border-accent-foreground bg-background-rich">
      <div className="flex items-center justify-between gap-2 border-accent-foreground border-b bg-background-dimmed px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon className="size-4 text-primary" />
          <span className="font-medium text-foreground-rich text-sm">Cart</span>
          <span className="text-foreground-dimmed text-xs">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
        {totalRow?.amount && (
          <span className="font-semibold text-primary text-sm">
            {formatMoney({ amount: totalRow.amount, currency })}
          </span>
        )}
      </div>

      {lineItems.length > 0 && (
        <ul className="divide-y divide-accent-foreground">
          {lineItems.map((line, index) => (
            <li
              className="flex items-center gap-3 px-4 py-3"
              key={line.id ?? index}
            >
              <div className="size-12 shrink-0 overflow-hidden rounded-md bg-background-dimmed">
                {line.item?.image_url && (
                  // biome-ignore lint/performance/noImgElement: arbitrary store CDNs can't be whitelisted for next/image
                  <img
                    alt={line.item.title ?? ""}
                    className="size-full object-cover"
                    loading="lazy"
                    src={line.item.image_url}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground text-sm">
                  {line.item?.title ?? "Item"}
                </p>
                <p className="text-foreground-dimmed text-xs">
                  Qty {line.quantity ?? 1}
                </p>
              </div>
              {line.item?.price && (
                <span className="shrink-0 font-mono text-foreground text-sm">
                  {formatMoney({ amount: line.item.price, currency })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {cart.totals && cart.totals.length > 0 && (
        <div className="space-y-1 border-accent-foreground border-t px-4 py-3">
          {cart.totals.map((total) => {
            const isTotal = total.type === "total";
            return (
              <div
                className={cn(
                  "flex items-center justify-between gap-2",
                  isTotal
                    ? "pt-1 font-semibold text-foreground-rich text-sm"
                    : "text-foreground-dimmed text-xs",
                )}
                key={total.type ?? total.display_text ?? "total-row"}
              >
                <span>{total.display_text ?? total.type}</span>
                {total.amount && (
                  <span className="font-mono">
                    {formatMoney({ amount: total.amount, currency })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cart.continue_url && (
        <a
          className="block border-accent-foreground border-t px-4 py-2.5 text-center font-medium text-primary text-xs transition-colors hover:bg-primary/5"
          href={cart.continue_url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open cart ↗
        </a>
      )}
    </div>
  );
};

const ToolLoading = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-accent-foreground bg-background-rich px-4 py-3 text-foreground-dimmed text-sm">
    <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
    {label}
  </div>
);

const cartLoadingLabel = (type: CartToolPart["type"]): string => {
  switch (type) {
    case "tool-create_cart":
      return "Creating cart…";
    case "tool-get_cart":
      return "Loading cart…";
    default:
      return "Updating cart…";
  }
};

const CartPart = ({
  part,
  isStreaming,
}: {
  part: CartToolPart;
  isStreaming: boolean;
}) => {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return <ToolLoading label={cartLoadingLabel(part.type)} />;
  }
  if (part.state === "output-error") {
    return <ErrorView message={part.errorText ?? "Cart operation failed"} />;
  }

  // While the turn is still running a resolved cart can still be superseded — the
  // agent reads with get_cart before writing with update_cart, and the write only
  // appears after the model finishes generating its arguments. Hold the loader
  // rather than flash the pre-update cart; the card renders once the turn settles.
  if (isStreaming) return <ToolLoading label={cartLoadingLabel(part.type)} />;

  const output = part.state === "output-available" ? part.output : undefined;

  const cart = getCart(output);
  if (!cart) return <ToolView part={part} />;

  return <CartView cart={cart} />;
};

const ProductsCard = ({
  products,
  output,
}: {
  products: UcpProduct[];
  output: unknown;
}) => (
  <div className="space-y-2">
    <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
      {products.length} product{products.length === 1 ? "" : "s"}
    </p>
    <ProductGrid products={products} />
    <details className="group">
      <summary className="cursor-pointer list-none text-[10px] text-foreground-dimmed uppercase tracking-[0.08em] hover:text-foreground">
        Raw JSON
      </summary>
      <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-accent-foreground bg-background-dimmed p-3 font-mono text-foreground/80 text-xs">
        {formatJson(output)}
      </pre>
    </details>
  </div>
);

const CatalogPart = ({ part }: { part: CatalogToolPart }) => {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return <ToolLoading label="Searching catalog…" />;
  }
  if (part.state === "output-error") {
    return <ErrorView message={part.errorText ?? "Catalog request failed"} />;
  }

  const output = part.state === "output-available" ? part.output : undefined;

  const products = getProducts(output);

  if (products.length === 0) return <ToolView part={part} />;

  return <ProductsCard output={output} products={products} />;
};

const MessageParts = ({
  message,
  isStreaming,
}: {
  message: PlaygroundUIMessage;
  isStreaming: boolean;
}) => {
  const hasVisibleContent = message.parts.some(
    (part) => part.type !== "step-start",
  );

  // A turn usually reads the cart (get_cart) before writing it (update_cart). Render
  // only the last cart part — regardless of state — so the stale cart never shows:
  // while the write is in flight you get its "Updating cart…" loader, then the final
  // cart replaces it.
  const lastCartIndex = message.parts.reduce(
    (latest, part, index) => (isCartToolPart(part) ? index : latest),
    -1,
  );

  return (
    <>
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;

        if (part.type === "text") {
          return part.text ? (
            <MessageResponse key={key}>{part.text}</MessageResponse>
          ) : null;
        }
        if (part.type === "data-error") {
          console.error(part.data);
          return <ErrorView key={key} message={part.data.message} />;
        }

        if (
          part.type === "tool-search_catalog" ||
          part.type === "tool-lookup_catalog" ||
          part.type === "tool-get_product"
        ) {
          return <CatalogPart key={key} part={part} />;
        }
        if (isCartToolPart(part)) {
          // Superseded by a later cart part in this turn — skip the stale state.
          if (index !== lastCartIndex) return null;

          return <CartPart isStreaming={isStreaming} key={key} part={part} />;
        }
        if (isClassicToolUIPart(part)) {
          return <ToolView key={key} part={part} />;
        }
        return null;
      })}
      {message.role === "assistant" && !hasVisibleContent && <Thinking />}
    </>
  );
};

const MessageQuotaWall = ({ limit }: { limit: number }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-accent-foreground bg-background-dimmed px-4 py-6 text-center">
    <p className="font-medium text-foreground-rich text-sm">
      You've used all {limit} free playground messages
    </p>
    <p className="max-w-sm text-foreground-dimmed text-xs">
      Create an account to keep running UCP flows against your own store — no
      message limit.
    </p>
    <Button color="primary" render={<Link href="/sign-up" />}>
      Create free account
    </Button>
  </div>
);

const transport = new DefaultChatTransport<PlaygroundUIMessage>({
  api: "/api/ucp-playground",
});

type PlaygroundClientProps = {
  /** Seeds the connect form — the store opened in the dashboard, if any. */
  defaultStoreUrl?: string;
  /** A store already resolved on the server, so the session starts connected. */
  initialConnection?: PlaygroundDataParts["profile"] | null;
  /**
   * Caps how many messages the visitor may send. Set for anonymous visitors on
   * the public playground; the API route enforces the same cap server-side.
   */
  messageLimit?: number;
  /**
   * Hides the "Change store" control. Set in the dashboard, where the session is
   * pinned to the store the URL is scoped to.
   */
  lockStore?: boolean;
};

export const PlaygroundClient = ({
  defaultStoreUrl = "",
  initialConnection = null,
  messageLimit,
  lockStore = false,
}: PlaygroundClientProps) => {
  const [storeUrl, setStoreUrl] = useState(
    initialConnection ? defaultStoreUrl : "",
  );
  const [connection, setConnection] = useState<
    PlaygroundDataParts["profile"] | null
  >(initialConnection);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [text, setText] = useState("");

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    clearError,
  } = useChat<PlaygroundUIMessage>({
    transport,
    // Throttle UI updates so streaming large tool-result JSON doesn't re-render
    // the transcript on every token.
    // experimental_throttle: 50
  });

  const isGenerating = status === "submitted" || status === "streaming";

  // Anonymous visitors get a fixed budget. Counting locally only keeps the UI
  // honest within a session — the route's redis counter is the real gate.
  const sentMessages = messages.filter(
    (message) => message.role === "user",
  ).length;
  const remainingMessages =
    messageLimit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, messageLimit - sentMessages);
  const isOutOfMessages = remainingMessages === 0;

  const canSend = text.trim().length > 0 && !isOutOfMessages;

  const hostOf = (value: string): string => {
    try {
      return new URL(value.startsWith("http") ? value : `https://${value}`)
        .host;
    } catch {
      return value;
    }
  };

  const connectedHost = connection ? hostOf(connection.profileUrl) : null;

  const [handleConnect, isConnecting] = useAsyncAction(
    async ({ storeUrl: domain }: FormEntries<typeof connectFormConfig>) => {
      setConnectError(null);

      const resolution = await resolvePlaygroundStore({ store: domain });

      if (!resolution.success) {
        setConnectError(resolution.error.message);
        return;
      }

      setStoreUrl(domain);
      setConnection(resolution.data);
    },
  );

  const handleDisconnect = useCallback(() => {
    setConnection(null);
    setConnectError(null);
    setMessages([]);
    clearError();
  }, [setMessages, clearError]);

  const submit = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value || !storeUrl.trim() || isGenerating || isOutOfMessages) return;

      sendMessage({ text: value }, { body: { storeUrl: storeUrl.trim() } });
      setText("");
    },
    [sendMessage, storeUrl, isGenerating, isOutOfMessages],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => submit(message.text ?? ""),
    [submit],
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const isEmpty = messages.length === 0;

  if (!connection) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1 text-center">
            <h2 className="font-semibold text-foreground-rich text-lg">
              Connect a UCP store
            </h2>
            <p className="text-foreground-dimmed text-sm">
              Enter a store domain to resolve its UCP profile and start a
              session.
            </p>
          </div>
          <InferredForm
            className="flex flex-col gap-3"
            config={connectFormConfig}
            defaultValues={{ storeUrl: defaultStoreUrl }}
            onSubmit={handleConnect}
          >
            <Button
              className="w-full"
              color="primary"
              disabled={isConnecting}
              type="submit"
            >
              {isConnecting && <LoaderIcon className="size-4 animate-spin" />}
              {isConnecting ? "Connecting…" : "Connect"}
            </Button>
          </InferredForm>
          {connectError && <ErrorView message={connectError} />}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-40 flex-1 flex-col divide-y divide-accent-foreground">
      {/* Connected store + transport */}
      <div className="flex shrink-0 items-center justify-between gap-3 p-4">
        <SectionKicker>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 normal-case">
            <span className="font-mono font-semibold text-primary">
              {connectedHost}
            </span>
            <StatusPill
              tone={connection.transport === "mcp" ? "primary" : "warning"}
            >
              {connection.transport}
            </StatusPill>
            <span className="min-w-0 truncate font-mono text-[11px] text-foreground-dimmed lowercase">
              {connection.endpoint}
            </span>
          </span>
        </SectionKicker>
        {!lockStore && (
          <button
            className="shrink-0 font-medium text-foreground-dimmed text-xs hover:text-foreground"
            onClick={handleDisconnect}
            type="button"
          >
            Change store
          </button>
        )}
      </div>

      {/* Conversation */}
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto min-h-full w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl border border-accent-foreground bg-background-dimmed">
                <RobotIcon className="size-6 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-semibold text-foreground-rich text-xl">
                  What should the agent do?
                </h2>
                <p className="mx-auto max-w-md text-foreground-dimmed text-sm leading-relaxed">
                  You&apos;re connected to{" "}
                  <span className="font-mono text-foreground">
                    {connectedHost}
                  </span>
                  . The agent runs live UCP calls — search the catalog, inspect
                  a product, build a cart, or start a checkout.
                </p>
              </div>
              {!isOutOfMessages && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {starterSuggestions.map((suggestion) => (
                    <Suggestion
                      color="primary"
                      key={suggestion}
                      onClick={submit}
                      suggestion={suggestion}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageParts
                    isStreaming={isGenerating && index === messages.length - 1}
                    message={message}
                  />
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="shrink-0 p-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          {error && (
            <ErrorView message={error.message || "Something went wrong"} />
          )}
          {isOutOfMessages ? (
            <MessageQuotaWall limit={messageLimit ?? 0} />
          ) : (
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  className="field-sizing-content max-h-48 px-4 pt-3.5 pb-1"
                  disabled={isGenerating}
                  onChange={handleTextChange}
                  placeholder={`Ask the agent to shop ${connectedHost}…`}
                  rows={1}
                  value={text}
                />
                <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2.5">
                  <span className="hidden text-[11px] text-foreground-dimmed sm:block">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <PromptInputSubmit
                    className="ml-auto"
                    color="primary"
                    disabled={isGenerating ? false : !canSend}
                    onStop={stop}
                    status={status}
                    variant="default"
                  />
                </div>
              </PromptInputBody>
            </PromptInput>
          )}
          {messageLimit !== undefined && !isOutOfMessages && (
            <p className="text-center text-[11px] text-foreground-dimmed">
              {remainingMessages} of {messageLimit} free message
              {messageLimit === 1 ? "" : "s"} left in this playground.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
