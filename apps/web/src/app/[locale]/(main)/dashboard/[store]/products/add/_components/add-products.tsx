"use client";

import { ArrowRightIcon, DownloadIcon, LoaderIcon } from "@zenncore/icons";
import { useRouter } from "@/i18n/navigation";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { FieldDescription } from "@zenncore/web/components/form";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { z } from "zod";
import { parseCsvProducts } from "@/lib/csv";
import * as Csv from "@/server/app/integration/csv";
import * as Store from "@/server/app/store";
import { SectionKicker } from "../../../../_components/grid";

const PLATFORM_LABEL: Record<Store.Type["platform"], string> = {
  shopify: "Shopify",
  "shopify-public": "Shopify",
  woocommerce: "WooCommerce",
  feed: "your product feed",
  csv: "CSV",
};

export namespace AddProducts {
  export type Props = {
    store: string;
    platform: Store.Type["platform"];
    domain: string;
  };
}

/**
 * A store has exactly one upstream — the platform it was connected with — so
 * this screen offers that source and no other. A `csv` store has no remote to
 * call (`Store.syncProducts` has no branch for it) and grows only by uploading
 * another file; every other platform pulls through its own integration.
 */
export const AddProducts = ({ store, platform, domain }: AddProducts.Props) => {
  const shared = { store, domain };

  return platform === "csv" ? (
    <CsvImport {...shared} />
  ) : (
    <PlatformSync {...shared} platform={platform} />
  );
};

/**
 * Navigates back to the catalog once new products have landed, refreshing so
 * the table and stat cards re-read on the server rather than serving the cached
 * pre-import render.
 */
const useReturnToCatalog = (store: string) => {
  const router = useRouter();

  return () => {
    router.push(`/dashboard/${store}/products`);
    router.refresh();
  };
};

const PlatformSync = ({
  store,
  domain,
  platform,
}: {
  store: string;
  domain: string;
  platform: Exclude<Store.Type["platform"], "csv">;
}) => {
  const toast = useToastManager();
  const returnToCatalog = useReturnToCatalog(store);

  const [handleSync, isSyncing] = useAsyncAction(async () => {
    const synced = await toast
      .promise(
        (async () => {
          const result = await Store.syncProducts({ store });
          if (!result.success) throw result.error;
          return result.data;
        })(),
        {
          loading: { title: "Syncing products…", description: domain },
          success: { title: "Catalog synced", description: domain },
          error: (error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Something went wrong";
            const needsReconnect =
              (platform === "shopify" || platform === "shopify-public") &&
              /reconnect your store|access token/i.test(message);
            // Send the OAuth round-trip back to this exact screen.
            const returnTo = `${window.location.pathname}${window.location.search}`;

            return {
              title: needsReconnect ? "Reconnect required" : "Sync failed",
              description: message,
              ...(needsReconnect && {
                actionLabel: "Reconnect",
                onAction: () => {
                  window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(domain)}&return_to=${encodeURIComponent(returnTo)}`;
                },
              }),
            };
          },
        },
      )
      // The rejection already surfaced through the error toast; swallowing it
      // here keeps the failure on this screen instead of navigating away.
      .catch(() => null);

    if (synced === null) return;
    returnToCatalog();
  });

  return (
    <div className="flex flex-col gap-6 bg-background-rich p-6">
      <div>
        <SectionKicker>01 — {PLATFORM_LABEL[platform]}</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          Pull from {PLATFORM_LABEL[platform]}
        </p>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
          Re-reads {domain} and adds every product that isn't in this store yet.
          Products already here are refreshed in place, so their scans and
          optimizations are kept.
        </p>
      </div>
      <Button
        color="primary"
        className="w-fit"
        disabled={isSyncing}
        onClick={() => handleSync()}
      >
        {isSyncing ? (
          <>
            Syncing…
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            Sync now
            <DownloadIcon className="size-4" />
          </>
        )}
      </Button>
    </div>
  );
};

const config = {
  file: field({
    shape: "file",
    mode: "single",
    accept: [".csv"],
    label: "Product CSV",
    // @ts-expect-error - description is a function
    description: () => (
      <FieldDescription>
        A header row plus one row per product. We read{" "}
        <span className="font-medium text-foreground">title</span> (or{" "}
        <span className="font-medium text-foreground">name</span>),{" "}
        <span className="font-medium text-foreground">description</span>,{" "}
        <span className="font-medium text-foreground">price</span>,{" "}
        <span className="font-medium text-foreground">image</span>,{" "}
        <span className="font-medium text-foreground">url</span>,{" "}
        <span className="font-medium text-foreground">sku</span> and{" "}
        <span className="font-medium text-foreground">id</span>. A row whose id
        matches a product already in this store updates it instead of adding a
        duplicate.
      </FieldDescription>
    ),
    validator: z.file(),
    classList: {
      control: {
        input: "h-auto p-10",
      },
    },
  }),
} satisfies GenericForm;

const CsvImport = ({ store, domain }: { store: string; domain: string }) => {
  const toast = useToastManager();
  const returnToCatalog = useReturnToCatalog(store);

  const [handleImport, isImporting] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const file = data.file as File | null;

      if (!file) {
        toast.add({
          title: "No file selected",
          description: "Upload a CSV file first.",
          type: "error",
        });
        return;
      }

      const products = parseCsvProducts(await file.text());

      if (products.length === 0) {
        toast.add({
          title: "No products found",
          description:
            "Check that your CSV has a header row with a title or name column.",
          type: "error",
        });
        return;
      }

      const result = await Csv.syncProducts({ store, products });

      if (!result.success) {
        toast.add({
          title: "Import failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: `${result.data} product${result.data === 1 ? "" : "s"} imported`,
        description: domain,
        type: "success",
      });

      returnToCatalog();
    },
  );

  return (
    <div className="flex flex-col gap-6 bg-background-rich p-6">
      <div>
        <SectionKicker>01 — CSV</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          Upload a CSV
        </p>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
          This store was built from a file rather than a connected platform, so
          there's nothing upstream to pull from — upload another CSV to add to
          it.
        </p>
      </div>

      <InferredForm
        config={config}
        onSubmit={handleImport}
        className="flex max-w-2xl flex-col gap-4"
      >
        <Button
          type="submit"
          color="primary"
          disabled={isImporting}
          className="w-fit"
        >
          {isImporting ? (
            <>
              Importing…
              <LoaderIcon className="size-4 animate-spin" />
            </>
          ) : (
            <>
              Import CSV
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </InferredForm>
    </div>
  );
};
