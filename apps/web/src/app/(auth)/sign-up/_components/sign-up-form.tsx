"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { motion } from "motion/react";
import Image from "next/image";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";
import * as Authentication from "@/server/app/authentication";

const roles = [
  "Founder / CEO",
  "Marketing Lead",
  "E-commerce Manager",
  "Agency",
  "Developer",
  "Other",
];

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
];

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
} satisfies GenericForm;

export namespace SignUpForm {
  export type Props = {
    className?: string;
  };
}
export const SignUpForm = ({ className }: SignUpForm.Props) => {
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await Authentication.signUp(data);

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Account created",
        description:
          "Please check your email to verify your address. You will be redirected to the onboarding process.",
        type: "success",
      });
    },
  );
  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Stagger
        stagger={0.06}
        className={cn("mb-3 flex flex-col gap-1.5", className)}
      >
        <Button variant="soft" color="emphasis" className="w-full">
          <Image src="/images/google.svg" alt="Google" width={16} height={16} />
          Continue with Google
        </Button>
        <Button variant="flat" color="success" className="w-full">
          <Image
            src="/images/shopify.svg"
            alt="Shopify"
            width={16}
            height={16}
          />
          Continue with Shopify
        </Button>
      </Motion.Stagger>

      <motion.div
        className="relative mb-4 flex items-center gap-3"
        variants={Stagger.Item}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ ...Spring.Gentle, delay: 0.3 }}
      >
        <div className="h-px flex-1 bg-accent-foreground" />
        <span className="font-light text-foreground-dimmed">or</span>
        <div className="h-px flex-1 bg-accent-foreground" />
      </motion.div>

      <Motion.Item>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-0.5"
        >
          <Button
            type="submit"
            variant="flat"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full col-span-2 items-center justify-center gap-2 py-2.5 font-medium text-sm"
          >
            {isPending ? "Creating account..." : "Create Account"}
            {isPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
          </Button>
        </InferredForm>
      </Motion.Item>
    </Motion.Stagger>
  );
};
