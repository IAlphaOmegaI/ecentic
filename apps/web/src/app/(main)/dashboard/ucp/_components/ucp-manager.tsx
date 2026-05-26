"use client";

import {
  CheckBadgeIcon,
  CheckIcon,
  CopyIcon,
  PhotoIcon,
  SunsetIcon,
} from "@zenncore/icons";
import { cn, removeUndefinedEntries } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type ColumnDef,
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import type { ComponentProps, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { UcpValidatorForm } from "@/app/(main)/ucp-validator/_components/ucp-validator-form";
import { formatPrice } from "@/lib/currency";
import type * as Ucp from "@/server/app/intelligence/ucp";
import {
  generateAllProductStructuredData,
  generateJson,
  generateProductStructuredData,
  publishProductsToShopify,
  publishProfileToShopify,
  saveProfile,
} from "@/server/app/intelligence/ucp";
import type * as Product from "@/server/app/product";
import { UcpAdvancedValidator } from "./ucp-advanced-validator";

// ─── JSON syntax highlighter ────────────────────────────────────────────────

type JToken = {
  text: string;
  type: "key" | "string" | "number" | "boolean" | "null" | "punct" | "space";
};

const tokenizeJson = (json: string): JToken[] => {
  const tokens: JToken[] = [];
  let i = 0;
  while (i < json.length) {
    if (/\s/.test(json[i])) {
      let text = "";
      while (i < json.length && /\s/.test(json[i])) text += json[i++];
      tokens.push({ text, type: "space" });
      continue;
    }
    if (json[i] === '"') {
      let text = '"';
      i++;
      while (i < json.length && json[i] !== '"') {
        if (json[i] === "\\") text += json[i++];
        text += json[i++];
      }
      text += '"';
      i++;
      let j = i;
      while (j < json.length && /\s/.test(json[j])) j++;
      tokens.push({ text, type: json[j] === ":" ? "key" : "string" });
      continue;
    }
    if (/[-\d]/.test(json[i])) {
      let text = "";
      while (i < json.length && /[-\d.eE+]/.test(json[i])) text += json[i++];
      tokens.push({ text, type: "number" });
      continue;
    }
    if (json.startsWith("true", i) || json.startsWith("false", i)) {
      const word = json.startsWith("true", i) ? "true" : "false";
      tokens.push({ text: word, type: "boolean" });
      i += word.length;
      continue;
    }
    if (json.startsWith("null", i)) {
      tokens.push({ text: "null", type: "null" });
      i += 4;
      continue;
    }
    tokens.push({ text: json[i++], type: "punct" });
  }
  return tokens;
};

const tokenColor: Record<JToken["type"], string> = {
  key: "text-blue-400",
  string: "text-green-400",
  number: "text-orange-400",
  boolean: "text-purple-400",
  null: "text-orange-300/60",
  punct: "text-foreground-dimmed/60",
  space: "",
};

const JsonCode = ({ json }: { json: string }) => (
  <code>
    {tokenizeJson(json).map((token, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: token index is stable
      <span key={index} className={tokenColor[token.type]}>
        {token.text}
      </span>
    ))}
  </code>
);

// ─── Field icons ────────────────────────────────────────────────────────────

const StoreIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path
      d="M2 6h12v8H2V6ZM1 6l2-4h10l2 4M6 14V9h4v5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TextIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path
      d="M2 4h12M2 8h8M2 12h10"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const CreditCardIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <rect
      x="1"
      y="3"
      width="14"
      height="10"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M1 7h14M4 10h2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const TruckIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path
      d="M1 4h9v7H1V4ZM10 6l3 2v3h-3V6ZM3.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RefreshIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path
      d="M13.5 3A6.5 6.5 0 0 0 2 8M2.5 13A6.5 6.5 0 0 0 14 8M13 1v3h-3M3 15v-3h3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailIcon = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <rect
      x="1"
      y="3"
      width="14"
      height="10"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M1 4l7 5 7-5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type FieldIconComponent = (props: ComponentProps<"svg">) => ReactElement;

const definitionIcons: Record<string, FieldIconComponent> = {
  merchantName: StoreIcon,
  description: TextIcon,
  logoUrl: PhotoIcon,
  paymentMethods: CreditCardIcon,
  shippingPolicy: TruckIcon,
  returnPolicy: RefreshIcon,
  contactEmail: MailIcon,
  sustainability: SunsetIcon,
  certifications: CheckBadgeIcon,
};

// ─── Definitions ────────────────────────────────────────────────────────────

const definitions = [
  { key: "merchantName" as const, label: "Merchant Name" },
  { key: "description" as const, label: "Description" },
  { key: "logoUrl" as const, label: "Logo URL" },
  { key: "paymentMethods" as const, label: "Payment Methods" },
  { key: "shippingPolicy" as const, label: "Shipping Policy" },
  { key: "returnPolicy" as const, label: "Return Policy" },
  { key: "contactEmail" as const, label: "Contact Email" },
  { key: "sustainability" as const, label: "Sustainability" },
  { key: "certifications" as const, label: "Certifications" },
] as const;

type ProductRow = Product.Type & { _id: string };

export namespace UcpManager {
  export type Props = {
    profile: Ucp.Type | null;
    products: Product.Type[];
    shopifyStores: { id: string; name: string }[];
  };
}

export const UcpManager = ({
  profile,
  products,
  shopifyStores,
}: UcpManager.Props) => {
  const toast = useToastManager();
  const [state, setState] = useState<Ucp.Profile>(profile ?? {});
  const [generation, setGeneration] = useState<string | null>(
    profile?.generatedJson ?? null,
  );
  const [productData, setProductData] = useState<Record<string, string | null>>(
    Object.fromEntries(
      products.map((product) => [product.id, product.structuredData ?? null]),
    ),
  );
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const filledCount = useMemo(
    () => definitions.filter(({ key }) => Boolean(state[key])).length,
    [state],
  );
  const score = Math.round((filledCount / definitions.length) * 100);

  const coveredCount = useMemo(
    () => products.filter((p) => Boolean(productData[p.id])).length,
    [products, productData],
  );
  const coverage = products.length
    ? Math.round((coveredCount / products.length) * 100)
    : 0;

  const live = useMemo(() => {
    const json = removeUndefinedEntries({
      "@context": "https://ucp.ai/schema",
      "@type": "Merchant",
      name: state.merchantName,
      description: state.description,
      logo: state.logoUrl,
      paymentMethods: state.paymentMethods
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      shippingPolicy: state.shippingPolicy,
      returnPolicy: state.returnPolicy,
      contact: { email: state.contactEmail },
      sustainability: state.sustainability,
      certifications: state.certifications
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    return JSON.stringify(json, null, 2);
  }, [state]);

  const result = generation ?? live;

  const [handleSave, isSaving] = useAsyncAction(() => saveProfile(state));

  const [handleGenerateJson, isGeneratingJson] = useAsyncAction(async () => {
    const r = await generateJson();
    if (r.success) setGeneration(r.data.json);
  });

  const [handleGenerateAll, isGeneratingAll] = useAsyncAction(async () => {
    const r = await generateAllProductStructuredData();
    if (!r.success) return;
    const updates = Object.fromEntries(
      r.data.items.map(({ productId, json }) => [productId, json]),
    );
    setProductData((prev) => ({ ...prev, ...updates }));
  });

  const targetStore = shopifyStores[0] ?? null;

  const [handlePublishProfile, isPublishingProfile] = useAsyncAction(
    async () => {
      if (!targetStore) return;
      const r = await publishProfileToShopify({ store: targetStore.id });
      if (!r.success) {
        toast.add({
          title: "Could not push UCP to Shopify",
          description: r.error.message,
          type: "error",
        });
        return;
      }
      toast.add({
        title: "UCP profile pushed to Shopify",
        description: `${r.data.written} metafield(s) written to ${targetStore.name} under namespace "ucp".`,
        type: "success",
      });
    },
  );

  const [handlePublishProducts, isPublishingProducts] = useAsyncAction(
    async () => {
      if (!targetStore) return;
      const r = await publishProductsToShopify({ store: targetStore.id });
      if (!r.success) {
        toast.add({
          title: "Could not push product metafields",
          description: r.error.message,
          type: "error",
        });
        return;
      }
      toast.add({
        title: "Product structured data pushed",
        description: `${r.data.pushed} of ${r.data.total} products updated on ${targetStore.name}.`,
        type: "success",
      });
    },
  );

  const handleGenerateProduct = useCallback(async (productId: string) => {
    setPending((prev) => new Set([...prev, productId]));
    const r = await generateProductStructuredData({ product: productId });
    setPending((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    if (r.success)
      setProductData((prev) => ({ ...prev, [productId]: r.data.json }));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                {product.title.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm leading-none">
                  {product.title}
                </p>
                <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                  {formatPrice(product.price, product.currency)}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const hasData = Boolean(productData[row.original.id]);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 font-medium text-xs",
                hasData
                  ? "bg-primary/10 text-primary"
                  : "bg-accent-foreground text-foreground-dimmed",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  hasData ? "bg-primary" : "bg-foreground-dimmed/40",
                )}
              />
              {hasData ? "Complete" : "Missing"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const product = row.original;
          const hasData = Boolean(productData[product.id]);
          const isGenerating = pending.has(product.id);

          return (
            <Button
              variant="ghost"
              color="neutral"
              onClick={() => handleGenerateProduct(product.id)}
              disabled={isGenerating}
              className="text-foreground-dimmed text-xs hover:text-foreground disabled:opacity-40"
            >
              {(() => {
                switch (true) {
                  case isGenerating:
                    return "Generating...";
                  case hasData:
                    return "Regenerate";
                  default:
                    return "Generate";
                }
              })()}
            </Button>
          );
        },
      },
    ],
    [productData, pending, handleGenerateProduct],
  );

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="border border-accent-foreground bg-background">
        <div className="flex items-center gap-6 p-5">
          <div className="relative size-14 shrink-0">
            <svg
              className="size-14 -rotate-90"
              viewBox="0 0 56 56"
              aria-label={`${score}% complete`}
            >
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-accent-foreground"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
                strokeDasharray={`${2 * Math.PI * 24 * (score / 100)} ${2 * Math.PI * 24}`}
                className="text-primary transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-semibold text-foreground text-sm tabular-nums">
                {score}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <p className="font-medium text-base text-foreground">
              {filledCount} of {definitions.length} fields complete
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
              AI shopping agents read this to understand your store identity,
              policies, and catalog.
            </p>
          </div>

          <div className="hidden shrink-0 text-right lg:block">
            <p className="font-light text-foreground-dimmed text-xs">
              Served at
            </p>
            <p className="mt-0.5 font-mono text-foreground text-xs">
              your-store.com/.well-known/ucp
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="h-auto border border-accent-foreground bg-transparent px-0">
          <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
          <Tab value="profile">Merchant Profile</Tab>
          <Tab value="products">Product Structured Data</Tab>
          <Tab value="validate">Validate</Tab>
        </TabsList>

        {/* Profile tab */}
        <TabsPanel value="profile">
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Fields */}
            <div className="border border-accent-foreground bg-background">
              <div className="border-accent-foreground border-b px-4 py-2.5">
                <p className="font-medium text-base text-foreground">
                  Profile Fields
                </p>
              </div>
              <div className="divide-y divide-accent-foreground">
                {definitions.map((field) => {
                  const value = state[field.key];
                  const isComplete = Boolean(value);
                  return (
                    <div
                      key={field.key}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      {(() => {
                        const Icon = definitionIcons[field.key];
                        return (
                          <Icon
                            className={cn(
                              "size-3.5 shrink-0 transition-colors",
                              isComplete
                                ? "text-primary"
                                : "text-foreground-dimmed/40",
                            )}
                          />
                        );
                      })()}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <label
                          htmlFor={`ucp-field-${field.key}`}
                          className="w-36 shrink-0 font-medium text-foreground-dimmed text-xs"
                        >
                          {field.label}
                        </label>
                        <TextField
                          value={value}
                          onValueChange={(val) =>
                            setState((prev) => ({ ...prev, [field.key]: val }))
                          }
                          className="h-7 flex-1 cursor-text border border-accent-foreground bg-background"
                        >
                          <TextFieldInput
                            id={`ucp-field-${field.key}`}
                            placeholder="—"
                            className="px-2 text-xs"
                          />
                        </TextField>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 border-accent-foreground border-t px-4 py-3">
                <Button
                  variant="flat"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  color="neutral"
                  onClick={handleGenerateJson}
                  disabled={isGeneratingJson}
                  className="px-4 py-1.5 text-foreground-dimmed text-xs"
                >
                  {isGeneratingJson ? "Generating..." : "Generate with AI"}
                </Button>
                {targetStore && (
                  <Button
                    variant="outline"
                    color="primary"
                    onClick={handlePublishProfile}
                    disabled={isPublishingProfile}
                    className="px-4 py-1.5 text-xs"
                  >
                    {isPublishingProfile
                      ? "Pushing..."
                      : `Push to ${targetStore.name}`}
                  </Button>
                )}
                {generation && (
                  <Button
                    variant="ghost"
                    color="neutral"
                    onClick={() => setGeneration(null)}
                    className="ml-auto px-3 py-1.5 text-foreground-dimmed text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* JSON Preview */}
              <div className="border border-accent-foreground bg-background">
                <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-base text-foreground">
                      JSON Preview
                    </p>
                    {generation && (
                      <span className="bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
                        AI-enhanced
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded px-2 py-1 font-medium text-foreground-dimmed text-xs transition-colors hover:bg-accent-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-3.5 text-primary" />
                        <span className="text-primary">Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed">
                  <JsonCode json={result} />
                </pre>
              </div>

              {/* Install instructions */}
              <div className="border border-accent-foreground bg-background">
                <div className="border-accent-foreground border-b px-4 py-2.5">
                  <p className="font-medium text-base text-foreground">
                    Install
                  </p>
                  <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                    Serve this JSON at{" "}
                    <span className="font-mono">/.well-known/ucp</span> so AI
                    agents can discover your merchant profile.
                  </p>
                </div>
                <pre className="p-4 font-mono text-xs leading-relaxed">
                  <span className="text-foreground-dimmed/50">
                    {"// Next.js — app/.well-known/ucp/route.ts\n"}
                  </span>
                  <span className="text-blue-400">{"export const "}</span>
                  <span className="text-foreground">{"GET"}</span>
                  <span className="text-foreground-dimmed/60">
                    {" = () => "}
                  </span>
                  <span className="text-yellow-400">{"Response"}</span>
                  <span className="text-foreground-dimmed/60">{"."}</span>
                  <span className="text-yellow-400">{"json"}</span>
                  <span className="text-foreground-dimmed/60">{"("}</span>
                  <span className="text-green-400">{"ucpData"}</span>
                  <span className="text-foreground-dimmed/60">{");\n\n"}</span>
                  <span className="text-foreground-dimmed/50">
                    {"// Static / Nginx\n"}
                  </span>
                  <span className="text-blue-400">{"location"}</span>
                  <span className="text-foreground-dimmed/60">
                    {" /.well-known/ucp {\n  "}
                  </span>
                  <span className="text-blue-400">{"alias"}</span>
                  <span className="text-green-400">{" /path/to/ucp.json"}</span>
                  <span className="text-foreground-dimmed/60">{";\n}"}</span>
                </pre>
              </div>
            </div>
          </div>
        </TabsPanel>

        {/* Validate tab */}
        <TabsPanel value="validate">
          <div className="mt-4 border border-accent-foreground">
            <UcpValidatorForm />
          </div>
          <div className="mt-4 border border-accent-foreground">
            <UcpAdvancedValidator />
          </div>
        </TabsPanel>

        {/* Products tab */}
        <TabsPanel value="products">
          <div className="mt-4 border border-accent-foreground bg-background">
            <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-base text-foreground">
                    {coveredCount} of {products.length} products covered
                  </p>
                  <div className="mt-1.5 h-0.5 w-28 bg-accent-foreground">
                    <div
                      className="h-full bg-primary transition-all duration-700"
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="flat"
                  color="primary"
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll || products.length === 0}
                  className="px-4 py-1.5 text-xs"
                >
                  {isGeneratingAll ? "Generating..." : "Generate All"}
                </Button>
                {targetStore && (
                  <Button
                    variant="outline"
                    color="primary"
                    onClick={handlePublishProducts}
                    disabled={isPublishingProducts || products.length === 0}
                    className="px-4 py-1.5 text-xs"
                  >
                    {isPublishingProducts
                      ? "Pushing..."
                      : `Push to ${targetStore.name}`}
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTableProvider
                rows={products.map((product) => ({
                  ...product,
                  _id: product.id,
                }))}
                columns={columns}
              >
                <DataTable
                  className="w-full"
                  classList={{
                    "header-cell":
                      "px-4 py-2.5 text-left font-medium text-foreground-dimmed text-xs",
                    "body-row":
                      "border-accent-foreground border-b transition-colors last:border-b-0 hover:bg-background-dimmed/40",
                    "body-cell": "px-4 py-3 text-left text-foreground text-sm",
                  }}
                >
                  <DataTableEmpty>
                    <div className="p-10 text-center">
                      <p className="font-light text-foreground-dimmed text-sm">
                        No products found. Connect a store and sync products
                        first.
                      </p>
                    </div>
                  </DataTableEmpty>
                </DataTable>
              </DataTableProvider>
            </div>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
};
