import { UcpValidatorForm } from "./_components/ucp-validator-form";

export default () => {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16">
      <div>
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
};
