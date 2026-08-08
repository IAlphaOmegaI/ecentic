"use client";

import { ArrowRightIcon, CheckCircleIcon, LoaderIcon } from "@zenncore/icons";
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
import { useState } from "react";
import { z } from "zod";
import { Motion } from "@/components/motion";
import { Spring } from "@/lib/animations";
import * as Authentication from "@/server/app/authentication";

const config = {
  email: field({
    shape: "text",
    validator: z.string().email(),
    label: "Email",
    placeholder: "jane@acmestore.com",
    description: "The email associated with your account.",
  }),
} satisfies GenericForm;

export const ForgotPasswordForm = () => {
  const toast = useToastManager();
  // Holds the address the link went to, and doubles as the "sent" flag.
  const [recipient, setRecipient] = useState<string | null>(null);

  const [handleSubmit, isPending] = useAsyncAction(
    async ({ email }: FormEntries<typeof config>) => {
      const result = await Authentication.forgotPassword({ email });

      if (!result.success) {
        toast.add({
          title: "Error",
          description: result.error.message,
          type: "error",
        });

        return;
      }

      // Deliberately unconditional: the action succeeds for an address that
      // has no account too, and saying so here would leak who has one.
      setRecipient(email);
    },
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      {recipient ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={Spring.Snappy}
          className="flex flex-col items-center gap-6 py-8 text-center"
        >
          <CheckCircleIcon className="size-16 text-primary" />
          <div className="flex flex-col gap-2">
            <p className="font-medium text-2xl text-foreground">
              Check your inbox
            </p>
            <p className="font-light text-foreground-dimmed text-lg">
              If an account exists for{" "}
              <span className="text-foreground">{recipient}</span>, a reset link
              is on its way. It expires in one hour.
            </p>
          </div>
          <Button
            variant="soft"
            color="emphasis"
            type="button"
            onClick={() => setRecipient(null)}
          >
            Use a different email
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="request"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={Spring.Snappy}
        >
          <Motion.Stagger stagger={0.07} delay={0.18}>
            <Motion.Item>
              <InferredForm
                config={config}
                onSubmit={handleSubmit}
                className="flex flex-col gap-3"
              >
                <Button
                  type="submit"
                  color="primary"
                  disabled={isPending}
                  className="mt-1 flex w-full"
                >
                  {isPending ? "Sending link..." : "Send reset link"}
                  {isPending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-4" />
                  )}
                </Button>
              </InferredForm>
            </Motion.Item>
          </Motion.Stagger>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
