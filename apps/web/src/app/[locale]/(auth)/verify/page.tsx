"use client";

import { ArrowRightIcon, BellIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import { useMessages, useTranslations } from "next-intl";
import Image from "next/image";
import { useLinkStatus } from "next/link";
import { Link } from "@/i18n/navigation";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Fade } from "@/lib/animations";

export default () => {
  const translate = useTranslations("verifyEmail");
  const translateAuthChrome = useTranslations("authChrome");
  const messages = useMessages();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={messages.verifyEmail.sidebar.points}
        footer={translateAuthChrome("footer")}
        imageAlt={translateAuthChrome("imageAlt")}
        headline={
          <>
            {translate("sidebar.headline.primary")}
            <br />
            {translate("sidebar.headline.accent")}
          </>
        }
      />
      <motion.div
        className="flex flex-1 flex-col overflow-hidden bg-background"
        variants={Fade.Right}
        initial="hidden"
        animate="visible"
      >
        <Motion.Stagger
          stagger={0.08}
          delay={0.1}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <Motion.Item className="w-full border-accent-foreground border-b px-8">
            <div className="relative flex flex-col gap-4 border-accent-foreground border-x p-6">
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <div className="lg:hidden">
                <Image
                  src="/images/trademark.svg"
                  alt="ecentic"
                  width={100}
                  height={28}
                  className="h-auto w-24"
                  loading="eager"
                />
              </div>
              <div>
                <h2 className="font-medium text-4xl text-foreground">
                  {translate("title")}
                </h2>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  {translate("description")}
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="relative flex h-full flex-col items-center justify-center gap-6 border-accent-foreground border-x p-6">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <BellIcon className="size-24 text-primary" />
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-medium text-2xl text-primary">
                  {translate("states.pending.title")}
                </p>
                <p className="text-foreground-dimmed text-lg">
                  {translate("states.pending.description")}
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full border-accent-foreground border-b px-8">
            <div className="relative flex flex-col gap-2 border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <p>{translate("states.pending.expiry")}</p>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full px-8">
            <div className="relative flex items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <p>{translate("prompt.differentEmail")}</p>
              <Button
                color="accent"
                type="button"
                render={<Link href="/sign-up" />}
              >
                <BackToSignUp />
              </Button>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </motion.div>
    </div>
  );
};

const BackToSignUp = () => {
  const translate = useTranslations("verifyEmail");
  const { pending } = useLinkStatus();
  return (
    <>
      {translate("action.signUpAgain")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
