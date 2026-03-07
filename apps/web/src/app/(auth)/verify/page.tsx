"use client";

import { CheckIcon } from "@zenncore/icons";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { VerifyForm } from "./_components/verify-form";
import {
  fadeInLeft,
  fadeInRight,
  spring,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

const brandPoints = [
  "Check your spam folder if you don't see it",
  "The code expires in 10 minutes",
  "Each code can only be used once",
] as const;

export default () => (
  <div className="flex h-screen overflow-hidden">
    <motion.div
      className="hidden lg:flex lg:w-1/2 sticky top-0 h-screen overflow-hidden"
      variants={fadeInLeft}
      initial="hidden"
      animate="visible"
    >
      <div className="absolute inset-0 bg-primary" />
      <Image
        src="/images/onboarding-photo.png"
        alt=""
        fill
        className="object-contain object-bottom opacity-20"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.15 }}
        >
          <Image
            src="/images/wordmark.svg"
            alt="écentic"
            width={120}
            height={32}
            className="h-auto w-28 brightness-0 invert"
          />
        </motion.div>
        <div className="flex flex-1 items-end pb-2">
          <motion.h1
            className="font-medium text-6xl text-white leading-none mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.2 }}
          >
            One step
            <br />
            away.
          </motion.h1>
        </div>
        <motion.div
          className="flex flex-col gap-4"
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="visible"
          // biome-ignore lint/style/noCommaOperator: delay offset for brand points
          transition={{ delayChildren: 0.35 }}
        >
          <div className="flex flex-col gap-3">
            {brandPoints.map((point) => (
              <motion.div key={point} className="flex items-start gap-3" variants={staggerItem}>
                <motion.div
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.bounce, delay: 0.5 }}
                >
                  <CheckIcon className="size-3 text-white" />
                </motion.div>
                <p className="font-light text-sm text-white/90">{point}</p>
              </motion.div>
            ))}
          </div>
          <motion.p className="font-light text-sm text-white/50" variants={staggerItem}>
            Free to start. No credit card required.
          </motion.p>
        </motion.div>
      </div>
    </motion.div>

    <motion.div
      className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6"
      variants={fadeInRight}
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

        <motion.div
          className="mb-8 text-center"
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate="visible"
          // biome-ignore lint/style/noCommaOperator: delay offset for heading
          transition={{ delayChildren: 0.1 }}
        >
          <motion.h2 className="font-medium text-2xl text-foreground" variants={staggerItem}>
            Verify your email
          </motion.h2>
          <motion.p
            className="mt-1 font-light text-foreground-dimmed text-sm"
            variants={staggerItem}
          >
            We sent a 6-digit code to your email address.
            <br />
            Enter it below to confirm your account.
          </motion.p>
        </motion.div>

        <VerifyForm />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <p className="mt-4 text-center font-light text-foreground-dimmed text-sm">
            Didn't receive a code?{" "}
            <button type="button" className="text-primary hover:underline">
              Resend code
            </button>
          </p>
          <p className="mt-3 text-center font-light text-foreground-dimmed text-sm">
            Wrong email?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Go back
            </Link>
          </p>
        </motion.div>
      </div>
    </motion.div>
  </div>
);
