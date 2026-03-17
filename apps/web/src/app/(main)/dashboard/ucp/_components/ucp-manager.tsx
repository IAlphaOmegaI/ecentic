"use client";

import { CheckIcon, UploadIcon } from "@zenncore/icons";
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
import { useCallback, useMemo, useState } from "react";
import type * as Ucp from "@/server/app/intelligence/ucp";
import {
  generateAllProductStructuredData,
  generateJson,
  generateProductStructuredData,
  saveProfile,
} from "@/server/app/intelligence/ucp";
import type * as Product from "@/server/app/product";

const definitions = [
  { key: "merchantName" as const, label: "Merchant Name" },
  { key: "description" as const, label: "Description" },
  { key: "logoUrl" as const, label: "Logo URL" },
  {
    key: "paymentMethods" as const,
    label: "Payment Methods (comma-separated)",
  },
  { key: "shippingPolicy" as const, label: "Shipping Policy" },
  { key: "returnPolicy" as const, label: "Return Policy" },
  { key: "contactEmail" as const, label: "Contact Email" },
  { key: "sustainability" as const, label: "Sustainability Statement" },
  { key: "certifications" as const, label: "Certifications (comma-separated)" },
] as const;

type ProductRow = Product.Type & { _id: string };

export namespace UcpManager {
  export type Props = {
    profile: Ucp.Type | null;
    products: Product.Type[];
  };
}

