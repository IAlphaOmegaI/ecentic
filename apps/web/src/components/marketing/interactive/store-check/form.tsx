"use client";

import { ArrowRightIcon, CommerceGlobePointerIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import * as Entry from "@/server/app/entry";
import type { InteractiveInput } from "../text-input";
import { useInteractive } from "../use-interactive";
import { validStoreAddress } from "./address";

const AddressInput = ({
  value,
  onValueChange,
  label,
  name,
  onBlur,
  ref,
  disabled,
}: InteractiveInput.Props) => (
  <TextField
    value={value ?? ""}
    onValueChange={onValueChange}
    disabled={disabled}
    className="h-12 rounded-md border-accent-foreground bg-background text-foreground-rich"
  >
    <CommerceGlobePointerIcon
      aria-hidden
      className="ml-4 size-6 shrink-0 text-primary"
    />
    <TextFieldInput
      ref={ref}
      name={name}
      onBlur={onBlur}
      inputMode="url"
      aria-label={label}
      placeholder={label}
      autoComplete="url"
      autoCapitalize="off"
      spellCheck={false}
      maxLength={250}
      className="px-3 text-base placeholder:text-foreground-dimmed"
    />
  </TextField>
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
      classList: {
        field: "min-w-0",
        label: "sr-only",
        description: "empty:hidden",
      },
    }),
  };
  return (
    <div data-interactive="store-check" className="mt-8 w-full max-w-2xl">
      {ready ? (
        <InferredForm
          config={config}
          defaultValues={{ url: "" }}
          className="grid items-start gap-3 space-y-0 sm:grid-cols-[minmax(0,1fr)_auto] [&>button]:min-h-12"
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
        className="mt-3 max-w-[65ch] text-current text-sm opacity-80"
      >
        {failure || (address && !valid ? copy.errors.invalid : copy.hint)}
      </p>
    </div>
  );
};
export namespace StoreCheckForm {
  export type Props = {
    copy: AppConfig["Messages"]["interactiveStore"];
    locale: string;
  };
}
