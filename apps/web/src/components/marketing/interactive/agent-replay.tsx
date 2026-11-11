import { FileSearchIcon, UserIcon } from "@zenncore/icons";
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
  const { interactiveReplay: copy, reviewSimulate } = await getMessages();
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
    <div className="flex items-start gap-4 px-4 py-6 md:px-8">
      <FileSearchIcon
        aria-hidden
        className="mt-1 size-6 shrink-0 text-primary-text"
      />
      <p className="max-w-[76ch] text-foreground text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
  const contents = {
    question: (
      <div className="flex min-h-80 flex-col justify-center gap-8 px-4 py-8 md:px-8">
        <div className="ml-auto max-w-[76%] max-sm:max-w-full">
          <p className="mb-4 flex items-center justify-end gap-2 text-foreground-dimmed text-sm">
            <UserIcon aria-hidden className="size-4" />
            {copy.questionLabel}
          </p>
          <blockquote className="rounded-2xl rounded-tr-sm border border-accent-foreground bg-background-dimmed px-6 py-6 font-heading text-2xl text-foreground-rich leading-snug max-sm:text-xl">
            {copy.question}
          </blockquote>
        </div>
        <div className="flex max-w-[76ch] items-start gap-4">
          <FileSearchIcon
            aria-hidden
            className="size-6 shrink-0 text-primary-text"
          />
          <p className="text-foreground text-sm leading-relaxed">
            {copy.questionNote}
          </p>
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-y bg-linear-to-r from-primary/8 via-background to-background px-4 py-6 md:px-8">
        <p className="flex items-center gap-4 font-medium text-foreground-rich">
          <FileSearchIcon aria-hidden className="size-6 text-primary-text" />
          {reviewSimulate.assistant}
        </p>
        <p className="text-foreground-dimmed text-sm">{copy.sample}</p>
      </div>
      <header className="px-4 py-6 md:px-8">
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
        autoPlay
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
