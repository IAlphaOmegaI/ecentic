export const FooterWordmark = () => (
  <div
    role="img"
    aria-label="écentic"
    data-footer-wordmark
    className="relative isolate flex justify-center overflow-hidden px-4 pt-10 pb-12 text-emphasis-dimmed sm:px-7 sm:pt-14 sm:pb-16"
  >
    <span
      aria-hidden
      className="select-none whitespace-nowrap font-heading font-normal text-[clamp(4.5rem,21vw,17rem)] leading-[0.95] tracking-[-0.075em]"
    >
      écentic
    </span>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-7 bottom-5 h-px bg-linear-to-r from-transparent via-primary-text/35 to-transparent sm:inset-x-14 sm:bottom-8"
    >
      <span className="absolute top-1/2 left-1/3 size-1.5 -translate-y-1/2 rounded-full bg-primary-text/60" />
      <span className="absolute top-1/2 right-1/4 size-1 -translate-y-1/2 rounded-full bg-background-rich/80" />
    </div>
  </div>
);
