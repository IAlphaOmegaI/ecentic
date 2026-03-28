"use client";

import { ArrowRightIcon, BellIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade } from "@/lib/animations";

const points = [
  "We sent a verification link to your inbox",
  "Click the link to confirm your email address",
  "After verifying, you'll start onboarding",
];

export default () => {
  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={points}
        headline={
          <>
            Check your
            <br />
            inbox.
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
                  Verification email sent
                </h2>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  Check your inbox to continue.
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="flex h-full flex-col items-center justify-center gap-6 border-accent-foreground border-x p-6">
              <BellIcon className="size-24 text-primary" />
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-medium text-primary text-2xl">
                  We've sent a verification link to your email address.
                </p>
                <p className="text-foreground-dimmed text-lg">
                  Open your inbox and click the link to verify your account.
                  Didn't receive it? Check your spam folder or try signing up
                  again.
                </p>
              </div>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full border-accent-foreground border-b px-8">
            <div className="flex flex-col gap-2 border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <p>
                The link will expire in 24 hours. If it expires, you can request
                a new one by signing up again.
              </p>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full px-8">
            <div className="flex items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <p>Want to use a different email?</p>
              <Button
                variant="outline"
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
  const { pending } = useLinkStatus();
  return (
    <>
      Sign up again
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
