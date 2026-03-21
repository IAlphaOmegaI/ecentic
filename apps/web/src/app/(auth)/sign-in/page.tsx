import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade } from "@/lib/animations";
import { SignInForm } from "./_components/sign-in-form";

const points = [
  "Pick up right where you left off",
  "Your agent simulations run continuously in the background",
  "Track your ranking improvements over time",
];

export default () => (
  <div className="flex h-screen overflow-hidden bg-primary">
    <Onboarding
      points={points}
      headline={
        <>
          Hello
          <br />
          again.
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
                Sign in to écentic
              </h2>
              <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                Continue optimizing your product listings.
              </p>
            </div>
          </div>
        </Motion.Item>

        <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
          <div className="h-full border-accent-foreground border-x p-6">
            <SignInForm />
          </div>
        </Motion.Item>

        <Motion.Item className="w-full px-8">
          <div className="flex flex-row items-center justify-between border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
            Don't have an account?{" "}
            <Button
              variant="outline"
              color="accent"
              type="button"
              render={<Link href="/sign-up" />}
            >
              Get started free <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  </div>
);
