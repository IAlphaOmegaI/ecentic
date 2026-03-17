import Link from "next/link";

export const Topbar = () => (
  <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-5">
    <div className="flex max-w-md flex-1 items-center gap-2">
      <div className="flex flex-1 items-center gap-2 border border-accent-foreground bg-background px-3 py-1.5">
        <svg
          className="size-4 text-foreground-dimmed"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM15 15l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-light text-foreground-dimmed text-sm">
          Search products, competitors...
        </span>
        <kbd className="ml-auto font-light text-foreground-dimmed text-xs opacity-60">
          ⌘K
        </kbd>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <button
        type="button"
        className="relative flex size-8 items-center justify-center text-foreground-dimmed transition-colors hover:text-foreground"
        aria-label="Notifications"
      >
        <svg
          className="size-4"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6v2.5L2 10h12l-1.5-1.5V6c0-2.485-2.015-4.5-4.5-4.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M6.5 12.5a1.5 1.5 0 0 0 3 0"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        <span className="absolute top-1 right-1 flex size-1.5 items-center justify-center bg-primary text-white">
          <span className="sr-only">3 unread notifications</span>
        </span>
      </button>

      <Link
        href="/dashboard/settings/billing"
        className="border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs transition-colors hover:bg-primary/20"
      >
        Compete
      </Link>

      <button
        type="button"
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <div className="flex size-7 items-center justify-center bg-primary font-medium text-sm text-white">
          J
        </div>
        <span className="hidden font-medium text-foreground text-sm md:block">
          Jane Smith
        </span>
      </button>
    </div>
  </header>
);
