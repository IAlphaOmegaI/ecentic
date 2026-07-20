import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { UcpValidatorForm } from "./ucp-validator-form";

export const ValidatorSection = () => (
  <section id="validate" className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">02</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Run a live validation.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Paste a domain and we fetch the live profile, parse every service and
            capability, then report spec errors and agent access.
          </p>
        </RevealItem>
      </Reveal>

      <div className="relative border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <UcpValidatorForm hideIntro />
      </div>
    </div>
  </section>
);
