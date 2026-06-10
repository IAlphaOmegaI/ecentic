import { ComparisonClient } from "./_components/comparison-client";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-8">
          <h1 className="font-medium text-3xl text-foreground">
            UCP Store Comparison
          </h1>
          <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
            Add your store and competitor stores, run the same catalog search on
            each, and see how your listings stack up in agent-mediated shopping.
          </p>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 p-6">
          <ComparisonClient />
        </div>
      </div>
    </div>
  </div>
);
