"use client";

import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";

export namespace Onboarding {
  export type Props = {
    identifier?: string;
    headline: ReactNode;
    points: readonly string[];
    image?: string;
    footer?: string;
    imageAlt?: string;
    classList?: { image?: string };
  };
}

export const Onboarding = ({
  identifier = "onboarding",
  headline,
  points,
  image = "/images/ascii/tonal/home-bag.svg",
  footer,
  classList = {},
}: Onboarding.Props) => {
  const translate = useTranslations("onboarding.experience");
  return (
    <aside className="relative hidden h-full max-w-xl shrink-0 overflow-hidden bg-linear-to-br from-primary via-primary to-primary-text [clip-path:polygon(0_0,calc(100%_-_20px)_0,100%_20px,100%_calc(100%_-_20px),calc(100%_-_20px)_100%,0_100%)] lg:flex lg:w-[32%] xl:w-[36%]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src={image}
          alt=""
          fill
          sizes="36vw"
          className={cn(
            "object-contain object-center opacity-15 brightness-0 invert",
            classList.image,
          )}
        />
        <div className="absolute inset-x-8 inset-y-0 border-background-rich/15 border-x" />
      </div>
      <div className="relative flex w-full flex-col px-8 py-8 xl:px-12">
        <Link
          href="/"
          aria-label="ecentic"
          className="w-fit rounded-md focus-visible:outline-2 focus-visible:outline-background-rich focus-visible:outline-offset-8"
        >
          <Image
            src="/images/wordmark.svg"
            alt="ecentic"
            width={140}
            height={40}
            className="h-auto w-36 brightness-0 invert"
          />
        </Link>
        <Motion.Stagger
          key={identifier}
          stagger={0.06}
          className="my-auto py-8"
        >
          <Motion.Item>
            <h2 className="max-w-md font-heading font-medium text-3xl text-background-rich leading-[1.08] tracking-tight xl:text-5xl">
              {headline}
            </h2>
          </Motion.Item>
          <div className="mt-8 space-y-5">
            {points.map((point) => (
              <Motion.Item
                key={point}
                className="flex items-start gap-4 text-background-rich/90"
              >
                <CheckIcon
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0"
                />
                <p className="text-base leading-relaxed">{point}</p>
              </Motion.Item>
            ))}
          </div>
        </Motion.Stagger>
        <div
          className="relative mb-7 flex items-center justify-between gap-5 px-2"
          aria-hidden="true"
        >
          <div className="absolute inset-x-6 top-1/2 h-px bg-background-rich/35" />
          {[
            { name: "chatgpt", offset: "-rotate-6" },
            { name: "claude", offset: "-translate-y-3" },
            { name: "gemini", offset: "rotate-6" },
          ].map(({ name, offset }) => (
            <div
              key={name}
              className={cn(
                "relative grid size-14 place-items-center rounded-lg border border-background-rich/60 bg-background-rich shadow-lg shadow-primary-text/15",
                offset,
              )}
            >
              <Image
                src={`/images/${name}.svg`}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </div>
          ))}
        </div>
        <p className="border-background-rich/25 border-t pt-6 text-background-rich/80 text-sm leading-relaxed">
          {footer ?? translate("footer")}
        </p>
      </div>
    </aside>
  );
};
