"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  ChannelSection,
  ChannelsWorkspace,
} from "../../channels/_components/workspace";
export const GoogleShoppingShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.googleShopping");
  return (
    <ChannelsWorkspace
      subject="googleShopping"
      title={translate("workspaceTitle")}
      description={translate("workspaceDescription")}
      icon={
        <Image
          width={24}
          height={24}
          src="/images/google.svg"
          alt=""
          className="size-6 shrink-0 object-contain"
        />
      }
    >
      {children}
    </ChannelsWorkspace>
  );
};
export const SectionBox = ({
  children,
}: {
  marks?: "top" | "bottom" | "both" | "none";
  children: ReactNode;
}) => <ChannelSection>{children}</ChannelSection>;
export const ManagerSkeleton = () => (
  <div
    aria-hidden
    className="grid animate-pulse bg-background-rich motion-reduce:animate-none lg:grid-cols-2"
  >
    <div className="order-2 flex min-h-72 items-center justify-center border-accent-foreground border-t px-6 py-8 lg:order-1 lg:min-h-120 lg:border-t-0 lg:border-r">
      <div className="size-48 rounded-lg bg-foreground/5" />
    </div>
    <div className="order-1 flex flex-col justify-center gap-4 px-4 py-8 sm:px-6 lg:order-2 lg:px-10">
      <div className="h-5 w-40 rounded-full bg-foreground/5" />
      <div className="h-16 w-full max-w-md rounded-sm bg-foreground/10" />
      <div className="h-16 w-full max-w-lg rounded-sm bg-foreground/5" />
      <div className="mt-2 flex gap-3">
        <div className="h-10 w-40 rounded-lg bg-foreground/10" />
        <div className="h-10 w-36 rounded-lg bg-foreground/5" />
      </div>
    </div>
  </div>
);
