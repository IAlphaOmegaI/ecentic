const letters = {
  e: ["00000", "00000", "01110", "11011", "11110", "11000", "01111"],
  c: ["00000", "00000", "01111", "11000", "11000", "11000", "01111"],
  n: ["00000", "00000", "11110", "11011", "11011", "11011", "11011"],
  t: ["01100", "01100", "11111", "01100", "01100", "01101", "00110"],
  i: ["00110", "00000", "01110", "00110", "00110", "00110", "01111"],
} as const;

const name = ["e", "c", "e", "n", "t", "i", "c"] as const;
const characters = ["##", "@@", "%%"] as const;
const wordmark = Array.from({ length: 7 }, (_, row) =>
  name
    .map((letter, column) =>
      [...(letters[letter][row] ?? "")]
        .map((pixel, position) =>
          pixel === "1" ? characters[(row + column + position) % 3] : "  ",
        )
        .join(""),
    )
    .join("  "),
).join("\n");

export const AsciiWordmark = () => (
  <div
    role="img"
    aria-label="ecentic"
    className="group relative flex justify-center overflow-hidden px-4 py-10 text-primary-text sm:px-7 sm:py-14"
  >
    <pre
      aria-hidden
      className="m-0 select-none whitespace-pre bg-transparent p-0 font-mono text-[clamp(6px,1.5vw,22px)] leading-none tracking-[-0.04em] transition-colors duration-200 [font-variant-ligatures:none] group-hover:text-foreground-rich"
    >
      {wordmark}
    </pre>
  </div>
);
