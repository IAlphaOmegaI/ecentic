"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { ShopifyForm } from "./_components/shopify-form";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-y-auto"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="relative flex flex-col gap-4 border-accent-foreground border-x p-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <Image src="/images/shopify.svg" alt="Shopify" width={64} height={64} />
        <div>
          <h2 className="font-medium text-4xl text-foreground">
            Connect Shopify
          </h2>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            OAuth connection — we never see your Shopify password.
          </p>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="relative border-accent-foreground border-x bg-background-dimmed p-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <h3 className="font-medium text-foreground text-xl">How it works?</h3>
        <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed">
          <li>
            Enter your store domain below — this is the{" "}
            <span className="font-medium text-primary">
              yourstore.myshopify.com
            </span>{" "}
            URL you use to log into Shopify admin.
          </li>
          <li>
            You&apos;ll be redirected to Shopify to authorize read-only access
            to your product catalog. We only request{" "}
            <span className="font-medium text-primary">product scopes</span> —
            no orders, no customers.
          </li>
          <li>
            After you approve, Shopify allows écentic to read and write your
            store's product data.
          </li>
        </ol>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="relative h-full border-accent-foreground border-x p-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <ShopifyForm />
      </div>
    </Motion.Item>
    <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
      <div className="relative flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <Button
          color="accent"
          type="button"
          render={<Link href="/onboarding/connect" />}
        >
          <Back />
        </Button>
        <p className="font-light text-foreground-dimmed text-sm">
          You can connect more stores later in Settings.
        </p>
      </div>
    </Motion.Item>
  </Motion.Stagger>
);

const Back = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back to platforms
    </>
  );
};
