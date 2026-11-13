import Image from "next/image";
import { type PropsWithChildren, Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

export default ({ children }: PropsWithChildren) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-accent-foreground border-b bg-background-rich px-4 sm:px-8">
      <Link href="/dashboard" aria-label="ecentic">
        <Image
          src="/images/trademark.svg"
          alt="ecentic"
          width={96}
          height={28}
          loading="eager"
        />
      </Link>
      <Suspense
        fallback={
          <div
            aria-hidden
            className="h-10 w-20 shrink-0 animate-pulse rounded-sm bg-foreground/10"
          />
        }
      >
        <LanguageSwitcher />
      </Suspense>
    </header>
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
  </div>
);
