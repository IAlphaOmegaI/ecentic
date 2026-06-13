import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { SimpleFooter } from "@/components/simple-footer";
import { UcpValidatorForm } from "./_components/ucp-validator-form";

const checks = [
  {
    title: "Endpoint reachability",
    description:
      "We request the public HTTPS domain and confirm that /.well-known/ucp responds.",
  },
  {
    title: "Schema hygiene",
    description:
      "The response body is parsed as JSON and checked for UCP spec errors and warnings.",
  },
  {
    title: "Agent access",
    description:
      "robots.txt is reviewed so you can see whether major shopping and indexing bots are blocked.",
  },
] as const;

export default () => (
  <main className="relative flex min-h-screen flex-col">
    <div className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="mx-auto max-w-6xl border-accent-foreground border-x">
        <Navbar />
      </div>
    </div>

    <section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />

        <div className="px-8 pt-16 pb-12 md:pb-16">
          <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
            Universal Commerce Protocol
          </p>
          <h1 className="mt-4 max-w-3xl font-body text-5xl text-foreground leading-tight md:text-7xl">
            UCP Validator
          </h1>
          <p className="mt-5 max-w-2xl font-light text-foreground-dimmed text-xl leading-relaxed">
            Check whether a storefront publishes a valid{" "}
            <span className="text-foreground">Universal Commerce Profile</span>{" "}
            at{" "}
            <span className="font-mono text-base text-foreground">
              /.well-known/ucp
            </span>{" "}
            and whether shopping agents can read it without friction.
          </p>
        </div>

        <div className="relative grid border-accent-foreground border-t md:grid-cols-3">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 hidden md:flex" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
          {checks.map((check, index) => (
            <div
              key={check.title}
              className={`relative p-6 md:p-8 ${
                index < checks.length - 1
                  ? "border-accent-foreground border-b md:border-b-0 md:border-r"
                  : ""
              }`}
            >
              {index < checks.length - 1 && (
                <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
              )}
              <p className="font-medium text-foreground">{check.title}</p>
              <p className="mt-2 font-light text-foreground-dimmed text-sm leading-relaxed">
                {check.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="mx-auto max-w-6xl border-accent-foreground border-x">
        <UcpValidatorForm />
      </div>
    </section>

    <SimpleFooter />
  </main>
);
