"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { FieldLabel } from "@zenncore/web/components/form";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import * as Authentication from "@/server/app/authentication";

const config = {
  email: field({
    shape: "text",
    validator: z.string().email(),
    label: "Email",
    placeholder: "jane@acmestore.com",
  }),
  password: field({
    shape: "text",
    type: "password",
    validator: z.string().min(1),
    // @ts-expect-error - label is a function
    label: () => (
      <div className="flex items-center justify-between">
        <FieldLabel>Password</FieldLabel>
        <Link
          href="/forgot-password"
          className="self-end font-light text-primary text-sm hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    ),
    placeholder: "Your password",
  }),
} satisfies GenericForm;

// const shopifyConfig = {
//   shop: field({
//     shape: "text",
//     validator: z.string().min(1, "Enter your store domain"),
//     label: "Shopify store domain",
//     placeholder: "mystore.myshopify.com",
//   }),
// } satisfies GenericForm;

export const SignInForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [provider, setProvider] = useState<"email" | "google" | "shopify">(
    "email",
  );
  // const [showShopifyForm, setShowShopifyForm] = useState(false);

  const [handleSubmit, isPending] = useAsyncAction(
    async (
      data:
        | { data: FormEntries<typeof config>; type: "email" }
        | { type: "google" },
      // | { data: FormEntries<typeof shopifyConfig>; type: "shopify" },
    ) => {
      setProvider(data.type);

      if (data.type === "google") {
        const result = await Authentication.signInWithGoogle({
          callbackURL: "/onboarding/connect",
        });
        if (result.success) window.location.href = result.data.url;
        return;
      }

      // if (data.type === "shopify") {
      //   const result = await Authentication.signInWithShopify({
      //     shop: data.data.shop,
      //     callbackURL: "/onboarding/connect",
      //   });
      //   if (!result.success) {
      //     toast.add({
      //       title: "Error",
      //       description: result.error.message,
      //       type: "error",
      //     });
      //     return;
      //   }
      //   window.location.href = result.data.url;
      //   return;
      // }

      const result = await Authentication.signIn(data.data);

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push("/onboarding/connect");
    },
  );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Item className="mb-4 flex flex-col gap-2">
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
        {/* <Button
          variant="soft"
          color="emphasis"
          className="w-full"
          type="button"
          onClick={() => setShowShopifyForm((previous) => !previous)}
        >
          {provider === "shopify" && isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <Image
              src="/images/shopify.svg"
              alt="Shopify"
              width={16}
              height={16}
            />
          )}
          Continue with Shopify
        </Button> */}
        {/* {showShopifyForm && (
          <InferredForm
            config={shopifyConfig}
            onSubmit={(data) => handleSubmit({ data, type: "shopify" })}
            className="flex flex-col gap-2 pt-1"
          >
            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={isPending && provider === "shopify"}
              className="w-full"
            >
              {provider === "shopify" && isPending ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <ArrowRightIcon className="size-4" />
              )}
              Connect Shopify store
            </Button>
          </InferredForm>
        )} */}
        <div className="relative mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-accent-foreground" />
          <span className="font-light text-foreground-dimmed">or</span>
          <div className="h-px flex-1 bg-accent-foreground" />
        </div>
      </Motion.Item>

      <Motion.Item>
        <InferredForm
          config={config}
          onSubmit={(data) => handleSubmit({ data, type: "email" })}
          className="flex flex-col gap-3"
        >
          <Button
            type="submit"
            variant="flat"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full"
          >
            {provider === "email" && isPending
              ? "Signing in..."
              : provider === "google" && isPending
                ? "Signing in with Google..."
                : "Sign in"}
            {provider === "email" && isPending ? (
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
