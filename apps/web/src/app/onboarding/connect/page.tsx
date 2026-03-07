"use client";

import { ArrowRightIcon, UploadIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import { spring, staggerContainer, staggerItem, hoverLift, fadeInUp } from "@/lib/animations";

const platforms = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Connect via OAuth — auto-imports your full catalog",
    badge: "Recommended",
    color: "bg-[#96BF48]",
    textColor: "text-white",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "API key connection — store URL + consumer key",
    badge: null,
    color: "bg-[#7F54B3]",
    textColor: "text-white",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    description: "Connect via OAuth — full product sync",
    badge: null,
    color: "bg-[#121118]",
    textColor: "text-white",
  },
  {
    id: "amazon",
    name: "Amazon Seller",
    description: "SP-API OAuth — sync Amazon listings",
    badge: null,
    color: "bg-[#FF9900]",
    textColor: "text-white",
  },
  {
    id: "feed",
    name: "Custom Feed",
    description: "Paste a URL to your XML or JSON product feed",
    badge: null,
    color: "bg-foreground",
    textColor: "text-background-rich",
  },
] as const;

export default () => (
  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
    <motion.div
      className="w-full max-w-2xl"
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="mb-8" variants={fadeInUp}>
        <h1 className="font-medium text-2xl text-foreground">
          Connect your store
        </h1>
        <p className="mt-1 font-light text-foreground-dimmed text-sm">
          We'll import your product catalog so we can test how AI agents see
          your products.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        variants={staggerContainer(0.07)}
      >
        {platforms.map((platform) => (
          <motion.div key={platform.id} variants={staggerItem} {...hoverLift}>
            <Link
              href="/onboarding/select-products"
              className="group flex items-center justify-between border border-accent-foreground bg-background-rich p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center text-xs font-bold ${platform.color} ${platform.textColor}`}
                >
                  {platform.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">
                      {platform.name}
                    </span>
                    {platform.badge && (
                      <span className="bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                        {platform.badge}
                      </span>
                    )}
                  </div>
                  <p className="font-light text-foreground-dimmed text-xs">
                    {platform.description}
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ x: 3 }}
                transition={spring.snappy}
              >
                <ArrowRightIcon className="size-4 text-foreground-dimmed transition-colors group-hover:text-primary" />
              </motion.div>
            </Link>
          </motion.div>
        ))}

        <motion.div variants={staggerItem} className="sm:col-span-2" {...hoverLift}>
          <Link
            href="/onboarding/select-products"
            className="group flex flex-col items-center justify-center gap-2 border border-dashed border-accent-foreground bg-background-rich p-6 transition-colors hover:border-primary"
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
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="mt-6 flex items-center justify-between"
        variants={fadeInUp}
      >
        <Button
          variant="ghost"
          color="neutral"
          type="button"
          className="text-foreground-dimmed text-sm"
          render={<Link href="/onboarding/select-products" />}
        >
          Skip for now
        </Button>
        <p className="font-light text-foreground-dimmed text-xs">
          You can connect more stores later in Settings.
        </p>
      </motion.div>
    </motion.div>
  </div>
);
