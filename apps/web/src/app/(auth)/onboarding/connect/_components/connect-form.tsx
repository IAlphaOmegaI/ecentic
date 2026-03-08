"use client";

import { ArrowRightIcon, LoaderIcon, UploadIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
import {
  type FormEntries,
  type GenericForm,
  InferredForm,
  field,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";
import * as FeedIntegration from "@/server/app/integration/feed";
import * as WooCommerceIntegration from "@/server/app/integration/woocommerce";
import * as Sync from "@/server/app/sync";

const platforms = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect via OAuth — import your full catalog",
    badge: "Recommended",
    image: "/images/shopify.svg",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "API key connection — store URL + consumer key",
    badge: null,
    image: "/images/woocommerce.svg",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    description: "Connect via OAuth — full product sync",
    badge: "Coming soon",
    image: "/images/bigcommerce.svg",
  },
  {
    id: "amazon",
    name: "Amazon Seller",
    description: "SP-API OAuth — sync Amazon listings",
    badge: "Coming soon",
    image: "/images/amazon.svg",
  },
  {
    id: "feed",
    name: "Custom Feed",
    description: "Paste a URL to your XML or JSON product feed",
    badge: null,
    image: "/images/custom.svg",
  },
] as const;

type Platform = (typeof platforms)[number]["id"];

const wooCommerceConfig = {
  domain: field({
    shape: "text",
    validator: z.string().min(1, "Store URL is required"),
    label: "Store URL",
    placeholder: "https://yourstore.com",
  }),
  consumerKey: field({
    shape: "text",
    validator: z.string().min(1, "Consumer key is required"),
    label: "Consumer Key",
    placeholder: "ck_...",
  }),
  consumerSecret: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1, "Consumer secret is required"),
    label: "Consumer Secret",
    placeholder: "cs_...",
  }),
} satisfies GenericForm;

const shopifyConfig = {
  shop: field({
    shape: "text",
    validator: z.string().min(1, "Shop domain is required"),
    label: "Shop Domain",
    placeholder: "yourstore.myshopify.com",
  }),
} satisfies GenericForm;

const feedConfig = {
  feedUrl: field({
    shape: "text",
    validator: z.string().url("Enter a valid URL"),
    label: "Feed URL",
    placeholder: "https://yourstore.com/products.xml",
  }),
} satisfies GenericForm;

