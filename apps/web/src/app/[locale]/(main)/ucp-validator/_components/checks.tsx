import { getMessages, getTranslations } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";
import { ValidatorCheckExplorer } from "./validator-check-explorer";

export const Checks = async () => {
  const translate = await getTranslations("ucpValidator");
  const messages = await getMessages();
  const checks = messages.ucpValidator.checks.items;
  const targets = messages.ucpValidator.form.targets;
  const groups = [
    [
      { ...targets.https, code: "HTTPS" },
      { ...targets.discovery, code: "/.well-known/ucp" },
    ],
    [
      { ...targets.services, code: "REST · MCP · A2A" },
      { ...targets.capabilities, code: "dev.ucp.shopping.*" },
      { ...targets.paymentHandlers, code: "payment.handlers[]" },
      { ...targets.signingKeys, code: "signing_keys" },
      { ...targets.supportedVersions, code: "supported_versions[]" },
    ],
    [{ ...targets.agentAccess, code: "robots.txt" }],
  ];

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto grid w-[min(1186px,calc(100%-56px))] gap-px border-accent-foreground border-x bg-accent-foreground max-sm:w-[calc(100%-32px)] md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />

        <div className="flex min-w-0 flex-col bg-background-dimmed">
          <div className="px-7 pt-10 max-sm:px-4 max-sm:pt-8">
            <span className="text-3xl text-primary">
              {translate("checks.number")}
            </span>
            <h2 className="mt-4 text-foreground-rich">
              {translate("checks.title")}
            </h2>
            <p className="mt-4 max-w-sm text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {translate("checks.description")}
            </p>
          </div>
          <div className="mt-auto h-64 px-6 py-6 text-primary max-sm:h-52">
            <EvolvingAscii artwork="catalog" fit="contain" />
          </div>
        </div>

        <ValidatorCheckExplorer
          checks={checks.map((check, index) => ({
            ...check,
            targets: groups[index] ?? [],
          }))}
        />
      </div>
    </section>
  );
};
