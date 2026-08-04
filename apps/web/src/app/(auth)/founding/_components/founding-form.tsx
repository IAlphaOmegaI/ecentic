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
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import * as PromoClaim from "@/server/app/promo-claim";

const config = {
  email: field({
    shape: "text",
    validator: z.string().email("Enter a valid email"),
    label: "Email",
    placeholder: "jane@acmestore.com",
  }),
} satisfies GenericForm;

type Props = {
  promo: string;
  claimedPrice: string;
  months: number;
  /** Whether the seat was still open when the page rendered. */
  open: boolean;
};

/** What the seat is doing right now, from this visitor's point of view. */
type State =
  | { status: "open" }
  | { status: "claimed"; email: string }
  | { status: "taken" };

const Claimed = ({
  email,
  claimedPrice,
  months,
}: {
  email: string;
  claimedPrice: string;
  months: number;
}) => (
  <div className="flex flex-col gap-4">
    <div className="border border-accent-foreground p-4">
      <p className="font-medium text-foreground">The seat is yours.</p>
      <p className="mt-1 font-light text-foreground-dimmed">
        Create your account with{" "}
        <span className="text-foreground">{email}</span> and Compete bills{" "}
        {claimedPrice}/mo for your first {months} months. The discount is tied
        to that address — sign up with a different one and it won't apply.
      </p>
    </div>
    <Button
      color="primary"
      render={<Link href="/sign-up" />}
      className="w-full"
    >
      Create your account <ArrowRightIcon className="size-4" />
    </Button>
  </div>
);

const Taken = () => (
  <div className="flex flex-col gap-4">
    <div className="border border-accent-foreground p-4">
      <p className="font-medium text-foreground">This one's gone.</p>
      <p className="mt-1 font-light text-foreground-dimmed">
        Someone claimed it first. Every plan still starts free — run a scan, and
        pay-as-you-go costs nothing until an AI agent actually drives an order.
      </p>
    </div>
    <Button
      variant="soft"
      color="emphasis"
      render={<Link href="/sign-up" />}
      className="w-full"
    >
      Start free instead <ArrowRightIcon className="size-4" />
    </Button>
  </div>
);

export const FoundingForm = ({ promo, claimedPrice, months, open }: Props) => {
  const toast = useToastManager();
  const [state, setState] = useState<State>(
    open ? { status: "open" } : { status: "taken" },
  );

  const [handleSubmit, isPending] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const result = await PromoClaim.claim({ promo, email: data.email });

      if (!result.success) {
        toast.add({
          title: "Could not claim",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      // The seat may have been taken between this page rendering and the
      // submit landing, so the outcome — not the shell — decides what shows.
      setState(
        result.data.status === "claimed"
          ? { status: "claimed", email: result.data.email }
          : { status: "taken" },
      );
    },
  );

  if (state.status === "claimed")
    return (
      <Claimed
        email={state.email}
        claimedPrice={claimedPrice}
        months={months}
      />
    );

  if (state.status === "taken") return <Taken />;

  return (
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
        {isPending ? "Claiming..." : "Claim the seat"}
        {isPending ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <ArrowRightIcon className="size-4" />
        )}
      </Button>
    </InferredForm>
  );
};
