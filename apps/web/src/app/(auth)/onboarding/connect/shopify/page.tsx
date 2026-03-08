import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { ShopifyForm } from "./_components/shopify-form";
import * as motion from "motion/react-client";
import { Fade } from "@/lib/animations";
import { Motion } from "@/components/motion";
import { ArrowLeftIcon } from "@zenncore/icons";

export default () => (
  <motion.div
    className="flex flex-1 flex-col overflow-hidden p-8"
    variants={Fade.Right}
    initial="hidden"
    animate="visible"
  >
    <Motion.Stagger stagger={0.08} delay={0.1}>
      <Motion.Item>
        <Button
          variant="ghost"
          color="neutral"
          className="mb-8 w-fit"
          render={<Link href="/onboarding/connect" />}
        >
          <ArrowLeftIcon className="size-4" />
          Back to platforms
        </Button>
      </Motion.Item>

      <div className="mx-auto flex w-full max-w-lg flex-col">
        <div className="mb-8 flex items-center gap-4">
          <Motion.Item>
            <Image
              src="/images/shopify.svg"
              alt="Shopify"
              width={64}
              height={64}
            />
          </Motion.Item>
          <div>
            <Motion.Item>
              <h2 className="font-medium text-4xl text-foreground">
                Connect Shopify
              </h2>
            </Motion.Item>
            <Motion.Item>
              <p className="mt-1 font-light text-foreground-dimmed text-lg">
                OAuth connection — we never see your Shopify password.
              </p>
            </Motion.Item>
          </div>
        </div>

        <Motion.Item>
          <div className="mb-8 flex flex-col gap-4 border border-accent-foreground bg-background-rich p-5">
            <h3 className="font-medium text-foreground text-sm">
              How it works
            </h3>
            <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed text-sm">
              <li>
                Enter your store domain below — this is the{" "}
                <span className="font-medium text-foreground">
                  yourstore.myshopify.com
                </span>{" "}
                URL you use to log into Shopify admin.
              </li>
              <li>
                You&apos;ll be redirected to Shopify to authorize read-only
                access to your product catalog. We only request{" "}
                <span className="font-medium text-foreground">
                  read_products
                </span>{" "}
                — no orders, customers, or write access.
              </li>
              <li>
                After you approve, Shopify sends us a secure token and we
                immediately import your products.
              </li>
            </ol>
          </div>
        </Motion.Item>

        <Motion.Item>
          <ShopifyForm />
        </Motion.Item>
      </div>
    </Motion.Stagger>
  </motion.div>
);
