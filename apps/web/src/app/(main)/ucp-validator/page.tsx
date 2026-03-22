import { UcpValidatorForm } from "./_components/ucp-validator-form";

export default function UcpValidatorPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl text-foreground">
          UCP Validator
        </h1>
        <p className="mt-2 font-light text-foreground-dimmed text-sm">
          Check whether a domain has a valid Universal Commerce Profile at{" "}
          <span className="font-mono">/.well-known/ucp</span> and is served over
          HTTPS.
        </p>
      </div>
      <UcpValidatorForm />
    </div>
  );
}
