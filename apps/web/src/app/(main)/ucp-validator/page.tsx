import { Motion } from "@/components/motion";
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
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="mx-auto flex min-h-screen w-full max-w-6xl flex-col"
  >
    <Motion.Item className="border-accent-foreground border-b px-4 sm:px-8">
      <div className="grid border-accent-foreground border-x lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <p className="font-medium text-primary text-xs uppercase tracking-[0.24em]">
            Universal Commerce Protocol
          </p>
          <h1 className="mt-4 font-medium text-4xl text-foreground sm:text-5xl">
            UCP Validator
          </h1>
          <p className="mt-3 max-w-3xl font-light text-foreground-dimmed text-lg sm:text-2xl">
            Check whether a storefront publishes a valid{" "}
            <span className="text-foreground">Universal Commerce Profile</span>{" "}
            at{" "}
            <span className="font-mono text-base text-foreground">
              /.well-known/ucp
            </span>{" "}
            and whether shopping agents can read it without friction.
          </p>
        </div>

        <div className="border-accent-foreground border-t bg-background-dimmed p-6 lg:border-t-0 lg:border-l">
          <p className="font-medium text-foreground text-sm">
            What this validator checks
          </p>
          <div className="mt-4 space-y-4">
            {checks.map((check) => (
              <div
                key={check.title}
                className="border-accent-foreground border-t pt-4 first:border-t-0 first:pt-0"
              >
                <p className="font-medium text-foreground text-sm">
                  {check.title}
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
                  {check.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Motion.Item>

    <Motion.Item className="border-accent-foreground border-b px-4 sm:px-8">
      <div className="border-accent-foreground border-x">
        <UcpValidatorForm />
      </div>
    </Motion.Item>
  </Motion.Stagger>
);
