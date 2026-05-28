import { PlaygroundClient } from "./_components/playground-client";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-8">
          <h1 className="font-medium text-3xl text-foreground">
            UCP Playground
          </h1>
          <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
            Test the Universal Commerce Protocol flow against any store —
            catalog search, product lookup, and cart operations.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 p-6">
          <PlaygroundClient />
        </div>
      </div>
    </div>
  </div>
);
