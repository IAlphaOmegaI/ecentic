"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { InferredForm, field } from "@zenncore/web/components/inferred-form";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { spring, staggerContainer, staggerItem, tapScale } from "@/lib/animations";

const roles = [
  "Founder / CEO",
  "Marketing Lead",
  "E-commerce Manager",
  "Agency",
  "Developer",
  "Other",
] as const;

const sources = [
  "Product Hunt",
  "Twitter / X",
  "LinkedIn",
  "Google Search",
  "Shopify App Store",
  "Friend / Colleague",
  "Newsletter",
  "Podcast",
  "Other",
] as const;

const config = {
  fullName: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Full Name",
    placeholder: "Jane Smith",
    classList: { field: "col-span-1" },
  }),
  company: field({
    shape: "text",
    validator: z.string().min(1),
    label: "Company / Brand",
    placeholder: "Acme Store",
    classList: { field: "col-span-1" },
  }),
  email: field({
    shape: "text",
    validator: z.string().email(),
    label: "Email",
    placeholder: "jane@acmestore.com",
    classList: { field: "col-span-2" },
  }),
  password: field({
    shape: "text",
    type: "password",
    validator: z.string().min(8),
    label: "Password",
    placeholder: "Min 8 characters",
    classList: { field: "col-span-2" },
  }),
  role: field({
    shape: "select",
    validator: z.literal(roles),
    label: "Your Role",
    classList: { field: "col-span-1" },
  }),
  source: field({
    shape: "select",
    validator: z.literal(sources).optional(),
    label: "How did you hear?",
    classList: { field: "col-span-1" },
  }),
};

export const SignUpForm = () => {
  const router = useRouter();
  const [handleSubmit, isPending] = useAsyncAction(async () => {
    router.push("/onboarding/connect");
  });

  return (
    <motion.div
      variants={staggerContainer(0.07)}
      initial="hidden"
      animate="visible"
      // biome-ignore lint/style/noCommaOperator: delay offset for form section
      transition={{ delayChildren: 0.18 }}
    >
      <motion.div className="mb-3 flex flex-col gap-1.5" variants={staggerContainer(0.06)}>
        <motion.button
          type="button"
          className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-background-rich px-4 py-2 text-foreground text-sm transition-colors hover:bg-background-dimmed"
          variants={staggerItem}
          {...tapScale}
        >
          <Image src="/images/google.svg" alt="Google" width={16} height={16} />
          Continue with Google
        </motion.button>
        <motion.button
          type="button"
          className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-[#96BF48] px-4 py-2 text-sm text-white transition-colors hover:bg-[#85a83e]"
          variants={staggerItem}
          {...tapScale}
        >
          <Image src="/images/shopify.svg" alt="Shopify" width={16} height={16} />
          Continue with Shopify
        </motion.button>
      </motion.div>

      <motion.div
        className="relative mb-3 flex items-center gap-3"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ ...spring.gentle, delay: 0.28 }}
      >
        <div className="h-px flex-1 bg-accent-foreground" />
        <span className="font-light text-foreground-dimmed text-xs">or</span>
        <div className="h-px flex-1 bg-accent-foreground" />
      </motion.div>

      <motion.div variants={staggerItem}>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-0.5"
        >
          <motion.div
            className="col-span-2"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
          >
            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={isPending}
              className="mt-1 flex w-full items-center justify-center gap-2 py-2.5 font-medium text-sm"
            >
              {isPending ? "Creating account..." : "Create Account"}
              {!isPending && <ArrowRightIcon className="size-4" />}
            </Button>
          </motion.div>
        </InferredForm>
      </motion.div>
    </motion.div>
  );
};
