import { parseSearchParam } from "@zenncore/utils";
import type { SearchParamsProps } from "@zenncore/web/types";
import * as motion from "motion/react-client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Fade } from "@/lib/animations";
import { VerifyForm } from "./_components/verify-form";

const points = [
  "Check your spam folder if you don't see it",
  "The code expires in 10 minutes",
  "Each code can only be used once",
];

export default async ({ searchParams }: SearchParamsProps<"token">) => {
  const query = await searchParams;
  const token = parseSearchParam(query.token, "single");

  if (!token) return notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={points}
        headline={
          <>
            On more <br /> step.
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
              <VerifyForm token={token} className="mt-4" />
            </Motion.Item>
          </Motion.Stagger>

          <motion.p
            className="mt-6 font-light text-foreground-dimmed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            Didn't receive a code?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Resend code
            </Link>
          </motion.p>
          <motion.p
            className="mt-2 font-light text-foreground-dimmed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            Wrong email?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Go back
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
