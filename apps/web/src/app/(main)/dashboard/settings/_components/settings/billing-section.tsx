"use client";

import { Button } from "@zenncore/web/components/button";

export const BillingSection = () => (
  <div className="divide-y divide-accent-foreground">
    <div>
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-medium text-base text-foreground">Current Plan</p>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-base text-foreground">
              Compete Plan
            </p>
            <p className="mt-1 font-semibold text-2xl text-primary">
              $149
              <span className="font-light text-base text-foreground-dimmed">
                /mo
              </span>
            </p>
          </div>
          <span className="bg-success/10 px-2 py-0.5 font-medium text-sm text-success">
            Active
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {[
            { label: "Products used", value: "10 / 100" },
            { label: "Billing cycle", value: "Monthly" },
            { label: "Next billing date", value: "April 6, 2026" },
            { label: "Payment method", value: "Visa ending in 4242" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="font-light text-foreground-dimmed text-sm">
                {label}
              </span>
              <span className="font-medium text-base text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="flat" color="primary" className="flex-1">
            Upgrade to Dominate
          </Button>
          <Button variant="outline" color="neutral">
            Cancel Plan
          </Button>
        </div>
      </div>
    </div>

    <div>
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-medium text-base text-foreground">Invoice History</p>
      </div>
      <div className="divide-y divide-accent-foreground">
        {[
          { date: "Mar 6, 2026", amount: "$149.00", status: "Paid" },
          { date: "Feb 6, 2026", amount: "$149.00", status: "Paid" },
          { date: "Jan 6, 2026", amount: "$149.00", status: "Paid" },
        ].map((invoice) => (
          <div
            key={invoice.date}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium text-base text-foreground">
                {invoice.date}
              </p>
              <p className="font-light text-foreground-dimmed text-sm">
                {invoice.amount}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-success/10 px-2 py-0.5 font-medium text-sm text-success">
                {invoice.status}
              </span>
              <button
                type="button"
                className="font-light text-primary text-sm hover:underline"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
