export type SendingDay = { day: string; accepted: number; bounced: number };

/** Observed sending volume is a pacing input, never proof of inbox placement. */
export const sendingCapacity = (
  target: number,
  days: SendingDay[],
  now = new Date(),
) => {
  const ceiling = Math.max(1, Math.min(50, Math.floor(target)));
  const today = now.toISOString().slice(0, 10);
  const history = days
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.day) && day.day < today)
    .sort((left, right) => left.day.localeCompare(right.day));
  const observedBounce = days.some((day) => day.bounced > 0);
  const initial = Math.min(15, ceiling);
  const dailyCap = observedBounce
    ? initial
    : history.reduce(
        (cap, day) => (day.accepted >= cap ? Math.min(ceiling, cap + 5) : cap),
        initial,
      );
  return { target: ceiling, dailyCap, rampHeld: observedBounce };
};
