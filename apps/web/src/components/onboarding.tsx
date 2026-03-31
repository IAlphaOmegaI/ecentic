"use client";

import { CheckIcon } from "@zenncore/icons";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Spring, Stagger } from "@/lib/animations";
import { cn } from "@zenncore/utils";

export namespace Onboarding {
  export type Props = {
    identifier?: string;
    headline: ReactNode;
    points: readonly string[];
    image?: string;
    classList?: {
      image?: string;
    };
  };
}

export const Onboarding = ({
  identifier = "onboarding",
  headline,
  points,
  image = "/images/onboarding.png",
  classList = {},
}: Onboarding.Props) => (
  <motion.aside
    className="sticky top-0 hidden h-screen overflow-hidden lg:flex lg:w-[55%]"
    initial={{ x: -30, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={Spring.Gentle}
  >
    <div className="absolute inset-0 bg-primary" />
    <Image
      src={image}
      alt="onboarding background"
      fill
      className={cn(
        "object-contain object-bottom opacity-60 brightness-0 invert",
        classList.image,
      )}
      aria-hidden="true"
    />
    <div className="relative z-10 flex h-full w-full flex-col justify-between p-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...Spring.Gentle, delay: 0.15 }}
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
        <AnimatePresence mode="wait">
          <motion.h2
            key={identifier}
            className="mb-6 font-medium text-6xl text-white leading-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={Spring.Gentle}
          >
            {headline}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${identifier}-points`}
            className="flex flex-col gap-3"
            variants={Stagger.Container(0.08)}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {points.map((point) => (
              <motion.div
                key={point}
                className="flex items-center gap-3"
                variants={Stagger.Item}
              >
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckIcon className="size-3 text-white" />
                </div>
                <p className="font-light text-sm text-white/90">{point}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        <p className="font-light text-sm text-white/50">
          Free to start. No credit card required.
        </p>
      </div>
    </div>
  </motion.aside>
);
