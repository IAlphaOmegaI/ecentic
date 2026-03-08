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
      className="flex flex-1 flex-col items-center justify-center overflow-hidden md:rounded-l-xl bg-background p-8"
      variants={Fade.Right}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 lg:hidden">
          <Image
            src="/images/trademark.svg"
            alt="écentic"
            width={100}
            height={28}
            className="h-auto w-24"
          />
        </div>

        <Motion.Stagger className="mb-6" stagger={0.08} delay={0.1}>
          <Motion.Item>
            <h2 className="font-medium text-4xl text-foreground">
              Sign in to écentic
            </h2>
          </Motion.Item>
          <Motion.Item>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Continue optimizing your product listings.
            </p>
          </Motion.Item>
          <Motion.Item>
            <SignInForm className="mt-4" />
          </Motion.Item>
        </Motion.Stagger>

        <motion.p
          className="mt-4 font-light text-foreground-dimmed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Don't have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Get started free
          </Link>
        </motion.p>
      </div>
    </motion.div>
  </div>
);
