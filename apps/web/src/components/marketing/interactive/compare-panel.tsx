import { cn } from "@zenncore/utils";
import type { HTMLAttributes, ReactNode } from "react";

const Value = ({ value, labels, heading }: Value.Props) => (
  <dd className="min-w-0 border-accent-foreground px-4 py-5 last:border-l md:px-6">
    <span className="sr-only">{heading}: </span>
    <p
      className={cn(
        "break-words text-sm leading-relaxed md:text-base",
        value.status === "missing"
          ? "text-foreground-dimmed"
          : "text-foreground-rich",
      )}
    >
      {value.status === "missing" ? labels.missing : value.value}
    </p>
    {value.status !== "missing" && (
      <p className="mt-2 text-foreground-dimmed text-xs leading-relaxed">
        {(() => {
          switch (value.status) {
            case "meets":
              return labels.meets;
            case "mismatch":
              return labels.doesNotMeet;
            default:
              return labels.present;
          }
        })()}
      </p>
    )}
  </dd>
);

const Root = ({
  left,
  right,
  rows,
  labels,
  className,
  ...props
}: ComparePanel.Props) => (
  <div className={cn("min-w-0", className)} data-compare-panel="" {...props}>
    <div className="grid grid-cols-2 border-accent-foreground border-t md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="hidden md:block" />
      {[left, right].map((heading) => (
        <div
          key={heading.label}
          className="min-w-0 px-4 py-6 last:border-accent-foreground last:border-l md:px-6"
        >
          <p className="text-foreground-dimmed text-sm">{heading.label}</p>
          <h3 className="mt-3 break-words font-heading text-foreground-rich text-lg leading-tight md:text-2xl">
            {heading.title}
          </h3>
        </div>
      ))}
    </div>
    <dl>
      {rows.map((row) => (
        <div
          key={row.key}
          data-compare-field={row.key}
          data-required={row.required || undefined}
          className="relative grid grid-cols-2 border-accent-foreground border-t data-required:outline-1 data-required:outline-primary data-required:-outline-offset-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]"
        >
          <dt className="col-span-2 min-w-0 border-accent-foreground border-b px-4 py-4 md:col-span-1 md:border-r md:border-b-0 md:px-6 md:py-5">
            <p className="flex items-start gap-2 font-medium text-foreground-rich text-sm md:text-base">
              {row.required && (
                <span
                  className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              {row.label}
            </p>
            {row.required && (
              <p className="mt-2 text-foreground-dimmed text-xs">
                {labels.required}
              </p>
            )}
          </dt>
          <Value value={row.left} labels={labels} heading={left.label} />
          <Value value={row.right} labels={labels} heading={right.label} />
        </div>
      ))}
    </dl>
  </div>
);

const Result = ({
  label,
  children,
  className,
  ...props
}: ComparePanel.ResultProps) => (
  <div
    className={cn(
      "border-accent-foreground border-t px-4 py-6 md:px-6",
      className,
    )}
    {...props}
  >
    <p className="flex items-center gap-2 font-medium text-foreground-rich text-sm">
      <span
        className="size-2 shrink-0 rounded-full bg-primary"
        aria-hidden="true"
      />
      {label}
    </p>
    <p className="mt-3 max-w-[80ch] text-foreground-rich leading-relaxed">
      {children}
    </p>
  </div>
);

export const ComparePanel = { Root, Result };

namespace Value {
  export type Props = {
    value: ComparePanel.Value;
    labels: ComparePanel.Labels;
    heading: string;
  };
}

export namespace ComparePanel {
  export type Value = {
    value: string;
    status: "present" | "missing" | "meets" | "mismatch";
  };
  export type Labels = {
    present: string;
    missing: string;
    meets: string;
    doesNotMeet: string;
    required: string;
  };
  export type Row = {
    key: string;
    label: string;
    required?: boolean;
    left: Value;
    right: Value;
  };
  export type Props = HTMLAttributes<HTMLDivElement> & {
    left: { label: string; title: string };
    right: { label: string; title: string };
    rows: readonly Row[];
    labels: Labels;
  };
  export type ResultProps = HTMLAttributes<HTMLDivElement> & {
    label: string;
    children: ReactNode;
  };
}
