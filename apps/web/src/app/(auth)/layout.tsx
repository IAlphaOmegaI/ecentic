import type { PropsWithChildren } from "react";

export default ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-background">{children}</div>
);
