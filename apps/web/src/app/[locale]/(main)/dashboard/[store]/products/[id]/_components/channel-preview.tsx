"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  FileSearchIcon,
  PhotoIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import localFont from "next/font/local";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import type { ProductChannels as ProductChannelsData } from "@/server/utils/product-channels";
import type { ProductDetailData } from "./product-detail";

const googleFont = localFont({
  src: "../../../../../../../../../public/fonts/providers/google-sans-flex/latin.woff2",
  variable: "--font-google-sans",
  weight: "400 700",
  display: "swap",
  preload: false,
});

const ProviderMark = ({
  provider,
}: {
  provider: "storefront" | "google" | "chatgpt";
}) =>
  provider === "storefront" ? (
    <ShoppingCartIcon className="size-4" />
  ) : (
    <Image
      src={provider === "google" ? "/images/google.svg" : "/images/chatgpt.svg"}
      alt=""
      width={16}
      height={16}
      className="size-4"
    />
  );

const ProductPicture = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const translate = useTranslations("dashboard.productChannels");
  return (
    <Avatar className="h-full w-full rounded-none bg-background">
      <AvatarImage
        src={product.image ?? undefined}
        alt={product.title.trim() || product.id}
        className="h-full w-full object-contain"
      />
      <AvatarFallback className="flex h-full w-full flex-col gap-2 rounded-none">
        <PhotoIcon aria-hidden className="size-10 text-foreground-dimmed" />
        <span className="text-foreground-dimmed text-xs">
          {translate("preview.imageMissing")}
        </span>
      </AvatarFallback>
    </Avatar>
  );
};

