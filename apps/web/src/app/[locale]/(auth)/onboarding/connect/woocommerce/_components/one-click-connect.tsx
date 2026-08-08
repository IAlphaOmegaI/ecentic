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

const PLUGIN_URL = "https://wordpress.org/plugins/ecentic-for-woocommerce/";

/**
 * One-click connect: the admin enters just the store URL. `/start` probes the
 * store — with the écentic plugin installed it goes straight into the OAuth
 * approval inside wp-admin. Without it, the store has nothing to authorize
 * against, so we come back with `status=install_required` and walk the admin
 * through installing it. The plugin never phones home on its own, so finishing
 * always takes a deliberate click, here or on the plugin's settings screen.
 */
export const OneClickConnect = () => {
  const searchParameters = useSearchParams();
  const error = searchParameters.get("error");
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? null) : null;
  const installRequired = searchParameters.get("status") === "install_required";
  const storeUrl = searchParameters.get("store_url") ?? "";

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-light text-error text-sm">
          {errorMessage}
        </p>
      )}

      {installRequired && (
        <div className="flex flex-col gap-3 rounded-md border border-accent-foreground bg-background-dimmed px-4 py-3">
          <p className="font-medium text-foreground">
            We couldn&apos;t find the écentic plugin on{" "}
            {storeUrl || "that store"}.
          </p>
          <ol className="flex list-inside list-decimal flex-col gap-2 font-light text-foreground-dimmed text-sm">
            <li>
              Install{" "}
              <a
                href={PLUGIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                écentic for WooCommerce
              </a>{" "}
              from your WordPress admin and activate it.
            </li>
            <li>
              Either come back here and press{" "}
              <span className="font-medium text-foreground">Connect</span>{" "}
              again, or open{" "}
              <span className="font-medium text-foreground">
                WooCommerce &rarr; UCP (AI Agents)
              </span>{" "}
              in wp-admin and click{" "}
              <span className="font-medium text-foreground">
                Connect to ecentic.ai
              </span>
              .
            </li>
          </ol>
          {storeUrl && (
            <Button
              color="accent"
              className="w-fit"
              render={
                <a
                  href={`${storeUrl}/wp-admin/plugin-install.php?s=ecentic&tab=search&type=term`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open my plugin screen
              <ArrowRightIcon className="size-4" />
            </Button>
          )}
        </div>
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
          defaultValue={storeUrl}
          placeholder="https://yourstore.com"
          className="flex-1 rounded-md border border-accent-foreground bg-background px-3 py-2 text-foreground outline-none placeholder:text-foreground-dimmed focus:border-primary"
        />
        <Button type="submit" color="primary">
          {installRequired ? "Try again" : "Connect via plugin"}
          <ArrowRightIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
};
