"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleMinusIcon,
  ClockIcon,
  CommercePlug_3SparkleIcon,
  DownloadIcon,
  EnvelopeIcon,
  FaceSearchIcon,
  FileSearchIcon,
  LinkedinIcon,
  LoaderIcon,
  RobotIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import {
  field,
  InferredForm,
  InferredFormField,
} from "@zenncore/web/components/inferred-form";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import type { Inbox, Prospect } from "@/lib/outbound";
import { MAX_DAILY_EMAILS } from "@/lib/outbound-capacity";
import * as Outbound from "@/server/app/outbound";
import * as Connections from "@/server/app/outbound/integrations";
import type { Person } from "@/server/utils/outbound/providers";
import {
  type ClaudeConfiguration,
  ClaudeConnection,
} from "../integrations/_components/claude-connection";
import { Multiline, Notice, Submit, useMutation } from "./common";
import { ProspectEditor } from "./prospects";

type ConnectionStatus = Extract<
  Awaited<ReturnType<typeof Connections.getStatus>>,
  { success: true }
>["data"];
type ClayStatus = Extract<
  Awaited<ReturnType<typeof Connections.getClayStatus>>,
  { success: true }
>["data"];
type CredentialProvider =
  | "apollo"
  | "clay"
  | "google"
  | "scrapellm"
  | "firecrawl";

