"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { WooCommerceForm } from "./_components/woocommerce-form";

export default () => (
  <div className="flex flex-1 flex-col overflow-hidden p-8">
    <Motion.Stagger stagger={0.08} delay={0.1}>
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <Motion.Item>
          <Button
            variant="ghost"
            color="neutral"
            className="mb-8 w-fit"
            render={<Link href="/onboarding/connect" />}
          >
            <Back />
          </Button>
        </Motion.Item>
        <div className="mb-8 flex items-center gap-4">
          <Motion.Item>
            <Image
              src="/images/woocommerce.svg"
              alt="WooCommerce"
              width={64}
              height={64}
            />
          </Motion.Item>
          <div>
            <Motion.Item>
              <h2 className="font-medium text-4xl text-foreground">
                Connect WooCommerce
              </h2>
            </Motion.Item>
            <Motion.Item>
              <p className="mt-1 font-light text-foreground-dimmed text-lg">
                API key connection — store URL + consumer key.
              </p>
            </Motion.Item>
          </div>
        </div>

        <Motion.Item>
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
                Give it a description like &quot;Ecentic&quot;, set permissions
                to <span className="font-medium text-foreground">Read</span>,
                and click Generate.
              </li>
              <li>
                Copy the{" "}
                <span className="font-medium text-foreground">
                  Consumer key
                </span>{" "}
                (starts with <code className="text-foreground">ck_</code>) and{" "}
                <span className="font-medium text-foreground">
                  Consumer secret
                </span>{" "}
                (starts with <code className="text-foreground">cs_</code>). You
                won&apos;t be able to see the secret again, so paste it here
                right away.
              </li>
            </ol>
          </div>
        </Motion.Item>

        <Motion.Item>
          <WooCommerceForm />
        </Motion.Item>
      </div>
    </Motion.Stagger>
  </div>
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
