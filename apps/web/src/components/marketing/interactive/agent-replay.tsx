import { getLocale, getMessages } from "next-intl/server";
import { MarketingBand } from "@/components/marketing/primitives";
import { agentReplay } from "@/content/examples/agent-replay";
import { ComparePanel } from "./compare-panel";
import { StepPlayer } from "./step-player";

export const AgentReplay = async ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const locale = await getLocale();
  const { interactiveReplay: copy } = await getMessages();
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: agentReplay.currency,
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat(locale);
  const value = (
    field: (typeof agentReplay.fields)[number],
    listing: typeof agentReplay.own | typeof agentReplay.rival,
  ) => {
    switch (field) {
      case "price":
        return currency.format(listing.price);
      case "seatHeight":
        return `${number.format(listing.seatHeight.minimum)}–${number.format(listing.seatHeight.maximum)} ${copy.units.centimeters}`;
      case "capacity":
        return `${number.format(listing.capacity)} ${copy.units.kilograms}`;
      case "variants":
        return `${number.format(listing.variants)} ${copy.units.variants}`;
    }
  };
  const comparison = (
    fixed = false,
    reading?: (typeof agentReplay.fields)[number] | "all",
  ) => (
    <ComparePanel.Root
      left={{ label: copy.listing.own, title: copy.listing.ownTitle }}
      right={{ label: copy.listing.rival, title: copy.listing.rivalTitle }}
      labels={copy.comparison}
      rows={agentReplay.fields.map((field) => ({
        key: field,
        label: copy.fields[field],
        required: reading === field || reading === "all",
        left: {
          value: value(field, agentReplay.own),
          status:
            !fixed && agentReplay.missing.some((missing) => missing === field)
              ? "missing"
              : "present",
        },
        right: { value: value(field, agentReplay.rival), status: "present" },
      }))}
    />
  );
  const note = (text: string) => (
    <p className="max-w-[80ch] px-4 py-6 text-foreground text-sm leading-relaxed md:px-6">
      {text}
    </p>
  );
  const contents = {
    question: (
      <div className="flex min-h-72 flex-col justify-center gap-6 px-4 py-8 md:px-6">
        <p className="text-foreground-dimmed text-sm">{copy.questionLabel}</p>
        <blockquote className="max-w-[28ch] font-heading text-2xl text-foreground-rich leading-snug md:text-3xl">
          {copy.question}
        </blockquote>
        <p className="max-w-[68ch] text-foreground text-sm leading-relaxed">
          {copy.questionNote}
        </p>
      </div>
    ),
    listings: (
      <>
        {note(copy.listingNote)}
        {comparison()}
      </>
    ),
    fields: (
      <>
        {note(copy.fieldsNote)}
        {comparison(false, "all")}
      </>
    ),
    pick: (
      <>
        <ComparePanel.Result label={copy.pickLabel}>
          {copy.pickReason}
        </ComparePanel.Result>
        {comparison()}
      </>
    ),
    fix: (
      <>
        {note(copy.fixNote)}
        {comparison(true, "all")}
      </>
    ),
    rerun: (
      <>
        <ComparePanel.Result label={copy.rerunLabel}>
          {copy.rerunReason}
        </ComparePanel.Result>
        {comparison(true)}
        {note(copy.outcomeNote)}
      </>
    ),
  };
  const steps: StepPlayer.Step[] = agentReplay.stages.map((id) => ({
    id,
    label: copy.stages[id],
    content: contents[id],
    announcement:
      id === "pick"
        ? `${copy.pickLabel}. ${copy.pickReason}`
        : id === "rerun"
          ? `${copy.rerunLabel}. ${copy.rerunReason}`
          : copy.stages[id],
    ...(id === "fields"
      ? {
          frames: agentReplay.fields.map((field) => ({
            content: (
              <>
                {note(`${copy.reading}: ${copy.fields[field]}`)}
                {comparison(false, field)}
              </>
            ),
            announcement: `${copy.reading}: ${copy.fields[field]}. ${agentReplay.missing.some((missing) => missing === field) ? copy.missingReading : copy.presentReading}`,
          })),
        }
      : {}),
  }));
  const content = (
    <div data-agent-replay="" className="min-w-0 bg-background">
      <header className="px-4 py-8 md:px-6">
        <p className="mb-4 font-medium text-primary-text text-sm">
          {copy.sample}
        </p>
        <h2 className="font-heading text-2xl text-foreground-rich md:text-3xl">
          {copy.title}
        </h2>
        <p className="mt-4 max-w-[72ch] text-foreground leading-relaxed">
          {copy.description}
        </p>
      </header>
      <StepPlayer
        steps={steps}
        label={copy.rail}
        labels={copy.controls}
        playback
      />
    </div>
  );
  return embedded ? (
    content
  ) : (
    <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
      {content}
    </MarketingBand>
  );
};
