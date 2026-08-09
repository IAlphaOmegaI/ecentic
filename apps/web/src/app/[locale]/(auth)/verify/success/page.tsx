"use client";

import { ArrowRightIcon, CheckBadgeIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import { useMessages, useTranslations } from "next-intl";
import Image from "next/image";
import { useLinkStatus } from "next/link";
import { Link } from "@/i18n/navigation";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade, Spring } from "@/lib/animations";

export default () => {
  const translate = useTranslations("verifyEmail");
  const translateAuthChrome = useTranslations("authChrome");
  const messages = useMessages();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={messages.verifyEmail.states.success.points}
        footer={translateAuthChrome("footer")}
        imageAlt={translateAuthChrome("imageAlt")}
        headline={
          <>
            {translate("states.success.headline.primary")}
            <br />
            {translate("states.success.headline.accent")}
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
            <div className="flex flex-col gap-4 border-accent-foreground border-x p-6">
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
                  {translate("states.success.title")}
                </h2>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  {translate("states.success.description")}
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="flex h-full flex-col items-center justify-center gap-6 border-accent-foreground border-x p-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...Spring.Bounce, delay: 0.35 }}
              >
                <CheckBadgeIcon className="size-24 text-success" />
              </motion.div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-medium text-2xl text-success">
                  {translate("states.success.confirmed.title")}
                </p>
                <p className="font-light text-foreground-dimmed text-lg">
                  {translate("states.success.confirmed.description")}
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full px-8">
            <div className="flex items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <p>{translate("states.success.prompt.ready")}</p>
              <Button
                variant="flat"
                color="primary"
                type="button"
                render={<Link href="/onboarding/connect" />}
              >
                <SignIn />
              </Button>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </motion.div>
    </div>
  );
};

const SignIn = () => {
  const translate = useTranslations("verifyEmail");
  const { pending } = useLinkStatus();
  return (
    <>
      {translate("states.success.prompt.signIn")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
