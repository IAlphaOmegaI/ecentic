import { useId } from "react";

/** Each segment is one saved answer; mentions are grouped from the start. */
export const MentionMeter = ({
  count,
  total,
}: {
  count: number;
  total: number;
}) => {
  const gradient = useId();
  if (total === 0) return <div aria-hidden className="mt-5 h-4" />;
  const segments = Array.from({ length: total }, (_, index) => ({
    position: index + 1,
    mentioned: index < count,
  }));

  return (
    <svg aria-hidden className="mt-5 h-4 w-full max-w-80" focusable="false">
      <defs>
        <linearGradient
          id={gradient}
          gradientUnits="userSpaceOnUse"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="var(--color-error)" />
          <stop offset="50%" stopColor="var(--color-warning)" />
          <stop offset="100%" stopColor="var(--color-success)" />
        </linearGradient>
      </defs>
      {segments.map(({ position, mentioned }) => (
        <rect
          key={position}
          x={`${((position - 1) / total) * 100}%`}
          y="0"
          width={`${100 / total}%`}
          height="100%"
          rx="var(--radius-sm)"
          fill={
            mentioned ? `url(#${gradient})` : "var(--color-accent-foreground)"
          }
          stroke="var(--color-background-rich)"
          strokeWidth="var(--spacing)"
        />
      ))}
    </svg>
  );
};
