"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { FieldDescription } from "@zenncore/web/components/form";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useCurrentUser } from "@/context/auth";
import * as Shopify from "@/server/app/integration/shopify";

// Shown when the callback reports a failure it doesn't have specific copy for
// (including the generic `integration_failed` reason).
const GENERIC_CONNECT_ERROR =
  "We couldn't finish connecting your Shopify store. Please try again.";

// Reasons the OAuth callback (`/api/integrations/shopify/callback`) can bounce
// the admin back here with `?error=`, mapped to human-readable copy. Unknown
// reasons fall back to GENERIC_CONNECT_ERROR.
const ERROR_MESSAGES: Record<string, string> = {
  missing_parameters:
    "Shopify's response was missing required parameters. Start the connection again.",
  invalid_state:
    "The connection attempt expired or was already used. Start it again.",
  invalid_hmac:
    "We couldn't verify Shopify's response. Start the connection again.",
  already_connected:
    "This store is already connected to another écentic account. Sign in with that account, or contact support to move it.",
};

/**
 * Resolves a user-entered store value to a `*.myshopify.com` admin domain for
 * OAuth. Accepts a bare handle or myshopify domain (with or without
 * protocol/path); returns `null` for custom storefront domains, which cannot
 * be used for OAuth authorize.
 */
const resolveShopDomain = (shop: string): string | null => {
  const trimmed = shop.trim().toLowerCase();
  if (!trimmed) return null;

  const host = (() => {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = resultify(() => new URL(candidate).hostname);
    return parsed.success ? parsed.data : (trimmed.split("/")[0] ?? trimmed);
  })();

  const cleaned = host.replace(/[^a-z0-9.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.endsWith(".myshopify.com")) return cleaned;
  if (!cleaned.includes(".")) return `${cleaned}.myshopify.com`;

  return null;
};

const config = {
  shop: field({
    shape: "text",
    validator: z.string().min(1, "Shop domain is required"),
    label: "Shop Domain",
    placeholder: "yourstore.myshopify.com",
    // @ts-expect-error - description is a function
    description: () => (
      <FieldDescription>
        The subdomain you use to access Shopify admin. If your admin URL is{" "}
        <span className="font-medium text-foreground">
          acmestore.myshopify.com/admin
        </span>
        , enter <span className="font-medium text-foreground">acmestore</span>{" "}
        or the full{" "}
        <span className="font-medium text-foreground">
          acmestore.myshopify.com
        </span>
        .
      </FieldDescription>
    ),
  }),
} satisfies GenericForm;

export const ShopifyForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const user = useCurrentUser();
  const searchParameters = useSearchParams();
  const errorCode = searchParameters.get("error");
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? GENERIC_CONNECT_ERROR)
    : null;

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      if (user.role === "administrator" || user.role === "owner") {
        const shop = resolveShopDomain(data.shop);

        if (!shop) {
          toast.add({
            title: "Enter your myshopify.com domain",
            description:
              "OAuth needs your Shopify admin domain (e.g. yourstore.myshopify.com) or store handle — not a custom storefront URL.",
            type: "error",
          });
          return;
        }

        window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(shop)}`;

        return;
      }

      const result = await Shopify.connectPublic({
        domain: data.shop.trim(),
      });

      if (!result.success) {
        toast.add({
          title: "Connection failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Store connected",
        description: "Your catalog is synced and ready.",
        type: "success",
      });

      router.push("/onboarding/products?connected=shopify");
    },
  );

  return (
    <InferredForm
      config={config}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {errorMessage && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-light text-error text-sm">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        color="primary"
        className="mt-2 w-full"
        disabled={isPending}
      >
        {isPending ? (
          <>
            Connecting...
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Connect to Shopify
            <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>
    </InferredForm>
  );
};