export const UcpManager = ({ profile, products }: UcpManager.Props) => {
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

  const score = useMemo(() => {
    const values = Object.values(state);
    const filled = values.filter(Boolean).length;

    return Math.round((filled / values.length) * 100);
  }, [state]);

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
    const result = await generateJson();
    if (result.success) setGeneration(result.data.json);
  });

  const [handleGenerateAll, isGeneratingAll] = useAsyncAction(async () => {
    const result = await generateAllProductStructuredData();
    if (!result.success) return;

    const updates = Object.fromEntries(
      result.data.items.map(({ productId, json }) => [productId, json]),
    );
    setProductData((previous) => ({ ...previous, ...updates }));
  });

  const handleGenerateProduct = useCallback(async (productId: string) => {
    setPending((previous) => new Set([...previous, productId]));

    const result = await generateProductStructuredData({ productId });

    setPending((previous) => {
      const next = new Set(previous);
      next.delete(productId);
      return next;
    });

    if (result.success)
      setProductData((previous) => ({
        ...previous,
        [productId]: result.data.json,
      }));
  }, []);

  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                {product.title.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {product.title}
                </p>
                <p className="font-light text-foreground-dimmed text-xs">
                  {product.currency ?? "USD"} {product.price ?? "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "structuredData",
        header: "Structured Data",
        cell: ({ row }) => {
          const product = row.original;
          const hasData = Boolean(productData[product.id]);

          return hasData ? (
            <span className="truncate font-mono text-foreground-dimmed text-xs">
              {`{"@type":"Product","name":"${product.title.slice(0, 20)}",...}`}
            </span>
          ) : (
            <span className="font-light text-foreground-dimmed text-xs italic">
              Not generated
            </span>
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
                "px-1.5 py-0.5 font-medium text-xs",
                hasData
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error",
              )}
            >
              {hasData ? "Complete" : "Missing"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const product = row.original;
          const hasData = Boolean(productData[product.id]);
          const isGenerating = pending.has(product.id);

          return (
            <Button
              variant="flat"
              color="primary"
              onClick={() => handleGenerateProduct(product.id)}
              disabled={isGenerating}
              className="font-medium text-xs hover:underline disabled:opacity-50"
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
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => navigator.clipboard.writeText(result)}>
          <UploadIcon className="size-3.5" />
          Copy JSON
        </Button>
      </div>

      <div className="mb-6 border border-accent-foreground bg-background-rich p-4">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0">
            <svg
              className="size-16 -rotate-90"
              viewBox="0 0 64 64"
              aria-label={`${score}% complete`}
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-accent-foreground"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28 * (score / 100)} ${2 * Math.PI * 28}`}
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-semibold text-foreground text-sm">
                {score}%
              </span>
            </div>
          </div>
          <div>
            <p className="font-medium text-base text-foreground">
              Your UCP profile is {score}% complete
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
              {Object.values(state).filter(Boolean).length} of{" "}
              {Object.values(state).length} fields filled — completing all
              fields improves AI agent selection.
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-xs">
              Accessible at:{" "}
              <span className="font-mono">your-store.com/.well-known/ucp</span>
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 h-auto border border-accent-foreground bg-transparent px-0">
          <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
          <Tab value="profile">Merchant Profile</Tab>
          <Tab value="products">Product Structured Data</Tab>
        </TabsList>

        <TabsPanel value="profile">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-accent-foreground bg-background-rich">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-foreground text-sm">
                  Profile Fields
                </p>
              </div>
              <div className="divide-y divide-accent-foreground">
                {definitions.map((field) => {
                  const value = state[field.key];
                  const isComplete = Boolean(value);
                  return (
                    <div key={field.key} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center",
                            isComplete
                              ? "bg-success/20 text-success"
                              : "bg-error/20 text-error",
                          )}
                        >
                          {isComplete ? (
                            <CheckIcon className="size-2.5" />
                          ) : (
                            <span className="font-bold text-xs leading-none">
                              !
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-xs">
                            {field.label}
                          </p>
                          <TextField
                            value={value}
                            onValueChange={(val) =>
                              setState((previous) => ({
                                ...previous,
                                [field.key]: val,
                              }))
                            }
                            className={cn(
                              "mt-1 h-7 border bg-background",
                              isComplete
                                ? "border-accent-foreground"
                                : "border-error/30 bg-error/5",
                            )}
                          >
                            <TextFieldInput
                              placeholder={`Add ${field.label.toLowerCase()}...`}
                              className="px-2 text-xs"
                            />
                          </TextField>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 border-accent-foreground border-t p-4">
                <Button
                  variant="flat"
                  color="accent"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
                <Button
                  variant="flat"
                  color="primary"
                  onClick={handleGenerateJson}
                  disabled={isGeneratingJson}
                >
                  {isGeneratingJson ? "Generating..." : "Generate JSON (AI)"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="border border-accent-foreground bg-background-rich">
                <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                  <p className="font-medium text-foreground text-sm">
                    JSON Preview
                  </p>
                  {generation && (
                    <span className="font-medium text-primary text-xs">
                      AI-enhanced
                    </span>
                  )}
                </div>
                <pre className="max-h-80 overflow-auto p-4 font-mono text-foreground-dimmed text-xs leading-relaxed">
                  {result}
                </pre>
                {generation && (
                  <div className="border-accent-foreground border-t px-4 py-2">
                    <Button
                      variant="flat"
                      color="accent"
                      onClick={() => setGeneration(null)}
                    >
                      Reset to live preview
                    </Button>
                  </div>
                )}
              </div>

              <div className="border border-accent-foreground bg-background-rich p-4">
                <p className="mb-2 font-medium text-foreground text-sm">
                  Install on your store
                </p>
                <p className="mb-3 font-light text-foreground-dimmed text-xs">
                  Serve this JSON at{" "}
                  <span className="font-mono">/.well-known/ucp</span> so AI
                  agents can discover your merchant profile.
                </p>
                <pre className="bg-foreground p-3 font-mono text-white/80 text-xs leading-relaxed">
                  {`# Next.js App Router
// app/.well-known/ucp/route.ts
export const GET = () => Response.json(ucpData);

# Static file (any host)
# Place ucp.json at /.well-known/ucp
# Nginx: location /.well-known/ucp { alias /path/to/ucp.json; }`}
                </pre>
              </div>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="products">
          <div className="border border-accent-foreground bg-background-rich">
            <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-2">
              <p className="font-medium text-foreground text-sm">
                Product Structured Data
              </p>
              <Button
                variant="flat"
                color="primary"
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || products.length === 0}
                className="px-3 py-1 text-xs"
              >
                {isGeneratingAll ? "Generating..." : "Generate All"}
              </Button>
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
                      "px-4 py-2 text-left font-medium text-foreground-dimmed text-xs",
                    "body-row":
                      "border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/30",
                    "body-cell":
                      "max-w-xs px-4 py-3 text-left text-foreground text-sm first:max-w-none last:bg-transparent",
                  }}
                >
                  <DataTableEmpty>
                    <div className="bg-background p-8 text-center">
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
    </>
  );
};
