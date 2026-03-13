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
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background p-8 md:rounded-l-xl"
      variants={Fade.Right}
      initial="hidden"
      animate="visible"
    >
      <div className="h-full w-full max-w-md md:h-auto">
        <div className="mb-8 lg:hidden">
          <Image
            src="/images/trademark.svg"
            alt="écentic"
            width={100}
            height={28}
            className="h-auto w-24"
          />
        </div>

        <Motion.Stagger stagger={0.08} delay={0.1}>
          <Motion.Item>
            <h2 className="font-medium text-4xl text-foreground">
              Create your account
            </h2>
          </Motion.Item>
          <Motion.Item>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Start winning agent carts in 2 minutes.
            </p>
          </Motion.Item>
          <Motion.Item>
            <SignUpForm className="mt-4" />
          </Motion.Item>
        </Motion.Stagger>

        <motion.p
          className="mt-6 font-light text-foreground-dimmed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in instead
          </Link>
        </motion.p>

        <motion.p
          className="mt-2 pb-8 font-light text-foreground-dimmed md:pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          By creating an account you agree to our{" "}
          <span className="text-foreground">Terms of Service</span> and{" "}
          <span className="text-foreground">Privacy Policy</span>.
        </motion.p>
      </div>
    </motion.div>
  </div>
);
