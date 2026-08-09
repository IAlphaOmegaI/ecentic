"use client";

import { ArrowRightIcon, DownloadIcon, LoaderIcon } from "@zenncore/icons";
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
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { parseCsvProducts } from "@/lib/csv";
import * as Csv from "@/server/app/integration/csv";
import * as Store from "@/server/app/store";
import { SectionKicker } from "../../../../_components/grid";

const PLATFORM_LABEL: Record<Exclude<Store.Type["platform"], "csv">, string> = {
  shopify: "Shopify",
  "shopify-public": "Shopify",
  woocommerce: "WooCommerce",
  feed: "feed",
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
  const translate = useTranslations("dashboard.products.add.platformSync");
  const platforms = useTranslations("dashboard.products.add.platforms");
  const returnToCatalog = useReturnToCatalog(store);
  const platformLabel =
    platform === "feed" ? platforms("feed") : PLATFORM_LABEL[platform];

  const [handleSync, isSyncing] = useAsyncAction(async () => {
    const synced = await toast
      .promise(
        (async () => {
          const result = await Store.syncProducts({ store });
          if (!result.success) throw result.error;
          return result.data;
        })(),
        {
          loading: { title: translate("toastLoading"), description: domain },
          success: { title: translate("toastSuccess"), description: domain },
          error: (error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Something went wrong";
            const needsReconnect =
              (platform === "shopify" || platform === "shopify-public") &&
              /reconnect your store|access token/i.test(message);
            const returnTo = `${window.location.pathname}${window.location.search}`;

            return {
              title: needsReconnect
                ? translate("reconnectRequired")
                : translate("syncFailed"),
              description: message,
              ...(needsReconnect && {
                actionLabel: translate("reconnect"),
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
        <SectionKicker>01 — {platformLabel}</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          {translate("pullFrom", { platform: platformLabel })}
        </p>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
          {translate("description", { domain })}
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
            {translate("syncing")}
            <LoaderIcon className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {translate("syncNow")}
            <DownloadIcon className="size-4" />
          </>
        )}
      </Button>
    </div>
  );
};

const CsvImport = ({ store, domain }: { store: string; domain: string }) => {
  const toast = useToastManager();
  const translate = useTranslations("dashboard.products.add.csv");
  const returnToCatalog = useReturnToCatalog(store);

  const config = {
    file: field({
      shape: "file",
      mode: "single",
      accept: [".csv"],
      label: translate("fieldLabel"),
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
          <span className="font-medium text-foreground">id</span>. A row whose
          id matches a product already in this store updates it instead of
          adding a duplicate.
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

  const [handleImport, isImporting] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const file = data.file as File | null;

      if (!file) {
        toast.add({
          title: translate("noFileTitle"),
          description: translate("noFileDescription"),
          type: "error",
        });
        return;
      }

      const products = parseCsvProducts(await file.text());

      if (products.length === 0) {
        toast.add({
          title: translate("noProductsTitle"),
          description: translate("noProductsDescription"),
          type: "error",
        });
        return;
      }

      const result = await Csv.syncProducts({ store, products });

      if (!result.success) {
        toast.add({
          title: translate("importFailed"),
          description: result.error.message,
          type: "error",
        });
        return;
      }

      toast.add({
        title: translate("importSuccess", { count: result.data }),
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
          {translate("title")}
        </p>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
          {translate("description")}
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
              {translate("importing")}
              <LoaderIcon className="size-4 animate-spin" />
            </>
          ) : (
            <>
              {translate("importCsv")}
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </InferredForm>
    </div>
  );
};