export const Integrations = ({
  status,
  inboxes,
  claude,
}: {
  status: ConnectionStatus | null;
  inboxes: Inbox[];
  claude: ClaudeConfiguration | null;
}) => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  return (
    <>
      <div className="flex items-start gap-3 border-accent-foreground border-b bg-primary/5 px-4 py-4 sm:px-6">
        <ShieldCheckIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <p className="max-w-4xl text-foreground-dimmed text-sm leading-6">
          {t("integrations.credentialsNote")}
        </p>
      </div>
      <section className="grid gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
            <EnvelopeIcon aria-hidden className="size-5 text-primary" />
            {t("integrations.gmail.title")}
          </h2>
          <p className="mt-3 text-foreground-dimmed text-sm leading-6">
            {t("integrations.gmail.description")}
          </p>
        </div>
        <div className="min-w-0 space-y-6">
          <DirectMailboxForm />
          <SyncReplies connected={inboxes.some((inbox) => inbox.connected)} />
          {inboxes.map((inbox) => (
            <InboxEditor
              key={`${inbox.id}-${inbox.enabled}-${inbox.lastSyncedAt}`}
              inbox={inbox}
            />
          ))}
          <GoogleOAuthConnection configuration={status?.google} />
        </div>
      </section>
      <section className="grid gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
            <ClockIcon aria-hidden className="size-5 text-primary" />
            {t("integrations.worker.title")}
          </h2>
          <p className="mt-3 text-foreground-dimmed text-sm leading-6">
            {t("integrations.worker.description")}
          </p>
        </div>
        <div className="space-y-4">
          <Button
            variant="soft"
            color="neutral"
            disabled={mutation.pending}
            onClick={() =>
              mutation.run(() => Connections.runWorker({ dryRun: true }))
            }
          >
            <ClockIcon aria-hidden className="size-4 shrink-0" />
            {t("integrations.worker.action.primary")}
          </Button>
          <Notice value={mutation.notice} />
        </div>
      </section>
      <section className="grid gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
            <FaceSearchIcon aria-hidden className="size-5 text-primary" />
            {t("integrations.apollo.title")}
          </h2>
          <p className="mt-3 text-foreground-dimmed text-sm leading-6">
            {t("integrations.apollo.description")}
          </p>
          <div className="mt-4">
            <ConnectionBadge configured={status?.apollo.configured ?? false} />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <ProviderCredentialsForm
            provider="apollo"
            configured={status?.apollo.configured ?? false}
          />
          <PeopleSearch configured={status?.apollo.configured ?? false} />
        </div>
      </section>
      {(["clay", "azure"] as const).map((provider) => (
        <section
          key={provider}
          className="grid gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
        >
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
              <ProviderSymbol provider={provider} />
              {t(`integrations.${provider}.title`)}
            </h2>
            <p className="mt-3 text-foreground-dimmed text-sm leading-6">
              {t(`integrations.${provider}.description`)}
            </p>
          </div>
          <div className="min-w-0 space-y-5">
            <ConnectionBadge
              configured={status?.[provider].configured ?? false}
              label={
                provider === "clay" && status?.clay.configured
                  ? t("integrations.clay.keyVerified")
                  : undefined
              }
            />
            {provider === "clay" &&
              status?.clay.configured &&
              !status.clay.routineConfigured && (
                <p className="text-foreground-dimmed text-sm leading-6">
                  {t("integrations.clay.routinePending")}
                </p>
              )}
            {provider === "clay" && (
              <ProviderCredentialsForm
                provider="clay"
                configured={status?.clay.configured ?? false}
                configuration={status?.clay}
              />
            )}
          </div>
        </section>
      ))}
      <section
        id="shopping-research"
        className="grid scroll-mt-6 gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
      >
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
            <FileSearchIcon aria-hidden className="size-5 text-primary" />
            {t("integrations.liveResearch.title")}
          </h2>
          <p className="mt-3 text-foreground-dimmed text-sm leading-6">
            {t("integrations.liveResearch.description")}
          </p>
          <div className="mt-4">
            <ConnectionBadge
              configured={status?.research.configured ?? false}
              label={t(
                status?.research.configured
                  ? "integrations.liveResearch.configured"
                  : "integrations.liveResearch.missing",
              )}
            />
          </div>
        </div>
        <div className="min-w-0 divide-y divide-accent-foreground">
          {(["scrapellm", "firecrawl"] as const).map((provider) => {
            const connection = status?.research[provider];
            return (
              <div
                key={provider}
                className="space-y-4 py-6 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground-rich">
                    {provider === "scrapellm" ? "ScrapeLLM" : "Firecrawl"}
                  </h3>
                  <ConnectionBadge
                    configured={connection?.configured ?? false}
                    label={
                      connection?.configured
                        ? t(
                            connection.credentialStatus === "verified"
                              ? "integrations.liveResearch.verified"
                              : connection.credentialStatus === "environment"
                                ? "integrations.liveResearch.environment"
                                : "integrations.liveResearch.saved",
                          )
                        : undefined
                    }
                  />
                </div>
                <ProviderCredentialsForm
                  provider={provider}
                  configured={connection?.configured ?? false}
                />
                {provider === "scrapellm" && (
                  <p className="max-w-xl text-foreground-dimmed text-xs leading-5">
                    {t("integrations.liveResearch.savedHelp")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <ClaudeConnection configuration={claude} />
      <LinkedInConnection connection={status?.linkedin ?? null} />
      {status?.jobs
        .filter(
          (job) =>
            ["apollo", "clay"].includes(job.provider) &&
            ["pending", "uncertain", "failed"].includes(job.status),
        )
        .map((job) => (
          <div
            key={job.id}
            className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6"
          >
            <div>
              <p className="font-medium text-sm">
                {job.provider === "clay"
                  ? t("integrations.clay.title")
                  : t("integrations.apollo.title")}
              </p>
              <p className="mt-2 text-foreground-dimmed text-sm">
                {job.error ||
                  t(
                    job.status === "pending"
                      ? "integrations.pending"
                      : "integrations.failed",
                  )}
              </p>
            </div>
            {job.status === "pending" && (
              <Button
                variant="soft"
                color="neutral"
                disabled={mutation.pending}
                onClick={() =>
                  job.provider === "clay" && job.requestId
                    ? mutation.run(() =>
                        Connections.pollClay({ runId: job.requestId ?? "" }),
                      )
                    : mutation.run(() =>
                        Connections.pollVerification({
                          prospectId: job.prospectId ?? "",
                        }),
                      )
                }
              >
                <ClockIcon aria-hidden className="size-4 shrink-0" />
                {t("integrations.verification.action.secondary")}
              </Button>
            )}
          </div>
        ))}
    </>
  );
};

const SyncReplies = ({ connected }: { connected: boolean }) => {
  const t = useTranslations("outbound.integrations.gmail");
  const router = useRouter();
  const active = useRef<{ stop: boolean; processed: number } | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "stopping">("idle");
  const [processed, setProcessed] = useState(0);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const pending = phase !== "idle";
  useEffect(
    () => () => {
      // The current server page may finish; never launch another after navigation.
      if (active.current) active.current.stop = true;
      active.current = null;
    },
    [],
  );

  const start = async () => {
    if (active.current || !connected) return;
    const run = { stop: false, processed: 0 };
    active.current = run;
    setPhase("running");
    setProcessed(0);
    setNotice(null);
    while (active.current === run) {
      // Each request retains the server's bounded page and durable checkpoint.
      const response = await resultify(() => Connections.syncInbox());
      if (active.current !== run) return;
      if (!response.success || !response.data.success) {
        setNotice({ error: true, text: t("sync.error") });
        break;
      }
      run.processed += response.data.data.reduce(
        (count, inbox) => count + inbox.processed,
        0,
      );
      setProcessed(run.processed);
      if (response.data.data.some((inbox) => inbox.error)) {
        setNotice({ error: true, text: t("sync.error") });
        break;
      }
      if (response.data.data.every((inbox) => inbox.complete)) {
        setNotice({
          error: false,
          text: t("sync.complete", { count: run.processed }),
        });
        break;
      }
      if (run.stop) {
        setNotice({
          error: false,
          text: t("sync.stopped", { count: run.processed }),
        });
        break;
      }
    }
    if (active.current !== run) return;
    active.current = null;
    setPhase("idle");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="soft"
          color="neutral"
          disabled={pending || !connected}
          onClick={start}
        >
          {pending ? (
            <LoaderIcon
              aria-hidden
              className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <DownloadIcon aria-hidden className="size-4 shrink-0" />
          )}
          {t(pending ? "sync.running" : "action.secondary")}
        </Button>
        {pending && (
          <Button
            variant="soft"
            color="neutral"
            disabled={phase === "stopping"}
            onClick={() => {
              if (!active.current) return;
              active.current.stop = true;
              setPhase("stopping");
            }}
          >
            {t(phase === "stopping" ? "sync.stopping" : "sync.action.primary")}
          </Button>
        )}
      </div>
      {pending && (
        <p
          role="status"
          aria-live="polite"
          className="text-foreground-dimmed text-sm"
        >
          {t("sync.progress", { count: processed })}
        </p>
      )}
      {!pending && !notice && (
        <p className="text-foreground-dimmed text-sm leading-6">
          {t("sync.help")}
        </p>
      )}
      <Notice value={notice} />
    </div>
  );
};

const DirectMailboxForm = () => {
  const t = useTranslations("outbound.integrations.mailbox");
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-foreground-dimmed text-sm leading-6">{t("help")}</p>
      <InferredForm
        key={version}
        config={{
          email: field({
            shape: "text",
            type: "email",
            autoComplete: "off",
            disabled: pending,
            validator: z
              .string()
              .trim()
              .email(t("invalidEmail"))
              .max(254, t("invalidEmail")),
            label: t("fields.email"),
            description: t("senderHelp"),
          }),
          appPassword: field({
            shape: "text",
            type: "password",
            autoComplete: "off",
            disabled: pending,
            validator: z
              .string()
              .min(1, t("passwordRequired"))
              .max(128, t("invalidPassword"))
              .regex(/^(?:\s*[A-Za-z0-9]){16}\s*$/, t("invalidPassword")),
            label: t("fields.appPassword"),
            description: t("passwordHelp"),
            maskToggleLabels: { show: t("show"), hide: t("hide") },
          }),
        }}
        defaultValues={{ email: "", appPassword: "" }}
        onSubmit={async (values, form) => {
          if (running.current) return;
          running.current = true;
          setPending(true);
          setNotice(null);
          const result = await resultify(() =>
            Connections.connectDirectMailbox(values),
          );
          if (!result.success || !result.data.success) {
            const failure =
              result.success && !result.data.success ? result.data.error : null;
            const message = (() => {
              switch (failure?.message) {
                case "direct-mailbox-invalid":
                  return t("errors.invalid");
                case "direct-mailbox-not-registered":
                  return t("errors.notRegistered");
                case "direct-mailbox-authentication":
                  return t("errors.authentication");
                case "direct-mailbox-unavailable":
                  return t("errors.unavailable");
                case "direct-mailbox-encryption":
                  return t("errors.encryption");
                default:
                  return t("errors.save");
              }
            })();
            setNotice({ error: true, text: message });
            running.current = false;
            setPending(false);
            return;
          }
          form.reset({ email: "", appPassword: "" });
          setVersion((current) => current + 1);
          setNotice({ error: false, text: t("connected") });
          running.current = false;
          setPending(false);
          router.refresh();
        }}
        className="space-y-4"
      >
        <Button type="submit" variant="soft" color="neutral" disabled={pending}>
          {pending && (
            <LoaderIcon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {t(pending ? "checking" : "action.primary")}
        </Button>
        <Notice value={notice} />
      </InferredForm>
    </div>
  );
};

const GoogleOAuthConnection = ({
  configuration,
}: {
  configuration?: ConnectionStatus["google"];
}) => {
  const t = useTranslations("outbound.integrations");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const configured = configuration?.configured ?? false;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full min-w-0 border-accent-foreground border-t pt-6"
    >
      <CollapsibleTrigger
        className="w-fit"
        render={<Button variant="soft" color="neutral" />}
      >
        {t(open ? "mailbox.action.tertiary" : "mailbox.action.secondary")}
      </CollapsibleTrigger>
      <CollapsiblePanel className="w-full justify-start bg-transparent motion-reduce:transition-none">
        <div className="space-y-6 pt-6">
          <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
            {t("mailbox.oauthHelp")}
          </p>
          <ConnectionBadge configured={configured} />
          <ProviderCredentialsForm
            provider="google"
            configured={configured}
            configuration={configuration}
          />
          <Button
            variant="soft"
            color="neutral"
            disabled={!configured}
            render={
              configured ? (
                <a
                  href={`/api/integrations/outbound/google?locale=${locale}`}
                  aria-label={t("gmail.action.primary")}
                >
                  {t("gmail.action.primary")}
                </a>
              ) : undefined
            }
          >
            <EnvelopeIcon aria-hidden className="size-4 shrink-0" />
            {t("gmail.action.primary")}
          </Button>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
};

const LinkedInConnection = ({
  connection,
}: {
  connection: ConnectionStatus["linkedin"] | null;
}) => {
  const t = useTranslations("outbound.integrations.linkedin");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const result = searchParams.get("linkedin");
  const configured = connection?.configured ?? false;
  const accounts = connection?.accounts ?? [];
  const connectionHref = `/api/integrations/outbound/linkedin?locale=${encodeURIComponent(locale)}`;
  return (
    <section className="grid gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <LinkedinIcon aria-hidden className="size-5 text-primary" />
          {t("title")}
        </h2>
        <p className="mt-3 text-foreground-dimmed text-sm leading-6">
          {t("description")}
        </p>
      </div>
      <div className="min-w-0 space-y-5">
        <ConnectionBadge configured={configured} />
        {result === "declined" && (
          <Notice value={{ error: true, text: t("declined") }} />
        )}
        {!configured && (
          <div className="space-y-4">
            <p className="max-w-2xl text-foreground-dimmed text-sm leading-6">
              {t("setupHelp")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="soft"
                color="neutral"
                render={
                  <a
                    href="https://dashboardv2.unipile.com"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                {t("action.quaternary")}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
              <Button
                variant="soft"
                color="neutral"
                render={
                  <a
                    href="https://www.unipile.com/pricing-api/"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                {t("pricing")}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        )}
        <UnipileKeyForm configured={configured} />
        <div>
          <Button
            disabled={!configured}
            render={
              configured ? (
                <a href={connectionHref} aria-label={t("action.primary")}>
                  {t("action.primary")}
                </a>
              ) : undefined
            }
          >
            <LinkedinIcon aria-hidden className="size-4" />
            {t("action.primary")}
          </Button>
        </div>
        {configured && accounts.length === 0 && (
          <p className="text-foreground-dimmed text-sm">{t("empty")}</p>
        )}
        {accounts.map((account) => (
          <LinkedInAccount
            key={account.id}
            account={account}
            configured={configured}
            connectionHref={connectionHref}
          />
        ))}
      </div>
    </section>
  );
};

const ProviderCredentialsForm = ({
  provider,
  configured,
  configuration,
}: {
  provider: CredentialProvider;
  configured: boolean;
  configuration?: {
    clientId?: string;
    routineId?: string;
    redirectUri?: string;
  };
}) => {
  const t = useTranslations("outbound.integrations.credentials");
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const [savedConfiguration, setSavedConfiguration] = useState<{
    clientId: string;
    routineId: string;
  } | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const config = {
    apiKey: field({
      shape: "text",
      type: "password",
      autoComplete: "off",
      disabled: pending,
      validator: z
        .string()
        .trim()
        .min(1, t("required"))
        .max(4096, t("invalid")),
      label: t(`secret.${provider}`),
      description: t("help"),
      maskToggleLabels: { show: t("show"), hide: t("hide") },
    }),
    clientId: field({
      shape: "text",
      autoComplete: "off",
      disabled: pending,
      validator: z
        .string()
        .trim()
        .min(provider === "google" ? 1 : 0, t("required"))
        .max(500, t("invalid")),
      label: t("fields.clientId"),
    }),
    routineId: field({
      shape: "text",
      autoComplete: "off",
      disabled: pending,
      validator: z.string().trim().max(64, t("invalid")),
      label: t("fields.routineId"),
      description: t("routineHelp"),
    }),
  };
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-foreground-dimmed text-sm leading-6">
        {t(`setup.${provider}`)}
      </p>
      {provider !== "clay" && <ProviderLinks provider={provider} />}
      {provider === "google" && (
        <div className="space-y-2">
          <p className="text-sm">{t("fields.redirectUri")}</p>
          <TextField
            value={configuration?.redirectUri ?? ""}
            className="border border-accent-foreground"
          >
            <TextFieldInput readOnly aria-label={t("fields.redirectUri")} />
          </TextField>
          <p className="text-foreground-dimmed text-sm leading-6">
            {t("redirectHelp")}
          </p>
        </div>
      )}
      <InferredForm
        key={version}
        config={config}
        renderFields={false}
        defaultValues={{
          apiKey: "",
          clientId:
            savedConfiguration?.clientId ?? configuration?.clientId ?? "",
          routineId:
            savedConfiguration?.routineId ?? configuration?.routineId ?? "",
        }}
        onSubmit={async (values, form) => {
          if (running.current) return;
          running.current = true;
          setPending(true);
          setNotice(null);
          const result = await resultify(() =>
            Connections.saveProviderCredentials({
              provider,
              apiKey: values.apiKey,
              ...(provider === "google"
                ? { configuration: { clientId: values.clientId } }
                : {}),
              ...(provider === "clay"
                ? { configuration: { routineId: values.routineId } }
                : {}),
            }),
          );
          if (!result.success || !result.data.success) {
            const failure =
              result.success && !result.data.success ? result.data.error : null;
            const message = (() => {
              switch (failure?.message) {
                case "provider-key-invalid":
                  return t("errors.invalid");
                case "provider-key-unavailable":
                  return t("errors.unavailable");
                case "provider-key-encryption":
                  return t("errors.encryption");
                default:
                  return t("errors.save");
              }
            })();
            setNotice({ error: true, text: message });
            running.current = false;
            setPending(false);
            return;
          }
          form.reset({ ...values, apiKey: "" });
          setSavedConfiguration({
            clientId: values.clientId,
            routineId: values.routineId,
          });
          setVersion((current) => current + 1);
          setNotice({
            error: false,
            text:
              provider === "clay"
                ? t(values.routineId.trim() ? "claySaved" : "claySavedPending")
                : provider === "scrapellm"
                  ? t("savedUnchecked")
                  : t("saved"),
          });
          running.current = false;
          setPending(false);
          router.refresh();
        }}
        className="space-y-4"
      >
        {provider === "google" && (
          <InferredFormField name="clientId" {...config.clientId} />
        )}
        <InferredFormField name="apiKey" {...config.apiKey} />
        {provider === "clay" && (
          <Accordion className="border-accent-foreground border-y">
            <AccordionItem value="enrichment-routine" className="border-b-0">
              <AccordionTrigger
                className="items-center py-3 text-sm"
                classList={{
                  trigger: {
                    icon: "mr-0 size-4 transition-transform duration-200 group-data-panel-open:rotate-180 motion-reduce:transition-none",
                  },
                }}
              >
                {t("routine.action.primary")}
              </AccordionTrigger>
              <AccordionPanel
                keepMounted
                className="duration-200 motion-reduce:transition-none"
              >
                <div className="space-y-3 pb-4">
                  <InferredFormField name="routineId" {...config.routineId} />
                  <Button
                    variant="soft"
                    color="neutral"
                    render={
                      <a
                        href="https://developers.clay.com/routines/api"
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    {t("links.clayApiDocs")}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
        <Button type="submit" variant="soft" color="neutral" disabled={pending}>
          {pending && (
            <LoaderIcon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {t(
            pending
              ? provider !== "google" && provider !== "scrapellm"
                ? "testing"
                : "saving"
              : configured
                ? "action.secondary"
                : "action.primary",
          )}
        </Button>
        <Notice value={notice} />
      </InferredForm>
    </div>
  );
};

const ProviderLinks = ({
  provider,
}: {
  provider: Exclude<CredentialProvider, "clay">;
}) => {
  const t = useTranslations("outbound.integrations.credentials.links");
  const links = (() => {
    switch (provider) {
      case "scrapellm":
        return [
          {
            label: t("scrapellmAccount"),
            href: "https://scrapellm.com/dashboard",
          },
        ];
      case "firecrawl":
        return [
          {
            label: t("firecrawlAccount"),
            href: "https://www.firecrawl.dev/app",
          },
        ];
      case "apollo":
        return [
          { label: t("apolloPlan"), href: "https://www.apollo.io/pricing" },
          {
            label: t("apolloKeys"),
            href: "https://developer.apollo.io/#/keys",
          },
        ];
      case "google":
        return [
          {
            label: t("googleConsole"),
            href: "https://console.cloud.google.com/apis/credentials",
          },
          {
            label: t("googleApi"),
            href: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
          },
        ];
    }
  })();
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => (
        <Button
          key={link.href}
          variant="soft"
          color="neutral"
          render={<a href={link.href} target="_blank" rel="noreferrer" />}
        >
          {link.label}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      ))}
    </div>
  );
};

const UnipileKeyForm = ({ configured }: { configured: boolean }) => {
  const t = useTranslations("outbound.integrations.linkedin.key");
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  return (
    <InferredForm
      key={version}
      config={{
        apiKey: field({
          shape: "text",
          type: "password",
          autoComplete: "off",
          disabled: pending,
          validator: z
            .string()
            .trim()
            .min(1, t("required"))
            .max(4096, t("invalid")),
          label: t("label"),
          placeholder: t("placeholder"),
          description: t("help"),
          maskToggleLabels: { show: t("show"), hide: t("hide") },
        }),
      }}
      defaultValues={{ apiKey: "" }}
      onSubmit={async ({ apiKey }, form) => {
        if (running.current) return;
        running.current = true;
        setPending(true);
        setNotice(null);
        const result = await resultify(() =>
          Connections.saveUnipileKey({ apiKey }),
        );
        if (!result.success || !result.data.success) {
          const failure =
            result.success && !result.data.success ? result.data.error : null;
          const message = (() => {
            switch (failure?.message) {
              case "unipile-key-invalid":
                return t("errors.invalid");
              case "unipile-key-unavailable":
                return t("errors.unavailable");
              case "unipile-key-encryption":
                return t("errors.encryption");
              default:
                return t("errors.save");
            }
          })();
          setNotice({ error: true, text: message });
          running.current = false;
          setPending(false);
          return;
        }
        form.reset({ apiKey: "" });
        setVersion((current) => current + 1);
        setNotice({ error: false, text: t("saved") });
        running.current = false;
        setPending(false);
        router.refresh();
      }}
      className="max-w-xl space-y-4"
    >
      <Button type="submit" variant="soft" color="neutral" disabled={pending}>
        {pending && (
          <LoaderIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {t(
          pending
            ? "testing"
            : configured
              ? "action.secondary"
              : "action.primary",
        )}
      </Button>
      <Notice value={notice} />
    </InferredForm>
  );
};

const LinkedInAccount = ({
  account,
  configured,
  connectionHref,
}: {
  account: ConnectionStatus["linkedin"]["accounts"][number];
  configured: boolean;
  connectionHref: string;
}) => {
  const t = useTranslations("outbound");
  const format = useFormatter();
  const mutation = useMutation();
  return (
    <div className="space-y-4 border-accent-foreground border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 break-words font-medium text-foreground-rich text-sm">
          {account.name}
        </p>
        <span
          className={cn(
            "rounded-sm px-2 py-1 text-xs",
            account.status === "running" && !account.isLocked
              ? "bg-success/10 text-success"
              : "bg-background-dimmed text-foreground-dimmed",
          )}
        >
          {t(
            account.isLocked
              ? "integrations.linkedin.locked"
              : `integrations.linkedin.status.${account.status}`,
          )}
        </span>
      </div>
      <p className="text-foreground-dimmed text-xs">
        {t("common.lastUpdated", {
          date: `${format.dateTime(new Date(account.lastCheckedAt), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`,
        })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="soft"
          color="neutral"
          disabled={!configured || mutation.pending}
          onClick={() =>
            mutation.run(() =>
              Connections.refreshLinkedInAccount({ accountId: account.id }),
            )
          }
        >
          <ClockIcon aria-hidden className="size-4" />
          {t("integrations.linkedin.action.secondary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={!configured || mutation.pending}
          render={
            configured && !mutation.pending ? (
              <a
                href={`${connectionHref}&account=${encodeURIComponent(account.id)}`}
                aria-label={t("integrations.linkedin.action.tertiary")}
              >
                {t("integrations.linkedin.action.tertiary")}
              </a>
            ) : undefined
          }
        >
          {t("integrations.linkedin.action.tertiary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      </div>
      <Notice value={mutation.notice} />
    </div>
  );
};

const InboxEditor = ({ inbox }: { inbox: Inbox }) => {
  const format = useFormatter();
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const notice =
    mutation.notice?.error && mutation.notice.text === "direct-mailbox-inactive"
      ? {
          ...mutation.notice,
          text: t("integrations.mailbox.errors.inactive"),
        }
      : mutation.notice;
  const config = {
    fromName: field({
      shape: "text",
      validator: z.string().trim().min(1).max(100),
      label: t("integrations.mailbox.profile.fromName"),
    }),
    signature: field({
      shape: "text",
      validator: z.string().trim().min(1).max(100),
      label: t("integrations.mailbox.profile.signature"),
    }),
    founderLine: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().min(1).max(500),
      label: t("integrations.mailbox.profile.founderLine"),
    }),
    productCheckIntro: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().min(1).max(500),
      label: t("integrations.mailbox.profile.productCheckIntro"),
      description: t("integrations.mailbox.profile.help"),
    }),
    voiceNotes: field({
      shape: "custom",
      Component: Multiline,
      validator: z.string().trim().max(6000),
      label: t("integrations.mailbox.profile.voiceNotes"),
    }),
    enabled: field({
      shape: "checkbox",
      validator: z.boolean(),
      label: t("common.enabled"),
    }),
    dailyCap: field({
      shape: "number",
      validator: z.number().int().min(1).max(MAX_DAILY_EMAILS),
      label: t("integrations.mailbox.maximumDailyCap"),
      description: t("integrations.mailbox.dailyCapHelp", {
        maximum: String(MAX_DAILY_EMAILS),
      }),
    }),
  };
  return (
    <div className="border-accent-foreground border-t pt-5">
      <p className="flex items-center gap-2 break-all font-medium text-sm">
        <EnvelopeIcon
          aria-hidden
          className="size-4 shrink-0 text-foreground-dimmed"
        />
        {inbox.email}
      </p>
      <p className="mt-2 text-foreground-dimmed text-sm">
        {inbox.error ||
          (inbox.lastSyncedAt
            ? t("common.lastUpdated", {
                date: `${format.dateTime(new Date(inbox.lastSyncedAt), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`,
              })
            : t("integrations.pending"))}
      </p>
      {inbox.activationRequestedAt && (
        <p className="mt-2 text-primary text-sm">
          {t("integrations.mailbox.profile.activationPending")}
        </p>
      )}
      <InferredForm
        config={config}
        renderFields={false}
        key={`${inbox.id}:${inbox.enabled}:${inbox.activationRequestedAt ?? "none"}`}
        defaultValues={{
          enabled: inbox.enabled || Boolean(inbox.activationRequestedAt),
          dailyCap: inbox.dailyCap,
          fromName:
            inbox.profile?.fromName ??
            (inbox.fromName === inbox.email ? "" : inbox.fromName),
          signature: inbox.profile?.signature ?? inbox.signer,
          founderLine: inbox.profile?.founderLine ?? "",
          productCheckIntro: inbox.profile?.productCheckIntro ?? "",
          voiceNotes: inbox.profile?.voiceNotes ?? "",
        }}
        onSubmit={({ enabled, dailyCap, ...profile }) =>
          mutation.run(() =>
            Connections.configureInbox({
              inboxId: inbox.id,
              enabled,
              dailyCap,
              profile,
            }),
          )
        }
        className="mt-5 max-w-lg space-y-4"
      >
        <Accordion defaultValue={inbox.profile ? [] : ["sender-profile"]}>
          <AccordionItem value="sender-profile" className="border-b-0">
            <AccordionTrigger>
              {t("integrations.mailbox.profile.title")}
            </AccordionTrigger>
            <AccordionPanel className="space-y-4 pb-4">
              {(
                [
                  "fromName",
                  "signature",
                  "founderLine",
                  "productCheckIntro",
                  "voiceNotes",
                ] as const
              ).map((name) => (
                <InferredFormField key={name} name={name} {...config[name]} />
              ))}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <InferredFormField
          name="enabled"
          {...config.enabled}
          className="w-full"
        />
        <InferredFormField
          name="dailyCap"
          {...config.dailyCap}
          className="w-full"
        />
        <div className="flex flex-wrap gap-4">
          <Submit pending={mutation.pending}>
            {t("integrations.gmail.action.quaternary")}
          </Submit>
          {(inbox.enabled || inbox.activationRequestedAt) && (
            <Button
              type="button"
              variant="soft"
              disabled={mutation.pending}
              onClick={() =>
                mutation.run(() =>
                  Connections.configureInbox({
                    inboxId: inbox.id,
                    enabled: false,
                    dailyCap: inbox.dailyCap,
                  }),
                )
              }
            >
              {t(
                inbox.activationRequestedAt
                  ? "integrations.mailbox.profile.cancelActivation"
                  : "integrations.mailbox.profile.pause",
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="soft"
            color="error"
            disabled={mutation.pending}
            onClick={() =>
              mutation.run(() =>
                Connections.disconnectInbox({ inboxId: inbox.id }),
              )
            }
          >
            {t("integrations.gmail.action.tertiary")}
          </Button>
        </div>
        <Notice value={notice} />
      </InferredForm>
    </div>
  );
};

const PeopleSearch = ({ configured }: { configured: boolean }) => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const [people, setPeople] = useState<Person[]>([]);
  const [domain, setDomain] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  return (
    <div className="min-w-0">
      <InferredForm
        config={{
          domain: field({
            shape: "text",
            validator: z.string().min(3).max(253),
            label: t("integrations.fields.domain"),
          }),
        }}
        defaultValues={{ domain: "" }}
        onSubmit={(values) => {
          setDomain(values.domain);
          return mutation.run(
            () => Outbound.searchPeople(values),
            (data) => setPeople(data?.people ?? []),
          );
        }}
        className="max-w-lg space-y-4"
      >
        <Button type="submit" disabled={!configured || mutation.pending}>
          <SearchIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.action.primary")}
        </Button>
        <Notice value={mutation.notice} />
      </InferredForm>
      <ul className="mt-6 divide-y divide-accent-foreground">
        {people.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-medium text-sm">{person.name}</p>
              <p className="mt-1 text-foreground-dimmed text-xs">
                {person.title}
              </p>
            </div>
            <Button
              variant="soft"
              color="neutral"
              disabled={mutation.pending}
              onClick={() => setPerson(person)}
            >
              <FaceSearchIcon aria-hidden className="size-4 shrink-0" />
              {t("campaigns.chooseContact")}
            </Button>
          </li>
        ))}
      </ul>
      {person && (
        <ProspectEditor
          key={person.id}
          seed={{
            company: person.company,
            domain: person.domain || domain,
            name: person.name,
            first: person.first,
            title: person.title,
            email: person.email,
            linkedinUrl: person.linkedinUrl,
            source: "apollo",
            emailSource: "",
          }}
        />
      )}
    </div>
  );
};

export const ProspectTools = ({
  prospect,
  clay,
}: {
  prospect: Prospect;
  clay: ClayStatus | null;
}) => {
  const t = useTranslations("outbound");
  const mutation = useMutation();
  const clayReady = Boolean(clay?.configured && clay.routineConfigured);
  return (
    <div className="space-y-4 border-accent-foreground border-b bg-background/50 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending}
          onClick={() =>
            mutation.run(() =>
              Connections.prepareProspect({ prospectId: prospect.id }),
            )
          }
        >
          <FileSearchIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.research.action.tertiary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending || !prospect.email}
          onClick={() =>
            mutation.run(() => Connections.checkMx({ prospectId: prospect.id }))
          }
        >
          <EnvelopeIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.mx.action.primary")}
        </Button>

        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending || !prospect.productUrl}
          onClick={() =>
            mutation.run(() =>
              Connections.researchProspect({ prospectId: prospect.id }),
            )
          }
        >
          <FileSearchIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.action.quaternary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending}
          onClick={() =>
            mutation.run(() =>
              Connections.enrichProspect({ prospectId: prospect.id }),
            )
          }
        >
          <FaceSearchIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.apollo.action.secondary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending || !prospect.email}
          onClick={() =>
            mutation.run(() =>
              Connections.verifyProspect({ prospectId: prospect.id }),
            )
          }
        >
          <ShieldCheckIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.action.secondary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending}
          onClick={() =>
            mutation.run(() =>
              Connections.pollVerification({ prospectId: prospect.id }),
            )
          }
        >
          <ClockIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.verification.action.secondary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          onClick={() =>
            mutation.run(() =>
              Connections.startClay({ prospectIds: [prospect.id] }),
            )
          }
          aria-describedby={!clayReady ? "clay-enrichment-setup" : undefined}
          disabled={mutation.pending || !clayReady}
        >
          <CommercePlug_3SparkleIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.action.tertiary")}
        </Button>
        <Button
          variant="soft"
          color="neutral"
          disabled={mutation.pending || !prospect.evidence}
          onClick={() =>
            mutation.run(() =>
              Connections.generateDraft({ prospectId: prospect.id }),
            )
          }
        >
          <RobotIcon aria-hidden className="size-4 shrink-0" />
          {t("integrations.drafting.action.primary")}
        </Button>
      </div>
      {!clayReady && (
        <p
          id="clay-enrichment-setup"
          className="text-foreground-dimmed text-sm leading-6"
        >
          {t("integrations.clay.enrichmentUnavailable")}
        </p>
      )}
      <Notice value={mutation.notice} />
    </div>
  );
};

const ConnectionBadge = ({
  configured,
  label,
}: {
  configured: boolean;
  label?: string;
}) => {
  const t = useTranslations("outbound.integrations");
  const Icon = configured ? CheckCircleIcon : CircleMinusIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-xs",
        configured
          ? "bg-success/10 text-success"
          : "bg-background-dimmed text-foreground-dimmed",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label ?? (configured ? t("configured") : t("notConfigured"))}
    </span>
  );
};

const ProviderSymbol = ({ provider }: { provider: "clay" | "azure" }) => {
  const Icon = {
    clay: CommercePlug_3SparkleIcon,
    azure: RobotIcon,
  }[provider];
  return <Icon aria-hidden className="size-5 shrink-0 text-primary" />;
};
