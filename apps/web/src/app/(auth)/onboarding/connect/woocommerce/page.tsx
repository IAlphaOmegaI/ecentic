"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { WooCommerceForm } from "./_components/woocommerce-form";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-y-auto"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="flex flex-col gap-4 border-accent-foreground border-x p-6">
        <Image
          src="/images/woocommerce.svg"
          alt="WooCommerce"
          width={64}
          height={64}
        />
        <div>
          <h2 className="font-medium text-4xl text-foreground">
            Connect WooCommerce
          </h2>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            API key connection — store URL + consumer key.
          </p>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="border-accent-foreground border-x bg-background-dimmed p-6">
        <h3 className="font-medium text-foreground text-xl">
          Where to find your API keys
        </h3>
        <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed">
          <li>
            Log into your WordPress admin panel and go to{" "}
            <span className="font-medium text-primary">
              WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API
            </span>
            .
          </li>
          <li>
            Click <span className="font-medium text-primary">Add key</span>.
            Give it a description like &quot;Ecentic&quot;, set permissions to{" "}
            <span className="font-medium text-primary">Read/Write</span> if you
            want écentic to push listing changes, or{" "}
            <span className="font-medium text-primary">Read</span> for
            sync-only, then click Generate.
          </li>
          <li>
            Copy the{" "}
            <span className="font-medium text-primary">Consumer key</span>{" "}
            (starts with <span className="font-medium text-primary">ck_</span>)
            and{" "}
            <span className="font-medium text-primary">Consumer secret</span>{" "}
            (starts with <span className="font-medium text-primary">cs_</span>).
            You won&apos;t be able to see the secret again, so paste it here
            right away.
          </li>
        </ol>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="h-full border-accent-foreground border-x p-6">
        <WooCommerceForm />
      </div>
    </Motion.Item>

    <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
      <div className="flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
        <Button
          variant="outline"
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
