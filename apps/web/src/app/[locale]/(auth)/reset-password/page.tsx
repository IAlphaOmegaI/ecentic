"use client";

import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { Fade } from "@/lib/animations";
import { ResetPasswordForm } from "./_components/reset-password-form";

const ResetPasswordFormSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="h-10 w-full animate-pulse bg-foreground/10" />
    <div className="h-10 w-full animate-pulse bg-foreground/10" />
    <div className="mt-2 h-10 w-full animate-pulse bg-foreground/10" />
  </div>
);

export default () => {
  const translate = useTranslations("resetPassword");
  const translateAuthChrome = useTranslations("authChrome");
  const translateForgotPassword = useTranslations("forgotPassword");
  const messages = useMessages();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={messages.resetPassword.sidebar.points}
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
            <div className="relative h-full border-accent-foreground border-x p-6">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              {/* ResetPasswordForm reads `?token=` via useSearchParams, which
                  bails out of prerendering under `cacheComponents`. */}
              <Suspense fallback={<ResetPasswordFormSkeleton />}>
                <ResetPasswordForm />
              </Suspense>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full px-8">
            <div className="relative flex flex-row items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              {translate("prompt.didntRequest")}{" "}
              <Button
                color="accent"
                type="button"
                render={<Link href="/sign-in" />}
              >
                <ArrowLeftIcon className="size-4" />{" "}
                {translateForgotPassword("action.secondary")}
              </Button>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </motion.div>
    </div>
  );
};
