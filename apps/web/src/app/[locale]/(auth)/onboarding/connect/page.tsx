"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useLinkStatus } from "next/link";
import { Link } from "@/i18n/navigation";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { PlatformGrid } from "./_components/platform-grid";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-hidden"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="relative flex flex-col border-accent-foreground border-x p-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <h2 className="font-medium text-4xl text-foreground">
          Connect your store
        </h2>
        <p className="font-light text-2xl text-foreground-dimmed">
          Start winning agent carts in 2 minutes.
        </p>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="relative h-full border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <PlatformGrid />
      </div>
    </Motion.Item>

    <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
      <div className="relative flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Button
          color="accent"
          type="button"
          render={<Link href="/onboarding/products" />}
        >
          <Skip />
        </Button>
        <p className="font-light text-foreground-dimmed text-sm">
          You can connect more stores later in Settings.
        </p>
      </div>
    </Motion.Item>
  </Motion.Stagger>
);

const Skip = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Skip for now
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
