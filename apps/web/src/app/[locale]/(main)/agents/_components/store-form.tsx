"use client";

import { ArrowRightIcon, GlobeIcon, LoaderIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";

/** A started run carries its id; a refusal carries the sentence to show. */
type Outcome = { id: string } | { message?: string };

const fallback = "Something went wrong on our side. Try again.";

/** Sits on the primary banner, so its text stays solid white (see `PageBanner`). */
export const StoreForm = () => {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // Same rule as the landing hero: focus only with a keyboard under the hand,
  // since on touch screens it would raise the keyboard over the headline.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    form.current
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }, []);

  const [handleSubmit, isPending] = useAsyncAction(async () => {
    setProblem(null);

    const response = await resultify(() =>
      fetch("/api/agents/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      }),
    );
    if (!response.success) {
      setProblem(fallback);
      return;
    }

    // Read regardless of status: a refusal is an outcome, not a transport error.
    const body = await resultify(
      () => response.data.json() as Promise<Outcome>,
    );
    if (!body.success) {
      setProblem(fallback);
      return;
    }

    if ("id" in body.data) {
      router.push(`/agents/runs/${body.data.id}`);
      return;
    }

    setProblem(body.data.message ?? fallback);
  });

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!url.trim() || isPending) return;
        void handleSubmit();
      }}
      className="flex w-full max-w-2xl flex-col gap-2"
    >
      <div className="flex w-full flex-col gap-1.5 rounded-lg border border-accent-foreground bg-background p-1.5 shadow-lg transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15 sm:flex-row sm:items-center">
        <TextField
          value={url}
          onValueChange={(value) => {
            setUrl(value);
            setProblem(null);
          }}
          disabled={isPending}
          className={cn(
            "h-12 gap-2.5 border-transparent bg-transparent px-2.5 focus-within:border-transparent focus-within:ring-0 sm:h-11",
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
            placeholder="yourstore.com"
            aria-label="Your store's address"
            aria-invalid={problem !== null}
            aria-describedby="store-form-message"
            className="text-base text-foreground-rich placeholder:text-foreground-dimmed/60"
          />
        </TextField>
        <Button
          type="submit"
          color="primary"
          disabled={isPending || !url.trim()}
          className="h-12 w-full shrink-0 px-5 text-base sm:h-11 sm:w-auto"
        >
          {isPending ? "Starting" : "Get it ready"}
          {isPending ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <ArrowRightIcon className="size-4" />
          )}
        </Button>
      </div>
      <p
        id="store-form-message"
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-5 text-sm text-white sm:px-2",
          problem && "font-medium",
        )}
      >
        {problem ??
          "No sign-up. We read up to 40 products from your public pages."}
      </p>
    </form>
  );
};
