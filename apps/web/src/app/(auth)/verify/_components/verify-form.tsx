"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { InferredForm, field } from "@zenncore/web/components/inferred-form";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { spring, staggerContainer, staggerItem } from "@/lib/animations";

const config = {
  code: field({
    shape: "otp",
    validator: z.string().length(6),
    length: 6,
  }),
};

export const VerifyForm = () => {
  const router = useRouter();
  const [handleSubmit, isPending] = useAsyncAction(async () => {
    router.push("/onboarding/connect");
  });

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
      // biome-ignore lint/style/noCommaOperator: delay offset for verify form
      transition={{ delayChildren: 0.22 }}
    >
      <motion.div variants={staggerItem}>
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            className="w-full"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
          >
            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 font-medium text-sm"
            >
              {isPending ? "Verifying..." : "Verify Email"}
              {!isPending && <ArrowRightIcon className="size-4" />}
            </Button>
          </motion.div>
        </InferredForm>
      </motion.div>
    </motion.div>
  );
};
