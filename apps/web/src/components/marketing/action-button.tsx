"use client";

import { Button } from "@zenncore/web/components/button";
import { createAuthClient } from "better-auth/react";
import { useMessages } from "next-intl";
import { type ComponentProps, Suspense, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { IntentLink } from "./intent-link";

// One shared session store keeps the public page static and deduplicates reads
// across the navbar, hero and closing action.
const authentication = createAuthClient();
const subscribe = () => () => {};

const ActionButton = ({
  href,
  label,
  labelClassName,
  children,
  dashboardForMembers: _,
  compactOnMobile: __,
  mobileLabel,
  ...props
}: MarketingActionButton.Props & { mobileLabel?: string }) => (
  <Button {...props} render={<IntentLink href={href} />}>
    <span className={labelClassName}>
      {mobileLabel ? (
        <>
          <span className="sm:hidden">{mobileLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
    {children}
  </Button>
);

const MemberAction = (props: MarketingActionButton.Props) => {
  const pathname = usePathname();
  const { data: session } = authentication.useSession();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const messages = useMessages();
  const copy = messages.enterpriseChrome;
  const dashboard = hydrated && pathname === "/" && !!session?.user;

  return (
    <ActionButton
      {...props}
      href={dashboard ? "/dashboard" : props.href}
      label={dashboard ? copy.authenticated.action.primary : props.label}
      mobileLabel={
        dashboard && props.compactOnMobile
          ? copy.authenticated.compact.action.primary
          : undefined
      }
    />
  );
};

export const MarketingActionButton = (props: MarketingActionButton.Props) =>
  props.dashboardForMembers ? (
    <Suspense fallback={<ActionButton {...props} />}>
      <MemberAction {...props} />
    </Suspense>
  ) : (
    <ActionButton {...props} />
  );

export namespace MarketingActionButton {
  export type Props = Omit<ComponentProps<typeof Button>, "render"> & {
    href: string;
    label: string;
    labelClassName?: string;
    dashboardForMembers?: boolean;
    compactOnMobile?: boolean;
  };
}
