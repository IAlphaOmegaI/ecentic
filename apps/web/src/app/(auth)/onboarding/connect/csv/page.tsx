"use client";

import { ArrowLeftIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { CsvForm } from "./_components/csv-form";

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="flex flex-1 flex-col overflow-y-auto"
  >
    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="flex flex-col gap-4 border-accent-foreground border-x p-6">
        <Image
          src="/images/custom.svg"
          alt="CSV Import"
          width={64}
          height={64}
        />
        <div>
          <h2 className="font-medium text-4xl text-foreground">Import a CSV</h2>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            Upload a spreadsheet export from any platform.
          </p>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full border-accent-foreground border-b px-8">
      <div className="border-accent-foreground border-x bg-background-dimmed p-6">
        <h3 className="font-medium text-foreground text-xl">
          Expected columns
        </h3>
        <div className="flex flex-col gap-1 font-light text-foreground-dimmed">
          <p>
            <span className="font-medium text-foreground">title</span> or{" "}
            <span className="font-medium text-foreground">name</span> — required
          </p>
          <p>
            <span className="font-medium text-foreground">description</span>,{" "}
            <span className="font-medium text-foreground">price</span>,{" "}
            <span className="font-medium text-foreground">sku</span>,{" "}
            <span className="font-medium text-foreground">image</span>,{" "}
            <span className="font-medium text-foreground">url</span>,{" "}
            <span className="font-medium text-foreground">id</span> — optional
          </p>
          <p className="mt-1 text-xs">
            Column names are case-insensitive. Extra columns are ignored.
          </p>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
      <div className="h-full border-accent-foreground border-x p-6">
        <CsvForm />
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
