"use client";
import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Spring } from "@/lib/animations";
import * as Authentication from "@/server/app/authentication";

const config = {
  code: field({
    shape: "otp",
    validator: z.string().length(6),
    maxLength: 6,
  }),
};

export namespace VerifyForm {
  export type Props = {
    token: string;
    className?: string;
  };
}

export const VerifyForm = ({ token, className }: VerifyForm.Props) => {
  const toast = useToastManager();

  const [handleSubmit, isPending] = useAsyncAction(async () => {
    const result = await Authentication.verifyEmail(token);
    if (!result.success) {
      toast.add({
        title: "Error",
        description: result.error.message,
        type: "error",
      });
      return;
    }
    window.location.href = result.data.redirectUrl;
  });

  return (
    <Motion.Stagger stagger={0.08} delay={0.22} className={className}>
      <Motion.Item>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6"
        >
          <Motion.Tap
            className="w-full"
            whileHover={{ y: -1 }}
            transition={Spring.Snappy}
          >
            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 py-2.5 font-medium text-sm"
            >
              {isPending ? "Verifying..." : "Verify Email"}
              {isPending ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <ArrowRightIcon className="size-4" />
              )}
            </Button>
          </Motion.Tap>
        </InferredForm>
      </Motion.Item>
    </Motion.Stagger>
  );
};
