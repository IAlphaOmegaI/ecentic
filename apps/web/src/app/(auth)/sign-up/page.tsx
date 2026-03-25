"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade } from "@/lib/animations";
import { SignUpForm } from "./_components/sign-up-form";

const points = [
  "Simulate how GPT-4, Claude & Gemini pick products",
  "Diagnose exactly why agents skip yours",
  "Auto-optimize listings to win every cart",
];

export default () => (
  <div className="flex h-screen overflow-hidden bg-primary">
    <Onboarding
      points={points}
      headline={
        <>
          Win every
          <br />
          agent's cart.
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
                alt="écentic"
                width={100}
                height={28}
                className="h-auto w-24"
                loading="eager"
              />
            </div>
            <div>
              <h2 className="font-medium text-4xl text-foreground">
                Create your account
              </h2>
              <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                Start winning agent carts in 2 minutes.
              </p>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
          <div className="h-full border-accent-foreground border-x p-6">
            <SignUpForm />
          </div>
        </Motion.Item>
        <Motion.Item className="w-full border-accent-foreground border-b px-8">
          <div className="flex flex-col gap-2 border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
            <p>
              By creating an account you agree to our{" "}
              <span className="text-foreground">Terms of Service</span> and{" "}
              <span className="text-foreground">Privacy Policy</span>.
            </p>
          </div>
        </Motion.Item>

        <Motion.Item className="w-full px-8">
          <div className="flex items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
            <p>Already have an account? </p>
            <Button
              variant="outline"
              color="accent"
              type="button"
              render={<Link href="/sign-in" />}
            >
              Sign in instead <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  </div>
);
