import { NextIntlClientProvider } from "next-intl";
import { createRoot } from "react-dom/client";
import en from "../../../messages/en.json";
import { WorkspaceFrame } from "../../../src/app/[locale]/(workspace)/_components/frame";
import {
  Navigation,
  WorkspaceHeader,
} from "../../../src/app/[locale]/(workspace)/_components/navigation";
import { ProspectList } from "../../../src/app/[locale]/(workspace)/_components/prospect-list";
import { WorkspaceSkeleton } from "../../../src/app/[locale]/(workspace)/_components/skeletons";

import type { ProspectList as ProspectPage } from "../../../src/lib/outbound-prospects";

const params = new URLSearchParams(location.search);
const names = [
  "Birch & Vale",
  "Estudio Horizonte",
  "Avery Commerce",
  "Northshore Supply",
  "Workshop Twenty",
];
const rows: ProspectPage["rows"] = Array.from(
  { length: Number(params.get("count") || 50) },
  (_, i) => ({
    id: `fixture-${i}`,
    company: names[i % names.length] ?? "Sample company",
    domain: `example-${i}.test`,
    name:
      ["Alex Morgan", "María Fernández", "Sam Rivera"][i % 3] ?? "Alex Morgan",
    title:
      ["Founder", "Head of e-commerce", "Director of partnerships"][i % 3] ??
      "Founder",
    email: `person${i}@example.test`,
    linkedinUrl: i % 2 === 0 ? "https://www.linkedin.com/in/example" : "",
    linkedinStatus: "ready",
    status:
      (["candidate", "approved", "active", "held"] as const)[i % 4] ??
      "candidate",
    lifecycles: ["sent", "scheduled"],
  }),
);
const host = document.getElementById("root");
if (!host) throw new Error("Fixture root missing");
createRoot(host).render(
  <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
    <WorkspaceFrame>
      <Navigation />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceHeader />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain rounded-lg bg-background">
          <div className="flex min-h-full min-w-0 flex-col">
            <header className="relative border-accent-foreground border-b px-6 py-8">
              <h1 className="font-semibold text-3xl text-foreground-rich">
                Prospects
              </h1>
              <p className="mt-3 text-foreground-dimmed">
                One company, one person, and one finding you can stand behind.
              </p>
            </header>
            <div className="min-w-0 flex-1 bg-background-rich">
              {params.has("loading") ? (
                <WorkspaceSkeleton section="prospects" />
              ) : (
                <ProspectList
                  queue={{ rows, total: 1400, page: 1, pageSize: 50 }}
                  query={{
                    q: "",
                    status: "all",
                    lifecycle: "all",
                    linkedin: "all",
                    page: 1,
                  }}
                  manualPreparation={null}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </WorkspaceFrame>
  </NextIntlClientProvider>,
);
