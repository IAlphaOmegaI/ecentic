"use client";

import {
  BookIcon,
  GlobeIcon,
  HomeIcon,
  SearchIcon,
  ShareIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import * as Agentic from "@/server/app/intelligence/agentic";
import type {
  JourneySnapshot,
  JourneyStep,
  JourneyVerdict,
} from "@/server/app/intelligence/agentic-contract";
import { StatusPill } from "../../../_components/grid";

const POLL_MS = 8_000;
const MAX_NODES = 64;
const PILL_HEIGHT = 32;
const HUB_SIZE = 20;
const COLUMN_WIDTH = 176;
const ROW_HEIGHT = 44;
const PAD = 24;

type Family = "search" | "docs" | "home" | "page";
type Kind = "pill" | "hub";

type GraphNode = {
  id: number;
  kind: Kind;
  family: Family;
  label: string;
  parentId: number | null;
};

type Placed = GraphNode & {
  x: number;
  y: number;
  width: number;
  height: number;
};

const VERDICT_TONE = {
  satisfied: "success",
  partial: "warning",
  unsatisfied: "error",
  not_gradable: "neutral",
} as const satisfies Record<JourneyVerdict, string>;

const FAMILY_CLASS = {
  search: "border-primary text-primary",
  docs: "border-warning text-warning",
  home: "border-success text-success",
  page: "border-success text-success",
} as const satisfies Record<Family, string>;

const clip = (value: string) =>
  value.length > 24 ? `${value.slice(0, 23)}…` : value;

const familyOf = (step: JourneyStep): Family => {
  if (step.action === "search") return "search";

  const haystack = `${step.label ?? ""} ${step.url_path ?? ""}`.toLowerCase();
  if (haystack.includes("docs")) return "docs";
  if (
    haystack.includes("home") ||
    step.url_path === "/" ||
    step.url_path === "" ||
    step.url_path === undefined
  )
    return "home";
  return "page";
};

const labelOf = (step: JourneyStep): string => {
  const named = step.label?.trim();
  if (named) return clip(named);
  if (step.action === "search") return "search";

  const path = step.url_path ?? "";
  if (path === "" || path === "/") {
    const host = step.url_host?.split(".")[0];
    return host && host !== "www" ? `${host}.home` : "home";
  }
  if (/(^|\/)docs(\/|$)/i.test(path)) return "docs";
  return clip(path);
};

const widthOf = (node: GraphNode) =>
  node.kind === "hub" ? HUB_SIZE : Math.min(200, 40 + node.label.length * 7);

const parentIdOf = (step: JourneyStep) =>
  step.parent_id ?? step.attribution?.referrer?.step_id ?? null;

/**
 * Pills are tool calls; a text step that other steps hang off becomes the
 * small `…` hub Is Agentic draws on the connectors.
 */
const graphNodes = (steps: JourneyStep[]): GraphNode[] => {
  const parents = new Set(
    steps.flatMap((step) => {
      const parent = parentIdOf(step);
      return parent === null ? [] : [parent];
    }),
  );

  return steps.flatMap((step) => {
    switch (true) {
      case step.type === "tool_call":
        return [
          {
            id: step.id,
            kind: "pill" as const,
            family: familyOf(step),
            label: labelOf(step),
            parentId: parentIdOf(step),
          },
        ];
      case step.type === "text" && parents.has(step.id):
        return [
          {
            id: step.id,
            kind: "hub" as const,
            family: "page" as const,
            label: "…",
            parentId: parentIdOf(step),
          },
        ];
      default:
        return [];
    }
  });
};

const parentOf = (node: GraphNode, present: ReadonlySet<number>) =>
  node.parentId !== null && present.has(node.parentId) ? node.parentId : null;

const placeForest = (nodes: GraphNode[]): Placed[] => {
  const present = new Set(nodes.map((node) => node.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const childrenOf = (id: number | null) =>
    nodes.filter((node) => parentOf(node, present) === id);

  const visit = (
    id: number,
    depth: number,
    row: number,
    seen: ReadonlySet<number>,
  ): { placed: Placed[]; rows: number } => {
    const node = byId.get(id);
    if (!node || seen.has(id)) return { placed: [], rows: 0 };

    const nextSeen = new Set(seen).add(id);
    const children = childrenOf(id);
    const width = widthOf(node);
    const height = node.kind === "hub" ? HUB_SIZE : PILL_HEIGHT;
    const x = PAD + depth * COLUMN_WIDTH;

    if (children.length === 0) {
      return {
        placed: [
          {
            ...node,
            x,
            y: PAD + row * ROW_HEIGHT,
            width,
            height,
          },
        ],
        rows: 1,
      };
    }

    const folded = children.reduce<{ placed: Placed[]; rows: number }>(
      (carry, child) => {
        const next = visit(child.id, depth + 1, row + carry.rows, nextSeen);
        return {
          placed: [...carry.placed, ...next.placed],
          rows: carry.rows + next.rows,
        };
      },
      { placed: [], rows: 0 },
    );

    const first = folded.placed.find((item) => item.id === children[0]?.id);
    const last = folded.placed.find(
      (item) => item.id === children[children.length - 1]?.id,
    );
    const y = first && last ? (first.y + last.y) / 2 : PAD + row * ROW_HEIGHT;

    return {
      placed: [{ ...node, x, y, width, height }, ...folded.placed],
      rows: Math.max(1, folded.rows),
    };
  };

  return childrenOf(null).reduce<{ placed: Placed[]; rows: number }>(
    (carry, root) => {
      const next = visit(root.id, 0, carry.rows, new Set());
      return {
        placed: [...carry.placed, ...next.placed],
        rows: carry.rows + Math.max(1, next.rows),
      };
    },
    { placed: [], rows: 0 },
  ).placed;
};

const Glyph = ({ family }: { family: Family }) => {
  const Icon = (() => {
    switch (family) {
      case "search":
        return SearchIcon;
      case "docs":
        return BookIcon;
      case "home":
        return HomeIcon;
      case "page":
        return GlobeIcon;
    }
  })();

  return <Icon aria-hidden className="size-4 shrink-0" />;
};

const MapCanvas = ({ nodes }: { nodes: GraphNode[] }) => {
  const placed = placeForest(nodes.slice(0, MAX_NODES));
  const lookup = new Map(placed.map((node) => [node.id, node]));
  const present = new Set(placed.map((node) => node.id));

  const width = placed.reduce(
    (max, node) => Math.max(max, node.x + node.width),
    0,
  );
  const height = placed.reduce(
    (max, node) => Math.max(max, node.y + node.height),
    0,
  );
  const canvasWidth = width + PAD;
  const canvasHeight = height + PAD;

  const edges = placed.flatMap((node) => {
    const parentId = parentOf(node, present);
    const parent = parentId === null ? undefined : lookup.get(parentId);
    if (!parent) return [];

    const startX = parent.x + parent.width;
    const startY = parent.y + parent.height / 2;
    const endX = node.x;
    const endY = node.y + node.height / 2;
    const midX = startX + (endX - startX) / 2;

    return [
      {
        id: `${parent.id}-${node.id}`,
        d: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`,
      },
    ];
  });

  return (
    <div className="overflow-x-auto" aria-hidden>
      <div
        className="relative"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 text-background/25"
          width={canvasWidth}
          height={canvasHeight}
        >
          {edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.d}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>
        {placed.map((node) =>
          node.kind === "hub" ? (
            <span
              key={node.id}
              aria-hidden
              className="absolute flex items-center justify-center rounded-full border border-background/30 font-mono text-background/50 text-xs"
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
            >
              …
            </span>
          ) : (
            <span
              key={node.id}
              className={cn(
                "absolute inline-flex items-center gap-1.5 overflow-hidden rounded-full border bg-foreground px-2.5 font-mono text-xs",
                FAMILY_CLASS[node.family],
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
            >
              <Glyph family={node.family} />
              {node.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
};

export const JourneyTrace = ({
  store,
  initial,
}: {
  store: string;
  initial: JourneySnapshot | null;
}) => {
  const translate = useTranslations("dashboard.agentic");
  const [snapshot, setSnapshot] = useState(initial);
  const run = snapshot?.id;
  const status = snapshot?.status;

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  useEffect(() => {
    if (status !== "running" || !run) return;

    const timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };
    const tick = async () => {
      const result = await Agentic.journeySnapshot({
        store,
        run,
      });
      if (!result.success || !result.data) return;
      setSnapshot(result.data);
      if (result.data.status === "running")
        timer.id = setTimeout(() => void tick(), POLL_MS);
    };

    timer.id = setTimeout(() => void tick(), POLL_MS);
    return () => {
      if (timer.id) clearTimeout(timer.id);
    };
  }, [run, status, store]);

  const nodes = snapshot ? graphNodes(snapshot.steps) : [];
  const pills = nodes.filter((node) => node.kind === "pill");

  if (!snapshot)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("journey.empty")}
      </p>
    );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.verdict && (
            <StatusPill
              tone={VERDICT_TONE[snapshot.verdict]}
              className="normal-case tracking-normal"
            >
              {translate(`journey.verdict.${snapshot.verdict}`)}
            </StatusPill>
          )}
          {snapshot.status === "running" && (
            <StatusPill tone="primary" className="normal-case tracking-normal">
              {translate("journey.runningLabel")}
            </StatusPill>
          )}
          {pills.length > 0 && (
            <p className="text-foreground-dimmed text-sm">
              {translate("journey.nodes", { count: String(pills.length) })}
            </p>
          )}
        </div>
        {snapshot.insight && (
          <p className="max-w-3xl text-foreground-dimmed text-sm">
            {snapshot.insight}
          </p>
        )}
        {snapshot.status === "running" && pills.length === 0 && (
          <p className="text-foreground-dimmed text-sm">
            {translate("journey.running")}
          </p>
        )}
      </div>
      <div className="p-4">
        <div className="overflow-hidden rounded-lg bg-foreground">
          {pills.length > 0 ? (
            <div className="p-2">
              <MapCanvas nodes={nodes} />
            </div>
          ) : (
            <div className="flex min-h-48 items-center px-6">
              <p className="text-background/60 text-sm">
                {snapshot.status === "running"
                  ? translate("journey.running")
                  : translate("journey.empty")}
              </p>
            </div>
          )}
        </div>
        <a
          href={snapshot.reportUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-fit items-center gap-1.5 font-medium text-primary-text text-sm underline-offset-2 hover:underline"
        >
          {translate("journey.attribution")}
          <ShareIcon aria-hidden className="size-3.5" />
        </a>
      </div>
      {pills.length > 0 && (
        <ol className="sr-only">
          {pills.map((node) => (
            <li key={node.id}>{node.label}</li>
          ))}
        </ol>
      )}
    </div>
  );
};
