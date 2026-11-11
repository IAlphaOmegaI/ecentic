"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import * as Entry from "@/server/app/entry";
import { Calculator } from "../calculator";
import { InteractiveInput } from "../text-input";
import { useInteractive } from "../use-interactive";
import { validStoreAddress } from "./address";

const AddressInput = (props: InteractiveInput.Props) => (
  <InteractiveInput {...props} inputMode="url" />
);

export const StoreCheckForm = ({ copy, locale }: StoreCheckForm.Props) => {
  const { ready } = useInteractive();
  const [address, setAddress] = useState("");
  const [failure, setFailure] = useState("");
  const valid = validStoreAddress(address);
  const [submit, pending] = useAsyncAction(async (url: string) => {
    if (!validStoreAddress(url)) return;
    setFailure("");
    const call = await resultify(() => Entry.begin({ url, locale }));
    if (!call.success || !call.data?.success) {
      setFailure(copy.errors.failed);
      return;
    }
    const outcome = call.data.data;
    switch (outcome.kind) {
      case "invalid":
        setFailure(copy.errors.invalid);
        break;
      case "limited":
        setFailure(copy.errors.limited);
        break;
      case "unreachable":
        setFailure(copy.errors.unreachable.replace("{host}", outcome.host));
        break;
    }
  });
  const validator: z.ZodString = z
    .string()
    .refine(validStoreAddress, copy.errors.invalid);
  const config = {
    url: field({
      shape: "custom",
      Component: AddressInput,
      label: copy.label,
      validator,
      classList: { field: "min-w-0", description: "empty:hidden" },
    }),
  };
  return (
    <Calculator.Root
      layout="inline"
      data-interactive="store-check"
      className="max-w-2xl border p-6 max-sm:p-4"
    >
      {ready ? (
        <InferredForm
          config={config}
          defaultValues={{ url: "" }}
          className="grid items-end gap-4 space-y-0 sm:grid-cols-[1fr_auto]"
          onChange={(values) => {
            setAddress(values.url ?? "");
            setFailure("");
          }}
          onSubmit={(values) => {
            if (!pending) void submit(values.url);
          }}
        >
          <Button type="submit" disabled={!valid || pending}>
            {pending ? copy.pending : copy.action.primary}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </InferredForm>
      ) : (
        <Button render={<Link href="/sign-up" />}>
          {copy.action.primary}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      )}
      <p
        role="status"
        aria-live="polite"
        className="mt-4 text-foreground text-sm"
      >
        {failure || (address && !valid ? copy.errors.invalid : copy.hint)}
      </p>
    </Calculator.Root>
  );
};
export namespace StoreCheckForm {
  export type Props = {
    copy: AppConfig["Messages"]["interactiveStore"];
    locale: string;
  };
}
