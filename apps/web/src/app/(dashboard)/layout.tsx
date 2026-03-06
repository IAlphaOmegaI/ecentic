import type { PropsWithChildren } from "react";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default ({ children }: PropsWithChildren) => (
  <div className="flex h-screen overflow-hidden bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);