export namespace ConnectForm {
  export type Props = {
    className?: string;
  };
}
export const ConnectForm = ({ className }: ConnectForm.Props) => {
  const [active, setActive] = useState<Platform | null>(null);
  const router = useRouter();
  const toast = useToastManager();

  const [handleWooCommerce, wooCommercePending] = useAsyncAction(
    async (data: FormEntries<typeof wooCommerceConfig>) => {
      const result = await WooCommerceIntegration.connect(data);

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
        description: "Syncing products...",
        type: "success",
      });

      void (async () => {
        await Sync.syncStore({ storeId: result.data.id });
      })();

      setActive(null);
      router.push("/onboarding/select-products");
    },
  );

  const [handleFeed, feedPending] = useAsyncAction(
    async (data: FormEntries<typeof feedConfig>) => {
      const result = await FeedIntegration.connect(data);

      if (!result.success) {
        toast.add({
          title: "Connection failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Feed connected",
        description: "Syncing products...",
        type: "success",
      });

      void (async () => {
        await Sync.syncStore({ storeId: result.data.id });
      })();

      setActive(null);
      router.push("/onboarding/select-products");
    },
  );

  const handleShopify = (data: FormEntries<typeof shopifyConfig>) => {
    const shop = data.shop.trim();
    window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(shop)}`;
  };

  const handlePlatformClick = (id: Platform) => {
    if (id === "bigcommerce" || id === "amazon") return;
    setActive(id);
  };

  return (
    <>
      <motion.div
        className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}
        variants={Stagger.Container(0.07)}
      >
        {platforms.map((platform) => {
          const disabled = platform.id === "bigcommerce" || platform.id === "amazon";

          return (
            <Motion.Lift key={platform.id} variants={Stagger.Item}>
              <button
                type="button"
                onClick={() => handlePlatformClick(platform.id)}
                disabled={disabled}
                className={cn(
                  "group flex size-full h-20 w-full items-center justify-between border border-accent-foreground bg-background-rich p-4 text-left transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary",
                )}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={platform.image}
                    alt={platform.name}
                    width={36}
                    height={36}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {platform.name}
                      </span>
                      {platform.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-sm",
                            platform.badge === "Coming soon"
                              ? "bg-foreground-dimmed/10 text-foreground-dimmed"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {platform.badge}
                        </span>
                      )}
                    </div>
                    <p className="font-light text-foreground-dimmed text-xs">
                      {platform.description}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <motion.div whileHover={{ x: 3 }} transition={Spring.Snappy}>
                    <ArrowRightIcon className="size-4 text-foreground-dimmed transition-colors group-hover:text-primary" />
                  </motion.div>
                )}
              </button>
            </Motion.Lift>
          );
        })}

        <Motion.Lift variants={Stagger.Item} className="sm:col-span-2">
          <button
            type="button"
            className="group flex w-full flex-col items-center justify-center gap-2 border border-accent-foreground border-dashed bg-background-rich p-6 transition-colors hover:border-primary"
          >
            <UploadIcon className="size-6 text-foreground-dimmed transition-colors group-hover:text-primary" />
            <div className="text-center">
              <p className="font-medium text-foreground text-sm">
                Upload a CSV file
              </p>
              <p className="font-light text-foreground-dimmed text-xs">
                Drag and drop or click to browse — title and price required
              </p>
            </div>
          </button>
        </Motion.Lift>
      </motion.div>

      {/* Shopify Dialog */}
      <Dialog open={active === "shopify"} onOpenChange={(open) => !open && setActive(null)}>
        <DialogPopup>
          <DialogTitle>Connect Shopify</DialogTitle>
          <DialogDescription className="text-sm">
            Enter your Shopify store domain. You&apos;ll be redirected to
            authorize access.
          </DialogDescription>
          <InferredForm
            config={shopifyConfig}
            onSubmit={handleShopify}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-end gap-2">
              <DialogClose>Cancel</DialogClose>
              <Button type="submit" variant="flat" color="primary">
                Connect
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </InferredForm>
        </DialogPopup>
      </Dialog>

      {/* WooCommerce Dialog */}
      <Dialog open={active === "woocommerce"} onOpenChange={(open) => !open && setActive(null)}>
        <DialogPopup className="w-md">
          <DialogTitle>Connect WooCommerce</DialogTitle>
          <DialogDescription className="text-sm">
            Enter your store URL and API credentials. You can generate keys in
            WooCommerce &gt; Settings &gt; REST API.
          </DialogDescription>
          <InferredForm
            config={wooCommerceConfig}
            onSubmit={handleWooCommerce}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-end gap-2">
              <DialogClose>Cancel</DialogClose>
              <Button
                type="submit"
                variant="flat"
                color="primary"
                disabled={wooCommercePending}
              >
                {wooCommercePending ? (
                  <>
                    Connecting...
                    <LoaderIcon className="size-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Connect
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </InferredForm>
        </DialogPopup>
      </Dialog>

      {/* Custom Feed Dialog */}
      <Dialog open={active === "feed"} onOpenChange={(open) => !open && setActive(null)}>
        <DialogPopup>
          <DialogTitle>Connect Custom Feed</DialogTitle>
          <DialogDescription className="text-sm">
            Paste the URL of your XML (Google Shopping) or JSON product feed.
          </DialogDescription>
          <InferredForm
            config={feedConfig}
            onSubmit={handleFeed}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-end gap-2">
              <DialogClose>Cancel</DialogClose>
              <Button
                type="submit"
                variant="flat"
                color="primary"
                disabled={feedPending}
              >
                {feedPending ? (
                  <>
                    Connecting...
                    <LoaderIcon className="size-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Connect
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </InferredForm>
        </DialogPopup>
      </Dialog>
    </>
  );
};
