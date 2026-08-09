"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { useLinkStatus } from "next/link";
import { useMessages, useTranslations } from "next-intl";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { ShopifyForm } from "./_components/shopify-form";

export default () => {
  const translate = useTranslations("onboarding.connect");
  const messages = useMessages();
  const steps = messages.onboarding.connect.shopify.steps;

  return (
    <Motion.Stagger
      stagger={0.08}
      delay={0.1}
      className="flex flex-1 flex-col overflow-y-auto"
    >
      <Motion.Item className="w-full border-accent-foreground border-b px-8">
        <div className="relative flex flex-col gap-4 border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Image
            src="/images/shopify.svg"
            alt="Shopify"
            width={64}
            height={64}
          />
          <div>
            <h2 className="font-medium text-4xl text-foreground">
              {translate("shopify.title")}
            </h2>
            <p className="mt-1 font-light text-2xl text-foreground-dimmed">
              {translate("shopify.description")}
            </p>
          </div>
        </div>
      </Motion.Item>

      <Motion.Item className="w-full border-accent-foreground border-b px-8">
        <div className="relative border-accent-foreground border-x bg-background-dimmed p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <h3 className="font-medium text-foreground text-xl">
            {translate("shopify.howItWorks")}
          </h3>
          <ol className="flex list-inside list-decimal flex-col gap-3 font-light text-foreground-dimmed">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </Motion.Item>

      <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
        <div className="relative h-full border-accent-foreground border-x p-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <ShopifyForm />
        </div>
      </Motion.Item>
      <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
        <div className="relative flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/connect" />}
          >
            <Back />
          </Button>
          <p className="font-light text-foreground-dimmed text-sm">
            {translate("footer.settingsHint")}
          </p>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.connect");

  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      {translate("footer.backToPlatforms")}
    </>
  );
};
