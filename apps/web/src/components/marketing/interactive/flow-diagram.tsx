"use client";

import { ArrowRightIcon, CheckIcon, CircleMinusIcon } from "@zenncore/icons";
import { cn, cva } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { Fragment, type ReactNode, useId } from "react";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const diagram = cva("m-0 grid list-none p-0", {
  variants: {
    orientation: {
      vertical: "grid-cols-1",
      horizontal: "grid-cols-1 md:auto-cols-fr md:grid-flow-col",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

export const FlowDiagram = ({
  label,
  nodes,
  connectors = [],
  selectedConnector,
  onConnectorSelect,
  statusLabels,
  orientation = "vertical",
}: FlowDiagram.Props) => {
  const identifier = useId();
  const selected = connectors.find(
    (connector) => connector.id === selectedConnector,
  );

  return (
    <div data-flow-diagram>
      <ol aria-label={label} className={diagram({ orientation })}>
        {nodes.map((node) => (
          <li
            key={node.id}
            data-flow-node={node.id}
            data-status={node.status}
            className="group/node relative min-w-0 border-accent-foreground border-b last:border-b-0"
          >
            <div className="relative grid min-h-18 grid-cols-[2rem_1fr_auto] items-start gap-4 px-8 py-4 max-sm:px-4">
              {orientation === "vertical" && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-12 border-accent-foreground border-l group-first/node:top-1/2 group-last/node:bottom-1/2 max-sm:left-8"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-1 grid size-8 place-items-center bg-background text-foreground-dimmed",
                  node.status === "complete" && "text-primary-text",
                )}
              >
                {(() => {
                  switch (node.status) {
                    case "complete":
                      return <CheckIcon className="size-4" />;
                    case "stopped":
                    case "pending":
                      return <CircleMinusIcon className="size-4" />;
                    default:
                      return (
                        <span className="size-2 rounded-full bg-current" />
                      );
                  }
                })()}
              </span>
              <div className="min-w-0 pt-1">
                <p
                  className={cn(
                    "font-medium text-foreground-rich leading-snug",
                    node.status === "pending" && "text-foreground-dimmed",
                  )}
                >
                  {node.href ? (
                    <Link
                      href={node.href}
                      className="text-primary-text underline underline-offset-4"
                    >
                      {node.label}
                    </Link>
                  ) : (
                    node.label
                  )}
                </p>
                {node.description && (
                  <p className="mt-2 max-w-[62ch] text-foreground-dimmed text-sm leading-relaxed">
                    {node.description}
                  </p>
                )}
                {node.content}
              </div>
              {node.status && statusLabels && (
                <span
                  className={cn(
                    "pt-1 text-right text-foreground-dimmed text-sm leading-snug max-sm:max-w-20",
                    node.status === "complete" && "text-primary-text",
                  )}
                >
                  {statusLabels[node.status]}
                </span>
              )}
            </div>
            {connectors
              .filter((connector) => connector.from === node.id)
              .map((connector) => (
                <div
                  key={connector.id}
                  data-flow-connector={connector.id}
                  data-flow-to={connector.to}
                  className="relative border-accent-foreground border-t px-8 py-4 max-sm:px-4"
                >
                  {onConnectorSelect ? (
                    <Button
                      variant="outline"
                      color={
                        connector.id === selectedConnector
                          ? "primary"
                          : "neutral"
                      }
                      aria-pressed={connector.id === selectedConnector}
                      aria-label={`${node.label} → ${nodes.find((target) => target.id === connector.to)?.label ?? connector.to}: ${connector.label}`}
                      aria-controls={`${identifier}-details`}
                      onClick={() => onConnectorSelect(connector.id)}
                    >
                      {connector.id === selectedConnector ? (
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full bg-current"
                        />
                      ) : (
                        <ArrowRightIcon className="size-4" aria-hidden="true" />
                      )}
                      {connector.label}
                    </Button>
                  ) : (
                    <Fragment>
                      <p className="flex items-center gap-2 font-medium text-foreground-rich">
                        <ArrowRightIcon className="size-4" aria-hidden="true" />
                        {connector.label}
                      </p>
                      {connector.description && (
                        <p className="mt-2 text-foreground-dimmed text-sm">
                          {connector.description}
                        </p>
                      )}
                      {connector.control && (
                        <p className="mt-2 text-foreground-dimmed text-sm">
                          {connector.control}
                        </p>
                      )}
                    </Fragment>
                  )}
                </div>
              ))}
          </li>
        ))}
      </ol>
      {onConnectorSelect && (
        <div
          id={`${identifier}-details`}
          aria-live="polite"
          aria-atomic="true"
          className="relative border-accent-foreground border-t px-8 py-6 max-sm:px-4"
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          {selected && (
            <>
              <p className="font-medium text-foreground-rich">
                {selected.label}
              </p>
              {selected.description && (
                <p className="mt-2 text-foreground-dimmed">
                  {selected.description}
                </p>
              )}
              {selected.control && (
                <p className="mt-2 text-foreground-dimmed">
                  {selected.control}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export namespace FlowDiagram {
  export type Status = "complete" | "stopped" | "pending";
  export type Node = {
    id: string;
    label: string;
    description?: string;
    status?: Status;
    href?: string;
    content?: ReactNode;
  };
  export type Connector = {
    id: string;
    from: string;
    to: string;
    label: string;
    description?: string;
    control?: string;
  };
  export type Props = {
    label: string;
    nodes: readonly Node[];
    connectors?: readonly Connector[];
    selectedConnector?: string;
    onConnectorSelect?: (connector: string) => void;
    statusLabels?: Record<Status, string>;
    orientation?: "vertical" | "horizontal";
  };
}
