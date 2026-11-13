"use client";

import {
  ArrowRightIcon,
  ClockIcon,
  CommerceFilePenIcon,
  SearchIcon,
  UploadIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";

const platforms = [
  {
    id: "shopify",
    group: "direct",
    provider: "shopify",
    href: "/onboarding/connect/shopify",
    mode: "native",
  },
  {
    id: "woocommerce",
    aliases: "Woo WordPress",
    group: "direct",
    provider: "woocommerce",
    href: "/onboarding/connect/woocommerce",
    mode: "native",
  },
  {
    id: "feed",
    group: "direct",
    provider: null,
    href: "/onboarding/connect/feed",
    mode: "feed",
  },
  {
    id: "csv",
    group: "direct",
    provider: null,
    href: "/onboarding/connect/csv",
    mode: "csv",
  },
  {
    id: "adobe",
    aliases: "Magento",
    group: "exports",
    provider: "adobe",
    href: "/onboarding/connect/feed",
    mode: "export",
  },
  {
    id: "shopware",
    group: "exports",
    provider: "shopware",
    href: "/onboarding/connect/feed",
    mode: "export",
  },
  {
    id: "wix",
    group: "exports",
    provider: "wix",
    href: "/onboarding/connect/csv",
    mode: "csv",
  },
  {
    id: "prestashop",
    group: "exports",
    provider: "prestashop",
    href: "/onboarding/connect/feed",
    mode: "export",
  },
  {
    id: "plytix",
    group: "exports",
    provider: "plytix",
    href: "/onboarding/connect/feed",
    mode: "export",
  },
  {
    id: "akeneo",
    group: "exports",
    provider: "akeneo",
    href: "/onboarding/connect/csv",
    mode: "csv",
  },
  {
    id: "salsify",
    group: "exports",
    provider: "salsify",
    href: "/onboarding/connect/feed",
    mode: "export",
  },
  {
    id: "google",
    aliases: "Google Shopping",
    group: "exports",
    provider: "google",
    href: "/onboarding/connect/feed",
    mode: "feed",
  },
  {
    id: "bigcommerce",
    group: "planned",
    provider: "bigcommerce",
    href: null,
    mode: "planned",
  },
  {
    id: "amazon",
    group: "planned",
    provider: "amazon",
    href: null,
    mode: "planned",
  },
] as const;

const groups = ["direct", "exports", "planned"] as const;

export const PlatformGrid = () => {
  const translate = useTranslations("onboardingDirectory");
  const [query, setQuery] = useState("");
  const matches = platforms.filter((platform) => {
    const aliases = "aliases" in platform ? platform.aliases : "";
    const content = `${aliases} ${translate(`providers.${platform.id}.name`)} ${translate(`providers.${platform.id}.description`)} ${translate(`modes.${platform.mode}`)}`;
    return content
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
  });

  const config = {
    search: field({
      shape: "text",
      validator: z.string(),
      label: translate("search.label"),
      placeholder: translate("search.label"),
      autoComplete: "off",
      className:
        "h-12 min-w-0 gap-4 rounded-lg bg-background px-4 [&_input]:placeholder:text-foreground-dimmed",
      classList: { label: "sr-only" },
      leadingContent: (
        <SearchIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-primary-text"
        />
      ),
      trailingContent: (
        <span
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none shrink-0 border-accent-foreground border-l pl-4 text-foreground-dimmed text-xs tabular-nums"
        >
          {translate("search.count", { count: matches.length })}
        </span>
      ),
    }),
  };

  return (
    <div className="min-w-0">
      <div className="border-accent-foreground border-b bg-background-rich px-6 py-4 sm:px-8">
        <InferredForm
          config={config}
          defaultValues={{ search: "" }}
          onChange={({ search }) => setQuery(search ?? "")}
          className="min-w-0"
        />
      </div>
      {groups.map((group) => {
        const entries = matches.filter((platform) => platform.group === group);
        const isLastGroup = group === matches.at(-1)?.group;
        if (entries.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`providers-${group}`}>
            <div className="border-accent-foreground border-b bg-background px-6 py-4 sm:px-8">
              <h2
                id={`providers-${group}`}
                className="font-semibold text-base text-foreground-rich"
              >
                {translate(`groups.${group}.title`)}
              </h2>
              {group !== "direct" && (
                <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-relaxed">
                  {translate(`groups.${group}.description`)}
                </p>
              )}
            </div>
            <ul className="grid min-w-0 grid-cols-1 sm:grid-cols-2">
              {entries.map((platform, index) => {
                const artwork = platform.provider
                  ? providerLogos[platform.provider]
                  : null;
                const Icon =
                  platform.id === "csv" ? UploadIcon : CommerceFilePenIcon;
                const content = (
                  <>
                    <div className="flex h-10 items-center justify-between gap-4">
                      {artwork ? (
                        <Image
                          src={artwork.src}
                          alt=""
                          width={artwork.width}
                          height={artwork.height}
                          className="h-8 w-auto max-w-28 object-contain object-left"
                        />
                      ) : (
                        <Icon
                          aria-hidden="true"
                          className="size-8 text-primary-text"
                        />
                      )}
                      {platform.href ? (
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-foreground-dimmed transition-transform group-hover:translate-x-1"
                        />
                      ) : (
                        <ClockIcon
                          aria-hidden="true"
                          className="size-4 text-foreground-dimmed"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-heading font-medium text-foreground-rich leading-tight",
                          group === "direct" ? "text-xl" : "text-lg",
                        )}
                      >
                        {translate(`providers.${platform.id}.name`)}
                      </h3>
                      <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                        {translate(`providers.${platform.id}.description`)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "mt-auto flex items-center gap-2 font-medium text-sm",
                        group === "planned"
                          ? "text-foreground-dimmed"
                          : "text-primary-text",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full",
                          group === "planned"
                            ? "bg-foreground-dimmed/50"
                            : "bg-primary",
                        )}
                      />
                      {translate(`modes.${platform.mode}`)}
                    </p>
                  </>
                );
                return (
                  <li
                    key={platform.id}
                    className={cn(
                      "min-w-0 border-accent-foreground border-b",
                      index % 2 === 0 && "sm:border-r",
                      isLastGroup &&
                        index === entries.length - 1 &&
                        "border-b-0",
                      isLastGroup &&
                        index >=
                          entries.length - (entries.length % 2 === 0 ? 2 : 1) &&
                        "sm:border-b-0",
                    )}
                  >
                    {platform.href ? (
                      <Link
                        href={platform.href}
                        className={cn(
                          "group relative flex h-full min-w-0 flex-col gap-4 bg-background-rich px-6 py-6 transition-colors hover:bg-primary/5 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] sm:px-8",
                          group === "direct" ? "min-h-48" : "min-h-44",
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex h-full min-h-44 min-w-0 flex-col gap-4 bg-background-rich px-6 py-6 sm:px-8">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {matches.length === 0 && (
        <div className="bg-linear-to-br from-primary/8 to-background-rich px-6 py-10 sm:px-8">
          <h2 className="font-heading font-medium text-foreground-rich text-xl">
            {translate("empty.title")}
          </h2>
          <p className="mt-3 max-w-xl text-foreground-dimmed leading-relaxed">
            {translate("empty.description")}
          </p>
          <div className="mt-6">
            <Button render={<Link href="/onboarding/connect/csv" />}>
              <span>{translate("empty.action.primary")}</span>
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
