"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { PlatformGrid } from "./_components/platform-grid";

export default () => {
  const translate = useTranslations("onboarding.connect");

  return (
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
            {translate("page.title")}
          </h2>
          <p className="font-light text-2xl text-foreground-dimmed">
            {translate("page.description")}
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
            {translate("footer.settingsHint")}
          </p>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};

const Skip = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.connect");

  return (
    <>
      {translate("action.skip")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
