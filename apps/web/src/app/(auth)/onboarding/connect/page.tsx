"use client";
import { Button } from "@zenncore/web/components/button";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { PlatformGrid } from "./_components/platform-grid";
import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-hidden"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="flex flex-col border-accent-foreground border-x p-6">
        <h2 className="font-medium text-4xl text-foreground">
          Connect your store
        </h2>
        <p className="font-light text-2xl text-foreground-dimmed">
          Start winning agent carts in 2 minutes.
        </p>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="h-full border-accent-foreground border-x">
        <PlatformGrid />
      </div>
    </Motion.Item>

    <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
      <div className="flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
        <Button
          variant="outline"
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
