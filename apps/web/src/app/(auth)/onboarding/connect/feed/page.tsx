import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { FeedForm } from "./_components/feed-form";

export default () => (
  <div className="flex flex-1 flex-col overflow-hidden p-8">
    <Motion.Stagger stagger={0.08} delay={0.1}>
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

      <div className="mx-auto flex w-full max-w-lg flex-col">
        <div className="mb-8 flex items-center gap-4">
          <Motion.Item>
            <Image
              src="/images/custom.svg"
              alt="Custom Feed"
              width={64}
              height={64}
            />
          </Motion.Item>
          <div>
            <Motion.Item>
              <h2 className="font-medium text-4xl text-foreground">
                Connect a Product Feed
              </h2>
            </Motion.Item>
            <Motion.Item>
              <p className="mt-1 font-light text-foreground-dimmed text-lg">
                We&apos;ll fetch and parse your feed automatically.
              </p>
            </Motion.Item>
          </div>
        </div>

        <Motion.Item>
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
                <code className="text-foreground">url</code> fields. Nested
                under a <code className="text-foreground">products</code> or{" "}
                <code className="text-foreground">items</code> key is fine too.
              </div>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item>
          <FeedForm />
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
