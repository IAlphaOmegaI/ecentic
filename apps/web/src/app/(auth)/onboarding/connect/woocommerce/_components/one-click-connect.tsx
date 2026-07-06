"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  missing_store_url: "Enter your store's URL to start the connection.",
  bad_store_url:
    "That doesn't look like a reachable public store URL. Check it and try again.",
  invalid_state:
    "The connection attempt expired or was already used. Start it again.",
  token_exchange:
    "The store approved the connection but the key exchange failed. Try reconnecting from the plugin's settings page.",
};

/**
 * One-click connect: the admin enters just the store URL. `/start` probes the
 * store — with the Ecentic UCP plugin installed it goes straight into the
 * OAuth approval inside wp-admin; without it, the admin lands on their
 * plugin-install screen and activation auto-resumes the flow. No API keys to
 * copy either way.
 */
export const OneClickConnect = () => {
  const searchParameters = useSearchParams();
  const error = searchParameters.get("error");
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-light text-error text-sm">
          {errorMessage}
        </p>
      )}
      <form
        action="/api/integrations/woo/start"
        method="GET"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          name="store_url"
          type="url"
          required
          placeholder="https://yourstore.com"
          className="flex-1 rounded-md border border-accent-foreground bg-background px-3 py-2 text-foreground outline-none placeholder:text-foreground-dimmed focus:border-primary"
        />
        <Button type="submit" color="primary">
          Connect via plugin
          <ArrowRightIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
};
