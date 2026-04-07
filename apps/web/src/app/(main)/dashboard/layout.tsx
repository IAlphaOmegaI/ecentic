import type { Metadata } from "next";
import { type PropsWithChildren, Suspense } from "react";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const SidebarSkeleton = () => (
  <aside className="hidden w-60 flex-col border-accent-foreground border-r bg-background-rich md:flex">
    <div className="flex h-14 items-center border-accent-foreground border-b px-5">
      <div className="h-5 w-24 animate-pulse bg-accent-foreground/40" />
    </div>
    <nav className="flex flex-1 flex-col gap-0.5 py-1">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          key={index}
          className="flex items-center gap-2 px-5 py-2"
        >
          <div className="size-6 animate-pulse bg-accent-foreground/30" />
          <div
            className="h-4 animate-pulse bg-accent-foreground/30"
            style={{ width: `${60 + ((index * 17) % 40)}%` }}
          />
        </div>
      ))}
    </nav>
    <div className="border-accent-foreground border-t px-4 py-4">
      <div className="mb-2 h-3 w-20 animate-pulse bg-accent-foreground/30" />
      <div className="mb-2 h-1 w-full animate-pulse bg-accent-foreground/30" />
      <div className="h-3 w-32 animate-pulse bg-accent-foreground/30" />
    </div>
  </aside>
);

const TopbarSkeleton = () => (
  <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
    <div className="flex max-w-md flex-1 items-center gap-2">
      <div className="h-8 flex-1 animate-pulse border border-accent-foreground/40 bg-accent-foreground/20" />
    </div>
    <div className="flex items-center gap-3">
      <div className="size-8 animate-pulse bg-accent-foreground/30" />
      <div className="h-6 w-16 animate-pulse bg-accent-foreground/30" />
      <div className="size-7 animate-pulse bg-accent-foreground/30" />
    </div>
  </header>
);

export default async ({ children }: PropsWithChildren) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense fallback={<TopbarSkeleton />}>
          <Topbar />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
