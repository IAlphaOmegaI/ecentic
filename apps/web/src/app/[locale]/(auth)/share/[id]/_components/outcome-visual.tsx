const ticks = Array.from({ length: 100 }, (_, index) => index);

/** A measured dial: the blue arc uses the recorded ratio, before display rounding. */
export const ShareOutcomeVisual = ({
  wins,
  losses,
  formattedRate,
  label,
}: ShareOutcomeVisual.Props) => {
  const ratio = (() => {
    const total = wins + losses;
    if (!Number.isFinite(total) || total <= 0) return null;
    return Math.max(0, Math.min(1, wins / total));
  })();
  const angle = (ratio ?? 0) * 360;

  return (
    <figure
      data-measurement="share-outcome"
      className="relative mx-auto my-4 aspect-square w-full max-w-72"
    >
      <svg
        aria-hidden
        viewBox="0 0 360 360"
        className="absolute inset-0 size-full fill-none"
      >
        <path
          d="M 20 180 v 8 a 160 160 0 0 0 320 0 v -8"
          className="stroke-background-rich/10"
        />
        <circle
          cx="180"
          cy="180"
          r="160"
          className="stroke-background-rich/20"
        />
        <circle
          cx="180"
          cy="180"
          r="154"
          className="stroke-background-rich/10"
        />
        <g className="stroke-background-rich/30">
          {ticks.map((tick) => (
            <line
              key={tick}
              x1="180"
              y1="32"
              x2="180"
              y2={tick % 10 === 0 ? "44" : "38"}
              transform={`rotate(${tick * 3.6} 180 180)`}
            />
          ))}
        </g>
        <circle
          cx="180"
          cy="180"
          r="124"
          strokeWidth="4"
          className="stroke-background-rich/10"
        />
        <circle
          cx="180"
          cy="180"
          r="116"
          className="stroke-background-rich/10"
        />
        {ratio !== null && ratio > 0 && (
          <g>
            <circle
              cx="180"
              cy="180"
              r="124"
              pathLength="100"
              strokeDasharray={`${ratio * 100} 100`}
              strokeWidth="4"
              transform="rotate(-90 180 180)"
              className="stroke-primary"
            />
            <g transform={`rotate(${angle} 180 180)`}>
              <line
                x1="180"
                y1="18"
                x2="180"
                y2="44"
                className="stroke-primary"
              />
              <circle
                cx="180"
                cy="56"
                r="5"
                className="fill-primary stroke-foreground-rich"
                strokeWidth="2"
              />
            </g>
          </g>
        )}
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
        <p className="font-body font-semibold text-6xl text-background-rich tabular-nums leading-none tracking-tight xl:text-7xl">
          {ratio === null ? "—" : formattedRate}
        </p>
        <p className="mt-2 max-w-36 text-background-rich/60 text-sm leading-snug">
          {label}
        </p>
      </figcaption>
    </figure>
  );
};

export namespace ShareOutcomeVisual {
  export type Props = {
    wins: number;
    losses: number;
    formattedRate: string;
    label: string;
  };
}
