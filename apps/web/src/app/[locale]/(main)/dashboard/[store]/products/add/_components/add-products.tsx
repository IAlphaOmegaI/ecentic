"use client";

import {
  ArrowRightIcon,
  DownloadIcon,
  FileIcon,
  LoaderIcon,
  UploadIcon,
} from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link, useRouter } from "@/i18n/navigation";
import { csvPrice, parseCsvProducts } from "@/lib/csv";
import {
  callOnboardingAction,
  onboardingErrorKey,
} from "@/lib/onboarding-errors";
import * as Csv from "@/server/app/integration/csv";
import * as Store from "@/server/app/store";

const PLATFORM_LABEL: Record<Exclude<Store.Type["platform"], "csv">, string> = {
  shopify: "Shopify",
  "shopify-public": "Shopify",
  woocommerce: "WooCommerce",
  "woocommerce-public": "WooCommerce",
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
  const errors = useTranslations("onboarding.experience.errors");
  const workflow = useTranslations("dashboard.catalogWorkflow");
  const returnToCatalog = useReturnToCatalog(store);
  const platformLabel =
    platform === "feed" ? platforms("feed") : PLATFORM_LABEL[platform];

  const [handleSync, isSyncing] = useAsyncAction(async () => {
    const synced = await toast
      .promise(
        (async () => {
          const result = await callOnboardingAction(() =>
            Store.syncProducts({ store }),
          );
          if (!result.success) throw result.error;
          return result.data;
        })(),
        {
          loading: { title: translate("toastLoading"), description: domain },
          success: { title: translate("toastSuccess"), description: domain },
          error: (error: unknown) => {
            const message =
              error instanceof Error ? error.message : translate("syncFailed");
            const needsReconnect =
              (platform === "shopify" || platform === "shopify-public") &&
              /reconnect your store|access token/i.test(message);
            const returnTo = `${window.location.pathname}${window.location.search}`;

            return {
              title: needsReconnect
                ? translate("reconnectRequired")
                : translate("syncFailed"),
              description: errors(onboardingErrorKey(error)),
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
    <div className="grid min-w-0 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col justify-center gap-6 border-accent-foreground border-b px-4 py-8 sm:px-6 lg:border-r lg:border-b-0">
        <div>
          <p className="font-medium text-primary text-sm">{platformLabel}</p>
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
              <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
            </>
          ) : (
            <>
              {translate("syncNow")}
              <DownloadIcon className="size-4" />
            </>
          )}
        </Button>
      </div>
      <aside className="flex min-w-0 flex-col items-start justify-center px-4 py-6 sm:px-6">
        <div aria-hidden className="mx-auto w-72 max-w-full">
          <CommerceFigure
            kind={
              platform.startsWith("shopify")
                ? "shopifyBag"
                : platform.startsWith("woocommerce")
                  ? "wooMark"
                  : "documentStack"
            }
            className="bg-transparent"
          />
        </div>
        <h2 className="font-semibold text-foreground-rich text-lg">
          {workflow("sourceTitle")}
        </h2>
        <p className="mt-2 break-all text-primary text-sm">{domain}</p>
        <p className="mt-2 max-w-xl text-foreground-dimmed text-sm leading-6">
          {workflow("sourceHint")}
        </p>
      </aside>
    </div>
  );
};

const CsvImport = ({ store, domain }: { store: string; domain: string }) => {
  const toast = useToastManager();
  const translate = useTranslations("dashboard.products.add.csv");
  const workflow = useTranslations("dashboard.catalogWorkflow");
  const upload = useTranslations("onboardingRecovery.upload");
  const errors = useTranslations("onboarding.experience.errors");
  const fields = useTranslations("dashboard.products.catalog.fields");
  const returnToCatalog = useReturnToCatalog(store);
  const [review, setReview] = useState<{
    name: string;
    products: Csv.Type[];
  } | null>(null);
  const [partial, setPartial] = useState<{
    imported: number;
    total: number;
  } | null>(null);
  const config = {
    file: field({
      shape: "file",
      mode: "single",
      accept: [".csv"],
      label: translate("fieldLabel"),
      validator: z.file({ error: translate("noFileDescription") }),
      inputLabel: upload("choose"),
      emptyContent: (
        <span className="flex w-full flex-col items-start gap-5">
          <UploadIcon aria-hidden className="size-8 text-primary" />
          <span className="font-semibold text-foreground-rich text-lg">
            {upload("choose")}
          </span>
          <span className="text-foreground-dimmed text-sm">
            {upload("drop")}
          </span>
        </span>
      ),
      selectedContent: (file: File) => (
        <span className="flex w-full min-w-0 items-center gap-4">
          <FileIcon aria-hidden className="size-8 shrink-0 text-primary" />
          <span className="min-w-0 text-left">
            <span className="block break-all font-medium text-foreground-rich">
              {file.name}
            </span>
            <span className="mt-1 block text-foreground-dimmed text-sm">
              {upload("replace")}
            </span>
          </span>
        </span>
      ),
      classList: {
        control: {
          root: "min-w-0 border-0 p-0",
          input:
            "h-auto min-h-48 w-full min-w-0 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-left data-dragging:bg-primary/10",
        },
      },
    }),
  } satisfies GenericForm;

  const [prepare, preparing] = useAsyncAction(
    async (data: FormEntries<typeof config>) => {
      const file = data.file as File | null;
      if (!file) return;
      const contents = await resultify(() => file.text());
      if (!contents.success) {
        toast.add({
          title: translate("importFailed"),
          description: workflow("readFailed"),
          type: "error",
        });
        return;
      }
      const products = parseCsvProducts(contents.data);
      if (!products.length) {
        toast.add({
          title: translate("noProductsTitle"),
          description: translate("noProductsDescription"),
          type: "error",
        });
        return;
      }
      setPartial(null);
      setReview({ name: file.name, products });
    },
  );

  const [importFile, importing] = useAsyncAction(async () => {
    if (!review) return;
    const result = await callOnboardingAction(() =>
      Csv.syncProducts({ store, products: review.products }),
    );
    if (!result.success) {
      toast.add({
        title: translate("importFailed"),
        description: errors(onboardingErrorKey(result.error)),
        type: "error",
      });
      return;
    }
    if (result.data < review.products.length) {
      setPartial({ imported: result.data, total: review.products.length });
      setReview(null);
      return;
    }
    toast.add({
      title: translate("importSuccess", { count: result.data }),
      description: domain,
      type: "success",
    });
    returnToCatalog();
  });

  if (partial)
    return (
      <div
        role="status"
        className="flex min-h-72 flex-col items-start justify-center gap-4 px-4 py-8 sm:px-6"
      >
        <FileIcon aria-hidden className="size-10 text-warning" />
        <h2 className="font-semibold text-foreground-rich text-xl">
          {translate("importSuccess", { count: partial.imported })}
        </h2>
        <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
          {workflow("partial", partial)}
        </p>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href={`/dashboard/${store}/products`} />}
        >
          {workflow("action.quaternary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    );

  if (review)
    return (
      <section className="min-w-0" aria-busy={importing}>
        <header className="border-accent-foreground border-b px-4 py-6 sm:px-6">
          <p className="break-all text-foreground-dimmed text-sm">
            {review.name}
          </p>
          <h2 className="mt-2 font-semibold text-foreground-rich text-xl">
            {workflow("reviewTitle")}
          </h2>
          <p className="mt-2 text-foreground-dimmed text-sm leading-6">
            {workflow("reviewHint", { count: review.products.length })}
          </p>
        </header>
        <div className="overflow-x-auto">
          <Table className="min-w-128">
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 sm:px-6">
                  {fields("product")}
                </TableHead>
                <TableHead>{fields("sku")}</TableHead>
                <TableHead>{fields("price")}</TableHead>
                <TableHead className="pr-4 sm:pr-6">
                  {fields("currency")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {review.products.slice(0, 5).map((product, index) => {
                const value = csvPrice(product.price, product.currency);
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: This immutable file preview preserves CSV row order, including duplicate IDs.
                  <TableRow key={`${product.id ?? "row"}-${index}`}>
                    <TableCell className="max-w-64 truncate px-4 py-3 font-medium sm:px-6">
                      {product.title}
                    </TableCell>
                    <TableCell>{product.sku || "—"}</TableCell>
                    <TableCell>{value.price || "—"}</TableCell>
                    <TableCell className="pr-4 sm:pr-6">
                      {value.currency || workflow("unknownCurrency")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
          <p className="text-foreground-dimmed text-xs">
            {workflow("previewHint", {
              count: Math.min(5, review.products.length),
            })}
          </p>
          <p className="mt-3 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {workflow("idsHint")}
          </p>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
          <Button
            variant="soft"
            color="neutral"
            disabled={importing}
            onClick={() => setReview(null)}
          >
            {workflow("action.secondary")}
          </Button>
          <Button disabled={importing} onClick={() => void importFile()}>
            {importing ? (
              <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            {importing ? translate("importing") : workflow("action.tertiary")}
          </Button>
        </footer>
      </section>
    );

  return (
    <div className="grid min-w-0 lg:grid-cols-2">
      <div className="border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
        <h2 className="font-semibold text-foreground-rich text-xl">
          {translate("title")}
        </h2>
        <p className="mt-2 max-w-xl text-foreground-dimmed text-sm leading-6">
          {translate("description")}
        </p>
        <InferredForm
          config={config}
          onSubmit={prepare}
          className="mt-6 flex min-w-0 flex-col gap-4"
        >
          <Button type="submit" disabled={preparing} className="w-fit">
            {preparing ? (
              <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
            {workflow("action.primary")}
          </Button>
        </InferredForm>
      </div>
      <aside className="flex min-w-0 flex-col justify-center px-4 py-6 sm:px-6">
        <div aria-hidden className="mx-auto w-64 max-w-full">
          <CommerceFigure kind="documentStack" className="bg-transparent" />
        </div>
        <p className="text-foreground-dimmed text-sm leading-6">
          {workflow("fieldsHint")}
        </p>
        <p className="mt-3 text-foreground-dimmed text-sm leading-6">
          {workflow("idsHint")}
        </p>
      </aside>
    </div>
  );
};