const SavedPreview = ({
  product,
  provider,
  domain,
  url,
}: {
  product: ProductDetailData["product"];
  provider: "storefront" | "google" | "chatgpt";
  domain?: string;
  url: string | null;
}) => {
  const translate = useTranslations("dashboard.productChannels");
  const formatter = useFormatter();
  const numericPrice = product.price?.trim()
    ? Number(product.price.trim().replace(",", "."))
    : null;
  const currency = product.currency?.trim().toUpperCase();
  const price =
    numericPrice !== null && Number.isFinite(numericPrice)
      ? formatter.number(
          numericPrice,
          currency && /^[A-Z]{3}$/.test(currency)
            ? { style: "currency", currency }
            : { maximumFractionDigits: 2 },
        )
      : translate("preview.priceMissing");
  const description = product.description
    ?.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const title = product.title.trim() || product.id;
  return (
    <div
      data-product-preview={provider}
      className={cn(
        "flex h-full min-w-0 flex-col bg-background-rich text-foreground-rich",
        provider === "google" && `${googleFont.variable} font-google`,
        provider === "chatgpt" && "font-sans",
      )}
    >
      <div className="flex items-center gap-2 border-accent-foreground border-b px-4 py-3 sm:px-6">
        <ProviderMark provider={provider} />
        <p className="font-medium text-base">
          {translate(`preview.${provider}`)}
        </p>
        {provider === "chatgpt" && (
          <ChevronDownIcon
            aria-hidden
            className="size-4 text-foreground-dimmed"
          />
        )}
        {provider === "google" && (
          <span className="ml-1 rounded-full bg-primary/5 px-3 py-1 font-medium text-primary-text text-xs">
            {translate("preview.googleMode")}
          </span>
        )}
        <span className="ml-auto text-foreground-dimmed text-xs">
          {translate("preview.sample")}
        </span>
      </div>
      {provider === "storefront" ? (
        <>
          <div className="h-64 border-accent-foreground border-b sm:h-72">
            <ProductPicture product={product} />
          </div>
          <div className="px-4 py-5 sm:px-6">
            <h3 className="break-words font-heading font-semibold text-xl">
              {title}
            </h3>
            <p className="mt-2 break-words font-semibold tabular-nums">
              {price}
            </p>
            <p className="mt-4 line-clamp-4 break-words text-foreground-dimmed text-sm leading-6">
              {description || translate("preview.descriptionMissing")}
            </p>
          </div>
        </>
      ) : (
        <>
          {provider === "chatgpt" && (
            <div className="flex justify-end px-4 py-5 sm:px-6">
              <p className="max-w-80 break-words rounded-lg bg-background px-4 py-3 text-sm leading-6">
                {translate("preview.query", { product: title })}
              </p>
            </div>
          )}
          {provider === "google" && (
            <h3 className="break-words px-4 py-5 font-medium text-2xl sm:px-6">
              {title}
            </h3>
          )}
          <div className="h-64 bg-background sm:h-72">
            <ProductPicture product={product} />
          </div>
          <div className="px-4 py-5 sm:px-6">
            {provider === "chatgpt" && (
              <h3 className="break-words font-semibold text-xl leading-7">
                {title}
              </h3>
            )}
            <p
              className={cn(
                "break-words font-semibold text-2xl tabular-nums",
                provider === "chatgpt" && "mt-2",
              )}
            >
              {price}
            </p>
            {domain && (
              <p className="mt-1 break-all text-foreground-dimmed text-sm">
                {domain}
              </p>
            )}
          </div>
          {url && (
            <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-y px-4 py-4 sm:px-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                <ShoppingCartIcon
                  aria-hidden
                  className="size-4 text-foreground-dimmed"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground-dimmed text-xs">
                  {translate("preview.store")}
                </p>
                <p className="break-all font-medium text-sm">{domain}</p>
              </div>
              <Button
                color="neutral"
                variant={provider === "chatgpt" ? "flat" : "soft"}
                className={cn(
                  "rounded-full px-5 font-medium",
                  provider === "chatgpt" &&
                    "bg-emphasis text-background-rich hover:bg-emphasis-rich",
                )}
                render={<a href={url} target="_blank" rel="noreferrer" />}
              >
                {translate("preview.action.primary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          )}
          <div className="px-4 py-5 sm:px-6">
            <h4 className="font-medium text-base">
              {translate("preview.details")}
            </h4>
            <p className="mt-2 break-words text-foreground-dimmed text-sm leading-6">
              {description || translate("preview.descriptionMissing")}
            </p>
          </div>
        </>
      )}
      <p className="mt-auto border-accent-foreground border-t px-4 py-3 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {translate("preview.description")}
      </p>
    </div>
  );
};

export const ProductChannels = ({
  product,
  channels,
}: {
  product: ProductDetailData["product"];
  channels?: ProductChannelsData;
}) => {
  const translate = useTranslations("dashboard.productChannels");
  const locale = useLocale();
  const { store } = useParams<{ store: string }>();
  const source = channels?.source;
  const google = channels?.google;
  const productUrl =
    source?.url && /^https?:\/\//i.test(source.url) ? source.url : null;
  const state =
    google?.state === "not-connected"
      ? "notConnected"
      : (google?.state ?? "unavailable");
  const sourceLogo = source?.platform.startsWith("shopify")
    ? "/images/shopify.svg"
    : source?.platform.startsWith("woocommerce")
      ? "/images/woocommerce.svg"
      : null;
  const platformName = source?.platform.startsWith("shopify")
    ? "Shopify"
    : source?.platform.startsWith("woocommerce")
      ? "WooCommerce"
      : translate(
          source?.platform === "feed"
            ? "source.platform.feed"
            : source?.platform === "csv"
              ? "source.platform.csv"
              : "source.platform.unknown",
        );
  const sourceStatus =
    source?.status === "connected" ||
    source?.status === "syncing" ||
    source?.status === "disconnected" ||
    source?.status === "error"
      ? source.status
      : "unavailable";
  const relative = (date: Date) => formatRelativeTime(new Date(date), locale);
  return (
    <section className="min-w-0">
      <header className="border-accent-foreground border-b px-4 py-5 sm:px-6">
        <h2 className="break-words font-heading font-semibold text-foreground-rich text-xl">
          {translate("title")}
        </h2>
        <p className="mt-1 text-foreground-dimmed text-sm leading-6">
          {translate("description")}
        </p>
      </header>
      <div className="grid min-w-0 lg:grid-cols-2">
        <div className="min-w-0 border-accent-foreground border-b lg:border-r lg:border-b-0">
          <Tabs
            defaultValue="storefront"
            className="flex h-full min-w-0 flex-col"
          >
            <div className="max-w-full overflow-x-auto border-accent-foreground border-b px-4 py-4 sm:px-6">
              <TabsList
                aria-label={translate("preview.title")}
                className="min-w-max"
              >
                <TabsIndicator />
                {(["storefront", "google", "chatgpt"] as const).map(
                  (provider) => (
                    <Tab key={provider} value={provider} className="gap-2">
                      <ProviderMark provider={provider} />
                      {translate(`preview.${provider}`)}
                    </Tab>
                  ),
                )}
              </TabsList>
            </div>
            {(["storefront", "google", "chatgpt"] as const).map((provider) => (
              <TabsPanel
                key={provider}
                value={provider}
                className="min-w-0 flex-1"
              >
                <SavedPreview
                  product={product}
                  provider={provider}
                  domain={source?.domain}
                  url={productUrl}
                />
              </TabsPanel>
            ))}
          </Tabs>
        </div>
        <div className="min-w-0 divide-y divide-accent-foreground">
          <section className="px-4 py-5 sm:px-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground-rich">
              {sourceLogo && (
                <Image
                  src={sourceLogo}
                  width={20}
                  height={20}
                  alt=""
                  className="size-5"
                />
              )}
              {translate("source.title")}
            </h3>
            {source ? (
              <>
                <p className="mt-3 break-words font-medium text-foreground">
                  {source.name || source.domain}
                </p>
                <p className="mt-1 break-all text-foreground-dimmed text-xs">
                  {platformName} · {source.domain}
                </p>
                {source.platform.endsWith("-public") && (
                  <p className="mt-2 text-foreground-dimmed text-xs">
                    {translate("source.publicImport")}
                  </p>
                )}
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt className="text-foreground-dimmed">
                      {translate("source.status")}
                    </dt>
                    <dd
                      className={cn(
                        "inline-flex items-center gap-2 font-medium",
                        sourceStatus === "connected" && "text-success",
                        sourceStatus === "syncing" && "text-primary-text",
                        sourceStatus === "error" && "text-error",
                        (sourceStatus === "disconnected" ||
                          sourceStatus === "unavailable") &&
                          "text-foreground-dimmed",
                      )}
                    >
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-current"
                      />
                      {translate(`source.${sourceStatus}`)}
                    </dd>
                  </div>
                  {(["lastSyncedAt", "productSyncedAt"] as const).map((key) => (
                    <div
                      key={key}
                      className="flex flex-wrap justify-between gap-x-4 gap-y-1"
                    >
                      <dt className="text-foreground-dimmed">
                        {translate(
                          key === "lastSyncedAt"
                            ? "source.lastSync"
                            : "source.productSync",
                        )}
                      </dt>
                      <dd className="text-foreground">
                        {source[key]
                          ? relative(source[key])
                          : translate("source.notSynced")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <>
                <p className="mt-3 break-words font-medium text-foreground">
                  {translate("source.unknown")}
                </p>
                <p className="mt-2 break-words text-foreground-dimmed text-sm leading-6">
                  {translate("source.unknownDescription")}
                </p>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="soft"
                color="neutral"
                render={<Link href="/dashboard/settings?tab=integrations" />}
              >
                {translate("action.primary")}
              </Button>
              {productUrl && (
                <Button
                  variant="ghost"
                  color="neutral"
                  render={
                    <a href={productUrl} target="_blank" rel="noreferrer" />
                  }
                >
                  {translate("action.tertiary")}
                  <ArrowRightIcon className="size-4" />
                </Button>
              )}
            </div>
          </section>
          <section className="min-w-0">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="flex items-center gap-2 font-semibold text-foreground-rich">
                <ProviderMark provider="google" />
                {translate("google.title")}
              </h3>
              <p className="mt-2 text-foreground-dimmed text-xs leading-5">
                {translate("google.description")}
              </p>
              {!google?.offers.length && (
                <p className="mt-4 text-foreground text-sm leading-6">
                  {translate(`google.${state}`)}
                </p>
              )}
            </div>
            {!!google?.offers.length && (
              <ul className="divide-y divide-accent-foreground border-accent-foreground border-y">
                {google.offers.map((offer) => (
                  <li
                    key={`${offer.offerId}-${offer.feedLabel}-${offer.contentLanguage}`}
                    className="px-4 py-4 sm:px-6"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="min-w-0 break-all text-foreground text-sm">
                        {translate("google.offer", { id: offer.offerId })}
                      </p>
                      <span className="font-medium text-foreground-rich text-xs">
                        {translate(`google.${offer.status}`)}
                      </span>
                    </div>
                    <p className="mt-2 text-foreground-dimmed text-xs">
                      {[offer.contentLanguage, offer.feedLabel]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {offer.pushedAt && (
                      <p className="mt-2 text-foreground-dimmed text-xs">
                        {translate("google.lastSent", {
                          time: relative(offer.pushedAt),
                        })}
                      </p>
                    )}
                    {offer.verifiedAt && (
                      <p className="mt-1 text-foreground-dimmed text-xs">
                        {translate("google.lastChecked", {
                          time: relative(offer.verifiedAt),
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 py-5 sm:px-6">
              <Button
                variant="soft"
                color="neutral"
                render={<Link href={`/dashboard/${store}/google-shopping`} />}
              >
                {translate("action.secondary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </section>
          <section className="px-4 py-5 sm:px-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground-rich">
              <ProviderMark provider="chatgpt" />
              {translate("assistant.title")}
            </h3>
            <p className="mt-3 text-foreground-dimmed text-sm leading-6">
              {translate("assistant.description")}
            </p>
            <Button
              className="mt-4"
              variant="soft"
              color="neutral"
              render={<Link href={`/dashboard/${store}/discovery`} />}
            >
              <FileSearchIcon className="size-4" />
              {translate("action.quaternary")}
            </Button>
          </section>
        </div>
      </div>
    </section>
  );
};
