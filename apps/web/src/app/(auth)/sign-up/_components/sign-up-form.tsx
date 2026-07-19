"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Spring } from "@/lib/animations";
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

const credentialFormConfig = {
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
    // @ts-expect-error - source is not typed
    validator: z.literal(sources).optional(),
    label: "How did you hear?",
    classList: { field: "col-span-1" },
  }),
} satisfies GenericForm;

const shopifyFormConfig = {
  shop: field({
    shape: "text",
    validator: z.string().min(1, "Enter your store domain"),
    label: "Shopify store domain",
    placeholder: "mystore.myshopify.com",
  }),
} satisfies GenericForm;

export const SignUpForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [provider, setProvider] = useState<"credential" | "google" | "shopify">(
    "credential",
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (
      data:
        | { type: "credential"; data: FormEntries<typeof credentialFormConfig> }
        | { type: "shopify"; data: FormEntries<typeof shopifyFormConfig> }
        | { type: "google" },
    ) => {
      setProvider(data.type);

      if (data.type === "google") {
        const result = await Authentication.signInWithGoogle({
          callbackURL: "/complete-profile",
        });

        if (result.success) window.location.href = result.data.url;
        return;
      }

      if (data.type === "shopify") {
        const result = await Authentication.signInWithShopify({
          shop: data.data.shop,
          callbackURL: "/dashboard",
        });

        if (!result.success) {
          toast.add({
            title: "Error",
            description: result.error.message,
            type: "error",
          });

          return;
        }

        window.location.href = result.data.url;
        return;
      }

      const result = await Authentication.signUp({
        email: data.data.email,
        password: data.data.password,
        fullName: data.data.fullName,
        company: data.data.company,
        jobTitle: data.data.role,
        source: data.data.source,
      });

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push("/verify");
    },
  );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Item className="mb-3 flex flex-col gap-1.5">
        <Button
          variant="soft"
          color="emphasis"
          className="w-full"
          type="button"
          onClick={() => handleSubmit({ type: "google" })}
        >
          {provider === "google" && isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <Image
              src="/images/google.svg"
              alt="Google"
              width={16}
              height={16}
            />
          )}
          Continue with Google
        </Button>
        <Button
          variant="soft"
          color="emphasis"
          className="w-full"
          type="button"
          onClick={() =>
            setProvider((previous) =>
              previous === "shopify" ? "credential" : "shopify",
            )
          }
        >
          {provider === "shopify" && isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <Image
              src="/images/shopify.svg"
              alt="Shopify"
              width={16}
              height={16}
              className="size-[16px]"
            />
          )}
          Continue with Shopify
        </Button>
        <AnimatePresence initial={false}>
          {provider === "shopify" && (
            <motion.div
              key="shopify-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={Spring.Snappy}
              style={{ overflow: "hidden" }}
            >
              <InferredForm
                config={shopifyFormConfig}
                onSubmit={(data) => handleSubmit({ data, type: "shopify" })}
                className="flex flex-col gap-2 pt-1"
              >
                <Button
                  type="submit"
                  color="primary"
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                  Connect Shopify store
                </Button>
              </InferredForm>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-accent-foreground" />
          <span className="font-light text-foreground-dimmed">or</span>
          <div className="h-px flex-1 bg-accent-foreground" />
        </div>
      </Motion.Item>

      <Motion.Item>
        <InferredForm
          config={credentialFormConfig}
          className="grid grid-cols-2 gap-x-3 gap-y-0.5"
          onSubmit={(data) => handleSubmit({ type: "credential", data })}
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="col-span-2 mt-1 flex w-full"
          >
            {isPending
              ? provider === "credential"
                ? "Creating account..."
                : "Signing in with Google..."
              : "Create Account"}
            {provider === "credential" && isPending ? (
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
