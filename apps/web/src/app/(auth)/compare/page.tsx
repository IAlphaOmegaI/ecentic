"use client";

import { Navbar } from "@/components/navbar";
import { CompareForm } from "./_components/compare-form";

export default () => (
  <main className="flex flex-1 flex-col overflow-hidden size-full flex-1 min-h-full">
    <Navbar />
    <div className="w-full border-accent-foreground border-b px-8">
      <div className="flex flex-col border-accent-foreground border-x p-6 pt-16">
        <h2 className="font-medium text-4xl text-foreground">
          Compare two products
        </h2>
        <p className="font-light text-2xl text-foreground-dimmed">
          See which product AI agents would recommend — and why.
        </p>
      </div>
    </div>

    <div className="w-full flex-1 overflow-hidden border-accent-foreground border-b flex-1">
      <div className="flex h-full flex-col border-accent-foreground border-x size-full">
        <CompareForm />
      </div>
    </div>
  </main>
);
