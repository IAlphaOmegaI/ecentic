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
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Link, useRouter } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";
import { sanitizeRedirect } from "@/lib/redirect";
import * as Authentication from "@/server/app/authentication";

export const SignInForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const searchParameters = useSearchParams();
  const translate = useTranslations("signIn");
  const translateAuthChrome = useTranslations("authChrome");
  const [provider, setProvider] = useState<"credential" | "google" | "shopify">(
    "credential",
  );

  const credentialFormConfig = useMemo(
    () =>
      ({
        email: field({
          shape: "text",
          validator: z.string().email(),
          label: translate("fields.email.label"),
          placeholder: translate("fields.email.placeholder"),
        }),
        password: field({
          shape: "text",
          type: "password",
          validator: z.string().min(1),
          // @ts-expect-error - label is a function
          label: () => (
            <div className="flex items-center justify-between">
              <FieldLabel>{translate("fields.password.label")}</FieldLabel>
              <Link
                href="/forgot-password"
                className="self-end font-light text-primary text-sm hover:underline"
              >
                {translate("action.tertiary")}
              </Link>
            </div>
          ),
          placeholder: translate("fields.password.placeholder"),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  const shopifyFormConfig = useMemo(
    () =>
      ({
        shop: field({
          shape: "text",
          validator: z.string().min(1, translate("fields.shop.validation")),
          label: translate("fields.shop.label"),
          placeholder: translate("fields.shop.placeholder"),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  // Set by the proxy when it bounces an unauthenticated request off a protected
  // route. Each provider keeps its own fallback for the plain `/sign-in` case.
  const requestedRedirect = searchParameters.get("redirect");

  const [handleSubmit, isPending] = useAsyncAction(
    async (
      data:
        | { type: "credential"; data: FormEntries<typeof credentialFormConfig> }
        | { type: "google" }
        | { type: "shopify"; data: FormEntries<typeof shopifyFormConfig> },
    ) => {
      setProvider(data.type);

      if (data.type === "google") {
        // Existing users land on the dashboard (its empty state routes
        // store-less accounts to onboarding); first-time Google users are
        // routed to /complete-profile via `newUserCallbackURL` server-side.
        const result = await Authentication.signInWithGoogle({
          callbackURL: sanitizeRedirect(requestedRedirect, "/dashboard"),
        });

        if (!result.success) {
          toast.add({
            title: translateAuthChrome("toast.error.title"),
            description: result.error.message,
            type: "error",
          });

          return;
        }

        window.location.href = result.data.url;
        return;
      }

      if (data.type === "shopify") {
        const result = await Authentication.signInWithShopify({
          shop: data.data.shop,
          callbackURL: sanitizeRedirect(requestedRedirect, "/dashboard"),
        });

        if (!result.success) {
          toast.add({
            title: translateAuthChrome("toast.error.title"),
            description: result.error.message,
            type: "error",
          });

          return;
        }

        window.location.href = result.data.url;
        return;
      }

      const result = await Authentication.signIn(data.data);

      if (!result.success) {
        toast.add({
          title: translateAuthChrome("toast.error.title"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push(sanitizeRedirect(requestedRedirect, "/onboarding/connect"));
    },
  );

  const submitLabel = (() => {
    if (provider === "credential" && isPending) {
      return translate("states.signingIn");
    }

    if (provider === "google" && isPending) {
      return translate("states.signingInWithGoogle");
    }

    return translate("action.primary");
  })();

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
          {translate("action.google")}
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
          {translate("action.shopify")}
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
                  {translate("action.connectShopify")}
                </Button>
              </InferredForm>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-accent-foreground" />
          <span className="font-light text-foreground-dimmed">
            {translateAuthChrome("divider")}
          </span>
          <div className="h-px flex-1 bg-accent-foreground" />
        </div>
      </Motion.Item>

      <Motion.Item>
        <InferredForm
          config={credentialFormConfig}
          onSubmit={(data) => handleSubmit({ type: "credential", data })}
          className="flex flex-col gap-3"
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full"
          >
            {submitLabel}
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
