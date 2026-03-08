import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { ShopifyForm } from "./_components/shopify-form";

export default () => (
  <div className="flex flex-1 flex-col px-10 py-12">
    <Button
      variant="ghost"
      color="neutral"
      className="mb-8 w-fit"
      render={<Link href="/onboarding/connect" />}
    >
      Back to platforms
    </Button>

    <div className="mx-auto flex w-full max-w-lg flex-col">
      <div className="mb-8 flex items-center gap-4">
        <Image
          src="/images/shopify.svg"
          alt="Shopify"
          width={48}
          height={48}
        />
        <div>
          <h2 className="font-medium text-2xl text-foreground">
            Connect Shopify
          </h2>
          <p className="font-light text-foreground-dimmed text-sm">
            OAuth connection — we never see your Shopify password.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 border border-accent-foreground bg-background-rich p-5">
        <h3 className="font-medium text-foreground text-sm">How it works</h3>
        <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed text-sm">
          <li>
            Enter your store domain below — this is the{" "}
            <span className="font-medium text-foreground">
              yourstore.myshopify.com
            </span>{" "}
            URL you use to log into Shopify admin.
          </li>
          <li>
            You&apos;ll be redirected to Shopify to authorize read-only access
            to your product catalog. We only request{" "}
            <span className="font-medium text-foreground">read_products</span>{" "}
            — no orders, customers, or write access.
          </li>
          <li>
            After you approve, Shopify sends us a secure token and we
            immediately import your products.
          </li>
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-foreground text-sm">Shop Domain</h3>
        <p className="mb-2 font-light text-foreground-dimmed text-sm">
          The subdomain you use to access Shopify admin. If your admin URL is{" "}
          <span className="font-medium text-foreground">
            acmestore.myshopify.com/admin
          </span>
          , enter{" "}
          <span className="font-medium text-foreground">acmestore</span> or the
          full{" "}
          <span className="font-medium text-foreground">
            acmestore.myshopify.com
          </span>
          .
        </p>
        <ShopifyForm />
      </div>
    </div>
  </div>
);
