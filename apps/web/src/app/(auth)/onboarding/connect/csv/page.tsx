"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { CsvForm } from "./_components/csv-form";

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
              alt="CSV Import"
              width={64}
              height={64}
            />
          </Motion.Item>
          <div>
            <Motion.Item>
              <h2 className="font-medium text-4xl text-foreground">
                Import a CSV
              </h2>
            </Motion.Item>
            <Motion.Item>
              <p className="mt-1 font-light text-foreground-dimmed text-lg">
                Upload a spreadsheet export from any platform.
              </p>
            </Motion.Item>
          </div>
        </div>

        <Motion.Item>
          <div className="mb-8 flex flex-col gap-4 border border-accent-foreground bg-background-rich p-5">
            <h3 className="font-medium text-foreground text-sm">
              Expected columns
            </h3>
            <div className="flex flex-col gap-1 font-light text-foreground-dimmed text-sm">
              <p>
                <code className="text-foreground">title</code> or{" "}
                <code className="text-foreground">name</code> — required
              </p>
              <p>
                <code className="text-foreground">description</code>,{" "}
                <code className="text-foreground">price</code>,{" "}
                <code className="text-foreground">sku</code>,{" "}
                <code className="text-foreground">image</code>,{" "}
                <code className="text-foreground">url</code>,{" "}
                <code className="text-foreground">id</code> — optional
              </p>
              <p className="mt-1 text-xs">
                Column names are case-insensitive. Extra columns are ignored.
              </p>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item>
          <CsvForm />
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
