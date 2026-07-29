"use client";

import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Fade } from "@/lib/animations";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

const points = [
  "Enter the email you signed up with",
  "We'll send you a link to choose a new password",
  "The link works once and expires in an hour",
];

export default () => (
  <div className="flex h-screen overflow-hidden bg-primary">
    <Onboarding
      points={points}
      headline={
        <>
          Let's get
          <br />
          you back in.
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
                Forgot your password?
              </h2>
              <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                We'll email you a link to set a new one.
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
            <ForgotPasswordForm />
          </div>
        </Motion.Item>

        <Motion.Item className="w-full px-8">
          <div className="relative flex flex-row items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            Remembered it?{" "}
            <Button
              color="accent"
              type="button"
              render={<Link href="/sign-in" />}
            >
              <ArrowLeftIcon className="size-4" /> Back to sign in
            </Button>
          </div>
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  </div>
);
