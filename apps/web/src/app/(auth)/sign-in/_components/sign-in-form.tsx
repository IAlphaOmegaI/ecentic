"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  InferredForm,
  field,
  type FormEntries,
} from "@zenncore/web/components/inferred-form";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import * as Authentication from "@/server/app/authentication";
import { z } from "zod";
import { useToastManager } from "@zenncore/web/components/toast";

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
    label: "Password",
    placeholder: "Your password",
  }),
};

export const SignInForm = () => {
  const router = useRouter();

  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      // const result = await Authentication.signIn({
      //   email: data.email,
      //   password: data.password,
      // });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Error",
          description: result.error.message,
        });

        return;
      }

      router.push("/dashboard");
    },
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          color="accent"
          className="w-full"
        >
          <Image src="/images/google.svg" alt="Google" width={16} height={16} />
          Continue with Google
        </Button>
        <Button type="button" variant="flat" color="success" className="w-full">
          <Image
            src="/images/shopify.svg"
            alt="Shopify"
            width={16}
            height={16}
          />
          Continue with Shopify
        </Button>
      </div>

      <div className="relative mb-4 flex items-center gap-4">
        <div className="h-px flex-1 bg-accent-foreground" />
        <span className="font-light text-foreground-dimmed">or</span>
        <div className="h-px flex-1 bg-accent-foreground" />
      </div>

      <InferredForm
        config={config}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <Link
          href="/forgot-password"
          className="self-end font-light text-primary hover:underline text-sm"
        >
          Forgot password?
        </Link>
        <Button
          type="submit"
          variant="flat"
          color="primary"
          disabled={isPending}
          className="mt-1 w-full"
        >
          {isPending ? "Signing in..." : "Sign In"}
          {!isPending && <ArrowRightIcon className="size-4" />}
        </Button>
      </InferredForm>
    </>
  );
};
