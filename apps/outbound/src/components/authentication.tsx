"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  GearIcon,
  LoaderIcon,
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
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import { client } from "@/lib/auth-client";

export const SignInForm = () => {
  const t = useTranslations("outbound.auth");
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <InferredForm
      config={{
        email: field({
          shape: "text",
          type: "email",
          autoComplete: "username",
          inputMode: "email",
          disabled: pending,
          leadingContent: (
            <EnvelopeIcon
              aria-hidden
              className="size-4 text-foreground-dimmed"
            />
          ),
          validator: z.string().trim().email(t("validation.email")),
          label: t("fields.email"),
        }),
        password: field({
          shape: "text",
          type: "password",
          autoComplete: "current-password",
          disabled: pending,
          maskToggleLabels: {
            show: t("password.show"),
            hide: t("password.hide"),
          },
          validator: z.string().min(1, t("validation.password")),
          label: t("fields.password"),
        }),
      }}
      defaultValues={{ email: "", password: "" }}
      onSubmit={async (values) => {
        if (running.current) return;
        running.current = true;
        setPending(true);
        setError(null);
        const result = await resultify(() => client.signIn.email(values));
        if (!result.success || result.data.error) {
          setError(
            result.success && result.data.error?.status === 403
              ? t("accessNote")
              : t("error"),
          );
          running.current = false;
          setPending(false);
          return;
        }
        router.replace("/");
        router.refresh();
      }}
      className="space-y-5"
      aria-busy={pending}
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/20 bg-error/5 px-3 py-2.5 text-error text-sm leading-relaxed"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && (
          <LoaderIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {pending ? t("pending") : t("action.primary")}
        {!pending && <ArrowRightIcon aria-hidden className="size-4" />}
      </Button>
      <p className="flex items-start gap-2 border-accent-foreground border-t pt-5 text-foreground-dimmed text-sm leading-6">
        <ShieldCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("accessNote")}
      </p>
    </InferredForm>
  );
};

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

export const AccessDenied = () => {
  const t = useTranslations("outbound.auth.denied");
  return (
    <div className="space-y-5" role="alert">
      <h2 className="font-semibold text-foreground-rich text-xl">
        {t("title")}
      </h2>
      <p className="text-foreground-dimmed text-sm leading-6">
        {t("description")}
      </p>
      <div className="flex">
        <SignOutButton />
      </div>
    </div>
  );
};

export const SignInSkeleton = () => (
  <div
    aria-hidden
    className="animate-pulse space-y-5 motion-reduce:animate-none"
  >
    {["email", "password"].map((field) => (
      <div key={field} className="space-y-2">
        <div className="h-4 w-24 rounded-sm bg-accent-foreground/40" />
        <div className="h-10 rounded-sm bg-accent-foreground/30" />
      </div>
    ))}
    <div className="h-10 rounded-lg bg-accent-foreground/30" />
    <div className="h-4 w-4/5 rounded-sm bg-accent-foreground/30" />
  </div>
);
