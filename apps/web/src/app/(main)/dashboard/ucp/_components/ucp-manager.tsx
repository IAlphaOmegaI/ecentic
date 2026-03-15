"use client";

import { useMemo, useState } from "react";
import { CheckIcon, UploadIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import {
  generateAllProductStructuredData,
  generateJson,
  generateProductStructuredData,
  saveProfile,
} from "@/server/app/intelligence/ucp";
import type * as Product from "@/server/app/product";
import type * as Ucp from "@/server/app/intelligence/ucp";

type ProfileState = {
  merchantName: string;
  description: string;
  logoUrl: string;
  paymentMethods: string;
  shippingPolicy: string;
  returnPolicy: string;
  contactEmail: string;
  sustainability: string;
  certifications: string;
};

const profileFieldDefs = [
  { key: "merchantName" as const, label: "Merchant Name" },
  { key: "description" as const, label: "Description" },
  { key: "logoUrl" as const, label: "Logo URL" },
  { key: "paymentMethods" as const, label: "Payment Methods (comma-separated)" },
  { key: "shippingPolicy" as const, label: "Shipping Policy" },
  { key: "returnPolicy" as const, label: "Return Policy" },
  { key: "contactEmail" as const, label: "Contact Email" },
  { key: "sustainability" as const, label: "Sustainability Statement" },
  { key: "certifications" as const, label: "Certifications (comma-separated)" },
] as const;

export namespace UcpManager {
  export type Props = {
    profile: Ucp.Type | null;
    products: Product.Type[];
  };
}

export const UcpManager = ({ profile, products }: UcpManager.Props) => {
  const [state, setState] = useState<ProfileState>({
    merchantName: profile?.merchantName ?? "",
    description: profile?.description ?? "",
    logoUrl: profile?.logoUrl ?? "",
    paymentMethods: profile?.paymentMethods ?? "",
    shippingPolicy: profile?.shippingPolicy ?? "",
    returnPolicy: profile?.returnPolicy ?? "",
    contactEmail: profile?.contactEmail ?? "",
    sustainability: profile?.sustainability ?? "",
    certifications: profile?.certifications ?? "",
  });

  const [aiJson, setAiJson] = useState<string | null>(
    profile?.generatedJson ?? null,
  );

  const [productData, setProductData] = useState<Record<string, string | null>>(
    Object.fromEntries(
      products.map((product) => [product.id, product.structuredData ?? null]),
    ),
  );

  const [generatingProducts, setGeneratingProducts] = useState<Set<string>>(
    new Set(),
  );

  const completenessScore = useMemo(() => {
    const values = Object.values(state);
    const filled = values.filter(Boolean).length;
    return Math.round((filled / values.length) * 100);
  }, [state]);

  const liveJson = useMemo(() => {
    const json: Record<string, unknown> = {
      "@context": "https://ucp.ai/schema",
      "@type": "Merchant",
    };

    if (state.merchantName) json.name = state.merchantName;
    if (state.description) json.description = state.description;
    if (state.logoUrl) json.logo = state.logoUrl;
    if (state.paymentMethods)
      json.paymentMethods = state.paymentMethods
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (state.shippingPolicy) json.shippingPolicy = state.shippingPolicy;
    if (state.returnPolicy) json.returnPolicy = state.returnPolicy;
    if (state.contactEmail) json.contact = { email: state.contactEmail };
    if (state.sustainability) json.sustainability = state.sustainability;
    if (state.certifications)
      json.certifications = state.certifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    return JSON.stringify(json, null, 2);
  }, [state]);

  const displayJson = aiJson ?? liveJson;

  const [handleSave, isSaving] = useAsyncAction(async () => {
    await saveProfile(state);
  });

  const [handleGenerateJson, isGeneratingJson] = useAsyncAction(async () => {
    const result = await generateJson();
    if (result.success) setAiJson(result.data.json);
  });

  const [handleGenerateAll, isGeneratingAll] = useAsyncAction(async () => {
    const result = await generateAllProductStructuredData();
    if (!result.success) return;

    const updates = Object.fromEntries(
      result.data.items.map(({ productId, json }) => [productId, json]),
    );
    setProductData((previous) => ({ ...previous, ...updates }));
  });

  const handleGenerateProduct = async (productId: string) => {
    setGeneratingProducts((previous) => new Set([...previous, productId]));

    const result = await generateProductStructuredData({ productId });

    setGeneratingProducts((previous) => {
      const next = new Set(previous);
      next.delete(productId);
      return next;
    });

    if (result.success)
      setProductData((previous) => ({
        ...previous,
        [productId]: result.data.json,
      }));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-medium text-foreground text-xl">
            UCP & Structured Data
          </h1>
          <p className="font-light text-foreground-dimmed text-sm">
            Universal Commerce Protocol — helps AI agents understand your
            merchant identity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(displayJson)}
          className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
        >
          <UploadIcon className="size-3.5" />
          Copy JSON
        </button>
      </div>

      <div className="mb-6 border border-accent-foreground bg-background-rich p-4">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0">
            <svg
              className="size-16 -rotate-90"
              viewBox="0 0 64 64"
              aria-label={`${completenessScore}% complete`}
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
                strokeDasharray={`${2 * Math.PI * 28 * (completenessScore / 100)} ${2 * Math.PI * 28}`}
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-semibold text-foreground text-sm">
                {completenessScore}%
              </span>
            </div>
          </div>
          <div>
            <p className="font-medium text-base text-foreground">
              Your UCP profile is {completenessScore}% complete
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
                {profileFieldDefs.map((fieldDef) => {
                  const value = state[fieldDef.key];
                  const isComplete = Boolean(value);
                  return (
                    <div key={fieldDef.key} className="px-4 py-3">
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
                            {fieldDef.label}
                          </p>
                          <TextField
                            value={value}
                            onValueChange={(val) =>
                              setState((previous) => ({
                                ...previous,
                                [fieldDef.key]: val,
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
                              placeholder={`Add ${fieldDef.label.toLowerCase()}...`}
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
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-primary py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateJson}
                  disabled={isGeneratingJson}
                  className="flex-1 border border-primary py-2 font-medium text-sm text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                >
                  {isGeneratingJson ? "Generating..." : "Generate JSON (AI)"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="border border-accent-foreground bg-background-rich">
                <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                  <p className="font-medium text-foreground text-sm">
                    JSON Preview
                  </p>
                  {aiJson && (
                    <span className="font-medium text-primary text-xs">
                      AI-enhanced
                    </span>
                  )}
                </div>
                <pre className="max-h-80 overflow-auto p-4 font-mono text-foreground-dimmed text-xs leading-relaxed">
                  {displayJson}
                </pre>
                {aiJson && (
                  <div className="border-accent-foreground border-t px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setAiJson(null)}
                      className="font-light text-foreground-dimmed text-xs hover:text-foreground"
                    >
                      Reset to live preview
                    </button>
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
                <pre className="bg-foreground p-3 font-mono text-white/80 text-xs leading-relaxed">{`# Next.js App Router
// app/.well-known/ucp/route.ts
export const GET = () => Response.json(ucpData);

# Static file (any host)
# Place ucp.json at /.well-known/ucp
# Nginx: location /.well-known/ucp { alias /path/to/ucp.json; }`}</pre>
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
              <button
                type="button"
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || products.length === 0}
                className="bg-primary px-3 py-1 text-white text-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isGeneratingAll ? "Generating..." : "Generate All"}
              </button>
            </div>

            {products.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-light text-foreground-dimmed text-sm">
                  No products found. Connect a store and sync products first.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_td]:border-accent-foreground [&_td]:border-x [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_th]:border-accent-foreground [&_th]:border-x">
                  <thead>
                    <tr className="border-accent-foreground border-b">
                      {["Product", "Structured Data", "Status", "Actions"].map(
                        (header) => (
                          <th
                            key={header}
                            className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs"
                          >
                            {header}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const data = productData[product.id];
                      const hasData = Boolean(data);
                      const isGenerating = generatingProducts.has(product.id);

                      return (
                        <tr
                          key={product.id}
                          className="border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/30"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                                {product.title.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">
                                  {product.title}
                                </p>
                                <p className="font-light text-foreground-dimmed text-xs">
                                  {product.currency ?? "USD"}{" "}
                                  {product.price ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-xs px-4 py-3">
                            {hasData ? (
                              <span className="truncate font-mono text-foreground-dimmed text-xs">
                                {`{"@type":"Product","name":"${product.title.slice(0, 20)}",...}`}
                              </span>
                            ) : (
                              <span className="font-light text-foreground-dimmed text-xs italic">
                                Not generated
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleGenerateProduct(product.id)
                              }
                              disabled={isGenerating}
                              className="font-medium text-primary text-xs hover:underline disabled:opacity-50"
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
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
};
