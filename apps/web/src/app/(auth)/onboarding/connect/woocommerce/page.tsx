import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { WooCommerceForm } from "./_components/woocommerce-form";

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
          src="/images/woocommerce.svg"
          alt="WooCommerce"
          width={48}
          height={48}
        />
        <div>
          <h2 className="font-medium text-2xl text-foreground">
            Connect WooCommerce
          </h2>
          <p className="font-light text-foreground-dimmed text-sm">
            API key connection — credentials stay encrypted in our database.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 border border-accent-foreground bg-background-rich p-5">
        <h3 className="font-medium text-foreground text-sm">
          Where to find your API keys
        </h3>
        <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed text-sm">
          <li>
            Log into your WordPress admin panel and go to{" "}
            <span className="font-medium text-foreground">
              WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API
            </span>
            .
          </li>
          <li>
            Click{" "}
            <span className="font-medium text-foreground">Add key</span>.
            Give it a description like &quot;Ecentic&quot;, set permissions to{" "}
            <span className="font-medium text-foreground">Read</span>, and
            click Generate.
          </li>
          <li>
            Copy the{" "}
            <span className="font-medium text-foreground">Consumer key</span>{" "}
            (starts with <code className="text-foreground">ck_</code>) and{" "}
            <span className="font-medium text-foreground">Consumer secret</span>{" "}
            (starts with <code className="text-foreground">cs_</code>). You
            won&apos;t be able to see the secret again, so paste it here right
            away.
          </li>
        </ol>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <h3 className="font-medium text-foreground text-sm">Store URL</h3>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            The public URL of your WooCommerce store — for example{" "}
            <span className="font-medium text-foreground">
              https://acmestore.com
            </span>
            . This is the homepage, not the WordPress admin URL.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-foreground text-sm">Consumer Key</h3>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            The key WooCommerce generated for you. It always starts with{" "}
            <code className="text-foreground">ck_</code> followed by a long
            alphanumeric string. We use this to authenticate read-only API
            requests.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-foreground text-sm">
            Consumer Secret
          </h3>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            The secret that pairs with the key — starts with{" "}
            <code className="text-foreground">cs_</code>. This is only shown
            once when you generate the key, so make sure to copy it before
            leaving WooCommerce.
          </p>
        </div>

        <WooCommerceForm />
      </div>
    </div>
  </div>
);
