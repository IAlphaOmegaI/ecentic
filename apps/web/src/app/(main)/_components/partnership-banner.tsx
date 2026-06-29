import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";

const partnerHref = "https://eupresence.com/";
const bundleHref = "/pricing#partnership";

export const PartnershipBanner = () => (
  <section
    aria-label="Partnership with EU Presence"
    className="relative border-accent-foreground border-y bg-gradient-to-br from-primary/[0.07] via-background to-background p-6 md:p-8"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl" />
    <div className="pointer-events-none absolute inset-y-0 left-0 z-0 h-full w-full overflow-hidden w-auto rounded-lg opacity-80 [mask-image:linear-gradient(to_right,black,transparent)]">
      <Image
        src="/images/eu-flag.gif"
        alt=""
        aria-hidden
        unoptimized
        width={600}
        height={600}
        className="absolute inset-0 -top-48 h-[250%] w-auto left-[calc(50%+48px)]  rotate-180"
      />
    </div>
    <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <Link
          href={partnerHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit EU Presence"
          className="flex size-14 shrink-0 translate-y-0 items-center justify-center rounded-xl border border-accent-foreground bg-background shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Image
            src="/partners/eu-presence.svg"
            alt="EU Presence"
            width={32}
            height={32}
            className="size-8"
          />
        </Link>
        <div>
          <h2 className="font-medium text-3xl text-foreground md:text-4xl">
            ecentic × EU Presence
          </h2>
          <p className="mt-2 max-w-xl font-light text-foreground-dimmed text-lg md:text-xl">
            We've partnered with EU Presence to help you expand into the
            European market — they handle representation and compliance across
            all 27 EU member states while ecentic keeps you picked by AI agents.
            Get both in one bundle, with 15% off.
          </p>
        </div>
      </div>
      <Button
        color="primary"
        className="shrink-0 self-start md:self-center"
        render={<Link href={bundleHref} />}
      >
        <Image
          src="/images/eu.svg"
          alt="EU"
          width={32}
          height={32}
          className="size-6"
        />
        See the EU bundle
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  </section>
);
