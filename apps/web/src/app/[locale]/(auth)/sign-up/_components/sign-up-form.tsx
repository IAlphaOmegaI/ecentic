"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Collapsible,
  CollapsiblePanel,
} from "@zenncore/web/components/collapsible";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import Image from "next/image";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { localizePath } from "@/i18n/locale";
import { useRouter } from "@/i18n/navigation";
import {
  profileRoleValues,
  profileSourceValues,
} from "@/lib/auth-profile-options";
import * as Authentication from "@/server/app/authentication";
import { AuthFeedback, useAuthFeedback } from "../../_components/auth-feedback";

export const SignUpForm = () => {
  const locale = useLocale();
  const router = useRouter();
  const translate = useTranslations("signUp");
  const translateAuthChrome = useTranslations("authChrome");
  const translateAuth = useTranslations("authUX");
  const feedback = useAuthFeedback();
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
          autoComplete: "name",
          validator: z
            .string({ error: translateAuth("validation.fullName") })
            .trim()
            .min(1, translateAuth("validation.fullName")),
          label: translate("fields.fullName.label"),
          placeholder: translate("fields.fullName.placeholder"),
          classList: { field: "col-span-1" },
        }),
        company: field({
          shape: "text",
          autoComplete: "organization",
          validator: z
            .string({ error: translateAuth("validation.company") })
            .trim()
            .min(1, translateAuth("validation.company")),
          label: translate("fields.company.label"),
          placeholder: translate("fields.company.placeholder"),
          classList: { field: "col-span-1" },
        }),
        email: field({
          shape: "text",
          type: "email",
          validator: z
            .string({ error: translateAuth("validation.email") })
            .trim()
            .email(translateAuth("validation.email")),
          label: translate("fields.email.label"),
          placeholder: translate("fields.email.placeholder"),
          classList: { field: "sm:col-span-2" },
        }),
        password: field({
          shape: "text",
          type: "password",
          autoComplete: "new-password",
          maskToggleLabels: {
            show: translateAuth("password.show"),
            hide: translateAuth("password.hide"),
          },
          validator: z
            .string({ error: translateAuth("validation.password") })
            .min(8, translateAuth("validation.passwordLength")),
          label: translate("fields.password.label"),
          placeholder: translate("fields.password.placeholder"),
          classList: { field: "sm:col-span-2" },
        }),
        role: field({
          shape: "select",
          validator: z.literal(profileRoleValues, {
            error: translateAuth("validation.role"),
          }),
          label: translate("fields.role.label"),
          items: roleItems,
          classList: { field: "col-span-1" },
        }),
        source: field({
          shape: "select",
          // @ts-expect-error - source is not typed
          validator: z
            .literal(profileSourceValues, {
              error: translateAuth("validation.source"),
            })
            .optional(),
          label: translate("fields.source.label"),
          items: sourceItems,
          classList: { field: "col-span-1" },
        }),
      }) satisfies GenericForm,
    [roleItems, sourceItems, translate, translateAuth],
  );

  const shopifyFormConfig = useMemo(
    () =>
      ({
        shop: field({
          shape: "text",
          validator: z
            .string({ error: translate("fields.shop.validation") })
            .min(1, translate("fields.shop.validation")),
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
      try {
        feedback.clear();
        setProvider(data.type);

        if (data.type === "google") {
          const result = await Authentication.signInWithGoogle({
            locale,
            callbackURL: localizePath("/complete-profile", locale),
          });

          if (!result.success) {
            feedback.report(result.error, "google");
            return;
          }
          window.location.href = result.data.url;
          return;
        }

        if (data.type === "shopify") {
          const result = await Authentication.signInWithShopify({
            shop: data.data.shop,
            callbackURL: localizePath("/dashboard", locale),
          });

          if (!result.success) {
            feedback.report(result.error, "shopify");

            return;
          }

          window.location.href = result.data.url;
          return;
        }

        const result = await Authentication.signUp({
          locale,
          email: data.data.email,
          password: data.data.password,
          fullName: data.data.fullName,
          company: data.data.company,
          jobTitle: data.data.role,
          source: data.data.source,
        });

        if (!result.success) {
          feedback.report(result.error, "signUp");
          return;
        }

        router.push("/verify");
      } catch (error) {
        feedback.report(
          error,
          data.type === "credential" ? "signUp" : data.type,
        );
      }
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
    <Motion.Stagger stagger={0.04}>
      <AuthFeedback error={feedback.error} />
      <Motion.Item className="mb-3 flex flex-col gap-1.5">
        <Button
          variant="soft"
          color="emphasis"
          className="w-full"
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit({ type: "google" })}
        >
          {provider === "google" && isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <Image src="/images/google.svg" alt="" width={16} height={16} />
          )}
          {translate("action.google")}
        </Button>
        <Button
          variant="soft"
          color="emphasis"
          className="w-full"
          type="button"
          disabled={isPending}
          aria-expanded={provider === "shopify"}
          aria-controls="auth-shopify-fields"
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
              alt=""
              width={16}
              height={16}
              className="size-4"
            />
          )}
          {translate("action.shopify")}
        </Button>
        <Collapsible open={provider === "shopify"} className="w-full">
          <CollapsiblePanel id="auth-shopify-fields" className="bg-transparent">
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
          </CollapsiblePanel>
        </Collapsible>
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
          className="grid grid-cols-1 gap-x-4 gap-y-4 space-y-0 sm:grid-cols-2"
          onSubmit={(data) => handleSubmit({ type: "credential", data })}
        >
          <Button
            type="submit"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full sm:col-span-2"
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
