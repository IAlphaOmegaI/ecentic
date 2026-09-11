"use client";

import { ArrowRightIcon, GlobeIcon, LoaderIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import * as Entry from "@/server/app/entry";

type Problem =
  | { kind: "invalid" }
  | { kind: "limited" }
  | { kind: "unreachable"; host: string }
  | { kind: "failed" };

/**
 * The landing hero's store-URL entry. Submitting resolves the store's platform
 * server-side and — on success — navigates from inside the action (to sign-up,
 * or straight to onboarding with a session), so this only ever renders the
 * outcomes worth a sentence under the field.
 */
export const StoreEntry = ({ className }: StoreEntry.Props) => {
  const translate = useTranslations("home.hero.entry");
  const locale = useLocale();
  const form = useRef<HTMLFormElement>(null);
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);

  // Focus the field for visitors who already have a keyboard under their
  // hands. On touch screens it would pop the keyboard over the headline the
  // moment the page opens, so they tap in themselves. `preventScroll` keeps the
  // smooth-scroll container from jumping to the field.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    form.current
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }, []);

  const [handleSubmit, isPending] = useAsyncAction(async () => {
    setProblem(null);

    // A resolved store redirects from the action and never returns here. A
    // rejected call (network, a deploy mid-session) must land as a sentence
    // under the field, not as the error boundary replacing the landing page.
    const call = await resultify(() => Entry.begin({ url, locale }));
    if (!call.success) {
      setProblem({ kind: "failed" });
      return;
    }

    const result = call.data;
    if (!result) return;
    if (!result.success) {
      setProblem({ kind: "failed" });
      return;
    }

    setProblem(result.data);
  });

  const message = (() => {
    switch (problem?.kind) {
      case "invalid":
        return translate("errors.invalid");
      case "limited":
        return translate("errors.limited");
      case "unreachable":
        return translate("errors.unreachable", { host: problem.host });
      case "failed":
        return translate("errors.failed");
      default:
        return null;
    }
  })();

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!url.trim() || isPending) return;
        void handleSubmit();
      }}
      className={cn("flex w-full max-w-xl flex-col gap-2", className)}
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-lg sm:border sm:border-accent-foreground sm:bg-background sm:p-1.5 sm:shadow-lg sm:shadow-primary/10 sm:transition-[border-color,box-shadow] sm:duration-200 sm:focus-within:border-primary sm:focus-within:ring-[3px] sm:focus-within:ring-primary/15">
        <TextField
          value={url}
          onValueChange={(value) => {
            setUrl(value);
            setProblem(null);
          }}
          disabled={isPending}
          className={cn(
            "h-12 gap-2.5 bg-background px-3.5 shadow-lg shadow-primary/10 sm:h-11 sm:border-transparent sm:bg-transparent sm:px-2.5 sm:shadow-none sm:focus-within:border-transparent sm:focus-within:ring-0",
            problem && "border-error",
          )}
        >
          <GlobeIcon className="size-5 shrink-0 text-foreground-dimmed" />
          <TextFieldInput
            name="url"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={translate("placeholder")}
            aria-label={translate("label")}
            aria-invalid={problem !== null}
            aria-describedby="store-entry-message"
            className="text-base text-foreground-rich placeholder:text-foreground-dimmed/60"
          />
        </TextField>
        <Button
          type="submit"
          color="primary"
          disabled={isPending || !url.trim()}
          className="h-12 w-full shrink-0 px-5 text-base sm:h-11 sm:w-auto"
        >
          {isPending
            ? translate("states.pending")
            : translate("action.primary")}
          {isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-4" />
          )}
        </Button>
      </div>
      <p
        id="store-entry-message"
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-5 text-left font-body text-sm sm:px-2",
          message ? "text-error" : "text-foreground-dimmed",
        )}
      >
        {message ?? translate("hint")}
      </p>
    </form>
  );
};

export namespace StoreEntry {
  export type Props = {
    className?: string;
  };
}
