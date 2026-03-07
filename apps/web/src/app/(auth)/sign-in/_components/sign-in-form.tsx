"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { InferredForm, field } from "@zenncore/web/components/inferred-form";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

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
  const [handleSubmit, isPending] = useAsyncAction(async () => {
    router.push("/dashboard");
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-background-rich px-4 py-2.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
        >
          <Image src="/images/google.svg" alt="Google" width={16} height={16} />
          Continue with Google
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-[#96BF48] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#85a83e]"
        >
          <Image src="/images/shopify.svg" alt="Shopify" width={16} height={16} />
          Continue with Shopify
        </button>
      </div>

      <div className="relative mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-accent-foreground" />
        <span className="font-light text-foreground-dimmed text-xs">or</span>
        <div className="h-px flex-1 bg-accent-foreground" />
      </div>

      <InferredForm
        config={config}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <Link
          href="/forgot-password"
          className="self-end font-light text-primary text-xs hover:underline"
        >
          Forgot password?
        </Link>
        <Button
          type="submit"
          variant="flat"
          color="primary"
          disabled={isPending}
          className="mt-1 flex w-full items-center justify-center gap-2 py-2.5 font-medium text-sm"
        >
          {isPending ? "Signing in..." : "Sign In"}
          {!isPending && <ArrowRightIcon className="size-4" />}
        </Button>
      </InferredForm>
    </>
  );
};
