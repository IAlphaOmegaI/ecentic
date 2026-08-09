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
import { useMessages, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { useRouter } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";
import {
  profileRoleValues,
  profileSourceValues,
} from "@/lib/auth-profile-options";
import * as Authentication from "@/server/app/authentication";

export const SignUpForm = () => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("signUp");
  const translateAuthChrome = useTranslations("authChrome");
  const messages = useMessages();

  const [provider, setProvider] = useState<"credential" | "google" | "shopify">(
    "credential",
  );

  const roleItems = messages.signUp.roles;
  const sourceItems = messages.signUp.sources;

  const credentialFormConfig = useMemo(
    () =>
      ({
        fullName: field({
          shape: "text",
          validator: z.string().min(1),
          label: translate("fields.fullName.label"),
          placeholder: translate("fields.fullName.placeholder"),
          classList: { field: "col-span-1" },
        }),
        company: field({
          shape: "text",
          validator: z.string().min(1),
          label: translate("fields.company.label"),
          placeholder: translate("fields.company.placeholder"),
          classList: { field: "col-span-1" },
        }),
        email: field({
          shape: "text",
          validator: z.string().email(),
          label: translate("fields.email.label"),
          placeholder: translate("fields.email.placeholder"),
          classList: { field: "col-span-2" },
        }),
        password: field({
          shape: "text",
          type: "password",
          validator: z.string().min(8),
          label: translate("fields.password.label"),
          placeholder: translate("fields.password.placeholder"),
          classList: { field: "col-span-2" },
        }),
        role: field({
          shape: "select",
          validator: z.literal(profileRoleValues),
          label: translate("fields.role.label"),
          items: roleItems,
          classList: { field: "col-span-1" },
        }),
        source: field({
          shape: "select",
          // @ts-expect-error - source is not typed
          validator: z.literal(profileSourceValues).optional(),
          label: translate("fields.source.label"),
          items: sourceItems,
          classList: { field: "col-span-1" },
        }),
      }) satisfies GenericForm,
    [roleItems, sourceItems, translate],
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
            title: translateAuthChrome("toast.error.title"),
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
          title: translateAuthChrome("toast.error.title"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push("/verify");
    },
  );

  const submitLabel = (() => {
    if (!isPending) {
      return translate("action.primary");
    }

    if (provider === "credential") {
      return translate("states.creatingAccount");
    }

    return translate("states.signingInWithGoogle");
  })();

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
        <div className="relative flex items-center gap-3">
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
          className="grid grid-cols-2 gap-x-3 gap-y-0.5"
          onSubmit={(data) => handleSubmit({ type: "credential", data })}
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="col-span-2 mt-1 flex w-full"
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
