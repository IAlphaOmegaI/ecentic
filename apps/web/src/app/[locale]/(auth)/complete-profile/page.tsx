"use client";

import * as motion from "motion/react-client";
import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade } from "@/lib/animations";
import { CompleteProfileForm } from "./_components/complete-profile-form";

export default () => {
  const translate = useTranslations("completeProfile");
  const translateAuthChrome = useTranslations("authChrome");
  const messages = useMessages();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={messages.completeProfile.sidebar.points}
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
                  {translate("title")}
                </h2>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  {translate("description")}
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="h-full border-accent-foreground border-x p-6">
              <CompleteProfileForm />
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </motion.div>
    </div>
  );
};
