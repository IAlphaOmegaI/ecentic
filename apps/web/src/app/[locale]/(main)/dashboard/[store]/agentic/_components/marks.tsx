import {
  AccessibilityIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  CircleMinusIcon,
  CreditCardIcon,
  CursorRaysIcon,
  GaugeIcon,
  type Icon,
  RadarIcon,
  XCircleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { CheckStatus } from "@/server/app/intelligence/agentic-contract";

const LAYER_ICONS = {
  discovery: RadarIcon,
  accessibility: AccessibilityIcon,
  usability: CursorRaysIcon,
  payments: CreditCardIcon,
} as const satisfies Record<string, Icon>;

export const LayerGlyph = ({
  id,
  className,
}: {
  id: string;
  className?: string;
}) => {
  const Glyph = (() => {
    switch (id) {
      case "discovery":
      case "accessibility":
      case "usability":
      case "payments":
        return LAYER_ICONS[id];
      default:
        return GaugeIcon;
    }
  })();

  return <Glyph aria-hidden className={className} />;
};

const CHECK_ICONS = {
  pass: CheckCircleIcon,
  warning: AlertCircleIcon,
  fail: XCircleIcon,
  error: XCircleIcon,
  na: CircleMinusIcon,
  unknown: AlertCircleIcon,
} as const satisfies Record<CheckStatus, Icon>;

const CHECK_ICON_CLASS = {
  pass: "text-success",
  warning: "text-warning",
  fail: "text-error",
  error: "text-error",
  na: "text-foreground-dimmed",
  unknown: "text-foreground-dimmed",
} as const satisfies Record<CheckStatus, string>;

export const CheckStatusMark = ({
  status,
  label,
  compact = false,
  className,
}: {
  status: CheckStatus;
  label: string;
  compact?: boolean;
  className?: string;
}) => {
  const Glyph = CHECK_ICONS[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Glyph
        aria-hidden
        className={cn("size-4 shrink-0", CHECK_ICON_CLASS[status])}
      />
      {compact ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="text-foreground-dimmed text-sm">{label}</span>
      )}
    </span>
  );
};

export const LayerTally = ({
  passed,
  warning,
  failed,
  notApplicable,
  labels,
}: {
  passed: number;
  warning: number;
  failed: number;
  notApplicable: number;
  labels: {
    passed: string;
    warning: string;
    failed: string;
    notApplicable: string;
    summary: string;
  };
}) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
    <span className="sr-only">{labels.summary}</span>
    {passed > 0 && (
      <span
        title={labels.passed}
        className="inline-flex items-center gap-1 text-success text-xs tabular-nums"
      >
        <CheckCircleIcon aria-hidden className="size-3.5" />
        {passed}
      </span>
    )}
    {warning > 0 && (
      <span
        title={labels.warning}
        className="inline-flex items-center gap-1 text-warning text-xs tabular-nums"
      >
        <AlertCircleIcon aria-hidden className="size-3.5" />
        {warning}
      </span>
    )}
    {failed > 0 && (
      <span
        title={labels.failed}
        className="inline-flex items-center gap-1 text-error text-xs tabular-nums"
      >
        <XCircleIcon aria-hidden className="size-3.5" />
        {failed}
      </span>
    )}
    {notApplicable > 0 && (
      <span
        title={labels.notApplicable}
        className="inline-flex items-center gap-1 text-foreground-dimmed text-xs tabular-nums"
      >
        <CircleMinusIcon aria-hidden className="size-3.5" />
        {notApplicable}
      </span>
    )}
  </div>
);
