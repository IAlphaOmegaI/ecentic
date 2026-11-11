type Tween = { [key: string]: unknown };
export type WordmarkKernel = {
  tween: (value: number, duration?: number) => Tween;
  tset: (tween: Tween, value: number, time: number, delay?: number) => void;
  tval: (tween: Tween, time: number) => number;
  tdone: (tween: Tween, time: number) => boolean;
  register: (
    stage: HTMLElement,
    tick: (delta: number, time: number) => boolean,
  ) => { wake: () => void; unregister: () => void };
  pointer: (
    stage: HTMLElement,
    handlers: { move: (point: [number, number]) => void; leave: () => void },
  ) => () => void;
};

/** The user-requested lettering is the object: Hairline's clock draws its contours. */
export const mountWordmark = (
  stage: HTMLElement,
  paths: SVGPathElement[],
  kernel: WordmarkKernel,
  liftHeight = 8,
  read?: HTMLElement,
) => {
  const state = { active: -1, entered: false };
  if (read) read.textContent = "rest";
  const letters = paths.map((path, index) => ({
    path,
    original: path.getAttribute("d") ?? "",
    points: Array.from(
      { length: Math.ceil(path.getTotalLength() / 2) + 1 },
      (_, position) => path.getPointAtLength(position * 2),
    ),
    progress: kernel.tween(0),
    lift: kernel.tween(0),
    previousProgress: -1,
    previousLift: -1,
    center: Number(path.getAttribute("data-center")),
    index,
  }));
  const loop = kernel.register(stage, (_delta, now) => {
    if (!state.entered) {
      state.entered = true;
      for (const letter of letters)
        kernel.tset(letter.progress, 1, now, letter.index * 45);
    }
    const moving = letters.map((letter) => {
      const progress = kernel.tval(letter.progress, now);
      const lift = kernel.tval(letter.lift, now);
      if (progress !== letter.previousProgress) {
        const points = letter.points.slice(
          0,
          Math.floor(letter.points.length * progress),
        );
        const drawn = points
          .map((point, index) => {
            const previous = points[index - 1];
            const move =
              !previous ||
              Math.hypot(point.x - previous.x, point.y - previous.y) > 5;
            return `${move ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
          })
          .join("");
        letter.path.setAttribute("d", progress === 1 ? letter.original : drawn);
        letter.previousProgress = progress;
      }
      if (lift !== letter.previousLift) {
        letter.path.setAttribute("transform", `translate(0 ${-lift})`);
        letter.previousLift = lift;
      }
      return (
        !kernel.tdone(letter.progress, now) || !kernel.tdone(letter.lift, now)
      );
    });
    if (!moving.some(Boolean))
      stage.setAttribute("data-wordmark-motion", "rest");
    return moving.some(Boolean);
  });
  const choose = (active: number) => {
    if (active === state.active) return;
    const origin = active < 0 ? state.active : active;
    state.active = active;
    const now = performance.now();
    for (const letter of letters) {
      const distance = Math.abs(letter.index - origin);
      kernel.tset(
        letter.lift,
        letter.index === active ? liftHeight : 0,
        now,
        distance * 40,
      );
      letter.path.setAttribute("data-active", String(letter.index === active));
      letter.path.classList.toggle("hi", letter.index === active);
    }
    if (read)
      read.textContent =
        active < 0 ? "rest" : String(active + 1).padStart(2, "0");
    stage.setAttribute("data-wordmark-motion", "responding");
    loop.wake();
  };
  const releasePointer = kernel.pointer(stage, {
    move: ([horizontal]) => {
      const closest = letters.reduce((previous, current) =>
        Math.abs(current.center - horizontal) <
        Math.abs(previous.center - horizontal)
          ? current
          : previous,
      );
      choose(closest.index);
    },
    leave: () => choose(-1),
  });
  const keyboard = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    choose(
      state.active < 0
        ? direction > 0
          ? 0
          : letters.length - 1
        : (state.active + direction + letters.length) % letters.length,
    );
  };
  const reset = () => choose(-1);
  stage.addEventListener("keydown", keyboard);
  stage.addEventListener("blur", reset);
  stage.setAttribute("data-wordmark-motion", "drawing");
  loop.wake();
  return () => {
    releasePointer();
    loop.unregister();
    stage.removeEventListener("keydown", keyboard);
    stage.removeEventListener("blur", reset);
    for (const letter of letters) {
      letter.path.setAttribute("d", letter.original);
      letter.path.removeAttribute("transform");
      letter.path.classList.remove("hi");
      letter.path.removeAttribute("data-active");
    }
    stage.setAttribute("data-wordmark-motion", "static");
  };
};
