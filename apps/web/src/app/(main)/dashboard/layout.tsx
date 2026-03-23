import { type PropsWithChildren, Suspense } from "react";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default ({ children }: PropsWithChildren) => (
  <div className="flex h-screen overflow-hidden bg-background">
    <Suspense
      fallback={
        <div className="h-full w-60 animate-pulse bg-background-rich" />
      }
    >
      <Sidebar />
    </Suspense>
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);
