import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { FeedForm } from "./_components/feed-form";

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
          src="/images/custom.svg"
          alt="Custom Feed"
          width={48}
          height={48}
        />
        <div>
          <h2 className="font-medium text-2xl text-foreground">
            Connect a Product Feed
          </h2>
          <p className="font-light text-foreground-dimmed text-sm">
            We&apos;ll fetch and parse your feed automatically.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 border border-accent-foreground bg-background-rich p-5">
        <h3 className="font-medium text-foreground text-sm">
          Supported formats
        </h3>
        <div className="flex flex-col gap-3 font-light text-foreground-dimmed text-sm">
          <div>
            <span className="font-medium text-foreground">
              Google Shopping XML
            </span>{" "}
            — the most common format. If you use Google Merchant Center, you
            already have one. It&apos;s an RSS/Atom feed where each{" "}
            <code className="text-foreground">&lt;item&gt;</code> contains{" "}
            <code className="text-foreground">g:title</code>,{" "}
            <code className="text-foreground">g:price</code>,{" "}
            <code className="text-foreground">g:image_link</code>, etc.
          </div>
          <div>
            <span className="font-medium text-foreground">JSON</span> — a
            simple array of product objects. We look for{" "}
            <code className="text-foreground">title</code>,{" "}
            <code className="text-foreground">price</code>,{" "}
            <code className="text-foreground">image</code>, and{" "}
            <code className="text-foreground">url</code> fields. Nested under a{" "}
            <code className="text-foreground">products</code> or{" "}
            <code className="text-foreground">items</code> key is fine too.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-foreground text-sm">Feed URL</h3>
        <p className="mb-2 font-light text-foreground-dimmed text-sm">
          The publicly accessible URL that serves your product feed. For
          example:{" "}
          <span className="font-medium text-foreground">
            https://yourstore.com/feed/products.xml
          </span>
          . The URL must be reachable from the internet — localhost or
          private-network URLs won&apos;t work. We auto-detect whether it&apos;s
          XML or JSON based on the content.
        </p>
        <FeedForm />
      </div>
    </div>
  </div>
);
