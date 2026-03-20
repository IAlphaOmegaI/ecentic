"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { FeedForm } from "./_components/feed-form";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-hidden"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="flex flex-col gap-4 border-accent-foreground border-x p-6">
        <Image
          src="/images/custom.svg"
          alt="Custom Feed"
          width={64}
          height={64}
        />
        <div>
          <h2 className="font-medium text-4xl text-foreground">
            Connect a Product Feed
          </h2>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            We&apos;ll fetch and parse your feed automatically.
          </p>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="border-accent-foreground border-x bg-background-dimmed p-6">
        <h3 className="font-medium text-foreground text-xl">
          Supported formats
        </h3>
        <div className="flex flex-col gap-3 font-light text-foreground-dimmed">
          <div>
            <span className="font-medium text-foreground">
              Google Shopping XML
            </span>{" "}
            — the most common format. If you use Google Merchant Center, you
            already have one. It&apos;s an RSS/Atom feed where each{" "}
            <span className="font-medium text-primary">&lt;item&gt;</span>{" "}
            contains <span className="font-medium text-primary">g:title</span>,{" "}
            <span className="font-medium text-primary">g:price</span>,{" "}
            <span className="font-medium text-primary">g:image_link</span>, etc.
          </div>
          <div>
            <span className="font-medium text-foreground">JSON</span> — a simple
            array of product objects. We look for{" "}
            <span className="font-medium text-primary">title</span>,{" "}
            <span className="font-medium text-primary">price</span>,{" "}
            <span className="font-medium text-primary">image</span>, and{" "}
            <span className="font-medium text-primary">url</span> fields. Nested
            under a <span className="font-medium text-primary">products</span>{" "}
            or <span className="font-medium text-primary">items</span> key is
            fine too.
          </div>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="h-full border-accent-foreground border-x p-6">
        <FeedForm />
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
