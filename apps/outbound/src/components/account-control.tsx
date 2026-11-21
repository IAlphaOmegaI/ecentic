"use client";

import {
  ChevronDownIcon,
  GearIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { client } from "@/lib/auth-client";

const useSignOut = () => {
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = async () => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setFailed(false);
    const result = await resultify(() => client.signOut());
    if (!result.success || result.data.error) {
      setFailed(true);
      running.current = false;
      setPending(false);
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  };
  return { pending, failed, run };
};

export const SignOutButton = ({ dark = false }: { dark?: boolean }) => {
  const t = useTranslations("outbound.account");
  const { pending, failed, run } = useSignOut();
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        variant="soft"
        color="neutral"
        disabled={pending}
        className={cn(
          dark &&
            "bg-background-rich/10 text-background-rich hover:bg-background-rich/15 hover:text-background-rich",
        )}
        onClick={run}
      >
        {pending ? t("pending") : t("action.primary")}
      </Button>
      {failed && (
        <p role="alert" className="max-w-56 text-error text-xs">
          {t("error")}
        </p>
      )}
    </div>
  );
};

export const AccountControl = () => {
  const t = useTranslations("outbound.account");
  const navigation = useTranslations("outbound.nav");
  const session = client.useSession();
  const signOut = useSignOut();
  if (!session.data) return null;
  const user = session.data.user;
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("label")} · ${user.name}`}
        className="group flex min-w-0 items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-background-rich/8 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 data-popup-open:bg-background-rich/8"
      >
        <Avatar className="size-8 shrink-0 rounded-sm bg-background-rich/15 text-background-rich">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate font-semibold text-background-rich text-sm lg:block">
          {user.name}
        </span>
        <ChevronDownIcon
          aria-hidden
          className="size-3.5 text-background-rich/60 transition-transform group-data-popup-open:rotate-180 motion-reduce:transition-none"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 bg-background-rich p-1 font-normal"
      >
        <div className="px-2 py-2.5">
          <p className="truncate font-semibold text-foreground-rich text-sm">
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-foreground-dimmed text-xs">
            {user.email}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-foreground-dimmed text-xs">
            <ShieldCheckIcon aria-hidden className="size-3.5" />
            {t("staff")}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/playbook" />}
          className="gap-2.5 px-2 py-2"
        >
          <GearIcon aria-hidden className="size-4" />
          {navigation("playbook")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut.run}
          disabled={signOut.pending}
          closeOnClick={false}
          className="gap-2.5 px-2 py-2"
        >
          <LogOutIcon aria-hidden className="size-4" />
          {signOut.pending ? t("pending") : t("action.primary")}
        </DropdownMenuItem>
        {signOut.failed && (
          <p role="alert" className="px-2 py-2 text-error text-xs">
            {t("error")}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
