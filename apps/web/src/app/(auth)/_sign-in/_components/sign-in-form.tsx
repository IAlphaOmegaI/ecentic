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
import { Motion } from "@/components/motion";
import { postAuthLandingPath } from "@/lib/app-scope";
import { authEmailSchema, signInPasswordSchema } from "@/lib/auth-form-schema";
import * as Authentication from "@/server/app/authentication";

const config = {
  email: field({
    shape: "text",
    validator: authEmailSchema,
    label: "Email",
    placeholder: "jane@acmestore.com",
    description: "Use the address you signed up with.",
  }),
  password: field({
    shape: "text",
    type: "password",
    validator: signInPasswordSchema,
    label: (_props) => (
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

export const SignInForm = () => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await Authentication.signIn(data);

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      router.push(postAuthLandingPath);
    },
  );

  return (
    <Motion.Stagger stagger={0.07} delay={0.18}>
      <Motion.Up className="mb-4 flex flex-col gap-2">
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
        <div className="relative mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-accent-foreground" />
          <span className="font-light text-foreground-dimmed">or</span>
          <div className="h-px flex-1 bg-accent-foreground" />
        </div>
      </Motion.Up>

      <Motion.Up>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          <Button
            type="submit"
            variant="flat"
            color="primary"
            disabled={isPending}
            className="mt-1 flex w-full"
          >
            {isPending ? "Signing in..." : "Sign In"}
            {isPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
          </Button>
        </InferredForm>
      </Motion.Up>
    </Motion.Stagger>
  );
};
