"use client";

import { CheckIcon, DownloadIcon, UploadIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useState } from "react";
import { products } from "@/lib/mock-data";

const completenessScore = 68;

const profileFields = [
  { key: "merchant_name", label: "Merchant Name", value: "Acme Store", complete: true },
  { key: "description", label: "Description", value: "Premium consumer goods with a focus on quality and sustainability.", complete: true },
  { key: "logo_url", label: "Logo URL", value: "https://acmestore.com/logo.png", complete: true },
  { key: "payment_methods", label: "Supported Payment Methods", value: "Visa, Mastercard, PayPal, Apple Pay", complete: true },
  { key: "shipping_policy", label: "Shipping Policy", value: "", complete: false },
  { key: "return_policy", label: "Return Policy", value: "30-day returns on all items", complete: true },
  { key: "contact_email", label: "Contact Email", value: "support@acmestore.com", complete: true },
  { key: "sustainability", label: "Brand Sustainability", value: "", complete: false },
  { key: "certifications", label: "Certifications", value: "", complete: false },
] as const;

export default () => {
  const [activeTab, setActiveTab] = useState<"profile" | "products">("profile");

  const ucpJson = JSON.stringify({
    "@context": "https://ucp.ai/schema",
    "@type": "Merchant",
    name: "Acme Store",
    description: "Premium consumer goods with a focus on quality and sustainability.",
    logo: "https://acmestore.com/logo.png",
    paymentMethods: ["visa", "mastercard", "paypal", "apple_pay"],
    returnPolicy: "30-day returns on all items",
    contact: { email: "support@acmestore.com" },
  }, null, 2);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-medium text-xl text-foreground">
            UCP & Structured Data
          </h1>
          <p className="font-light text-foreground-dimmed text-sm">
            Universal Commerce Protocol — helps AI agents understand your
            merchant identity.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
        >
          <UploadIcon className="size-3.5" />
          Deploy to Store
        </button>
      </div>

      <div className="mb-6 border border-accent-foreground bg-background-rich p-4">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0">
            <svg className="size-16 -rotate-90" viewBox="0 0 64 64" aria-label={`${completenessScore}% complete`}>
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
            <p className="font-medium text-foreground text-base">
              Your UCP profile is {completenessScore}% complete
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
              3 fields missing — completing them could improve agent selection
              by an estimated 12%.
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-xs">
              Accessible at: your-store.com/.well-known/ucp
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-0 border-b border-accent-foreground">
        {(["profile", "products"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-foreground-dimmed hover:text-foreground",
            )}
          >
            {tab === "profile" ? "Merchant Profile" : "Product Structured Data"}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="border border-accent-foreground bg-background-rich">
            <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
              <p className="font-medium text-foreground text-sm">
                Profile Fields
              </p>
            </div>
            <div className="divide-y divide-accent-foreground">
              {profileFields.map((field) => (
                <div key={field.key} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center",
                        field.complete
                          ? "bg-success/20 text-success"
                          : "bg-error/20 text-error",
                      )}
                    >
                      {field.complete ? (
                        <CheckIcon className="size-2.5" />
                      ) : (
                        <span className="text-xs font-bold">!</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-xs">
                        {field.label}
                      </p>
                      {field.value ? (
                        <input
                          type="text"
                          defaultValue={field.value}
                          className="mt-1 w-full border border-accent-foreground bg-background px-2 py-1 text-foreground text-xs focus:border-primary focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={`Add ${field.label.toLowerCase()}...`}
                          className="mt-1 w-full border border-error/30 bg-error/5 px-2 py-1 text-foreground text-xs placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-accent-foreground border-t p-4">
              <button
                type="button"
                className="w-full bg-primary py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
              >
                Save Profile
              </button>
            </div>
          </div>

          <div>
            <div className="border border-accent-foreground bg-background-rich">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-foreground text-sm">
                  JSON Preview
                </p>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs text-foreground-dimmed leading-relaxed">
                {ucpJson}
              </pre>
            </div>
            <div className="mt-3 border border-accent-foreground bg-background-rich p-4">
              <p className="mb-2 font-medium text-foreground text-sm">
                Install on your store
              </p>
              <p className="mb-3 font-light text-foreground-dimmed text-xs">
                Add this to your server so AI agents can discover your merchant
                profile.
              </p>
              <div className="bg-foreground p-3 font-mono text-xs text-white/80">
                {`# Shopify: Add to theme.liquid\n<script type="application/ld+json">\n  // Paste UCP JSON here\n</script>`}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="border border-accent-foreground bg-background-rich">
          <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2 flex items-center justify-between">
            <p className="font-medium text-foreground text-sm">
              Product Structured Data
            </p>
            <button
              type="button"
              className="bg-primary px-3 py-1 text-xs text-white transition-colors hover:bg-primary/90"
            >
              Generate All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-accent-foreground border-b">
                  {["Product", "Structured Data", "Status", "Actions"].map((header) => (
                    <th key={header} className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const hasData = product.optimizationStatus === "optimized";
                  return (
                    <tr
                      key={product._id}
                      className="border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-sm">{product.title}</p>
                        <p className="font-light text-foreground-dimmed text-xs">{product.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        {hasData ? (
                          <span className="font-mono text-foreground-dimmed text-xs">
                            {`{"@type":"Product","name":"${product.title}",...}`}
                          </span>
                        ) : (
                          <span className="font-light text-foreground-dimmed text-xs italic">
                            Not generated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs font-medium",
                          hasData ? "bg-success/10 text-success" : "bg-error/10 text-error",
                        )}>
                          {hasData ? "Complete" : "Missing"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="font-medium text-primary text-xs hover:underline"
                        >
                          {hasData ? "Preview" : "Generate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
