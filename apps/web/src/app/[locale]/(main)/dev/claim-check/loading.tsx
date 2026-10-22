import { Band } from "../../dashboard/_components/grid";
import { DemoShell } from "./_components/shell";

// Mirrors the demo shell and its URL bar so navigation lands without shift.
export default () => (
  <DemoShell>
    <Band>
      <div className="flex flex-col gap-3 px-6 py-6">
        <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-10 w-full animate-pulse rounded-md bg-foreground/10" />
      </div>
    </Band>
  </DemoShell>
);
