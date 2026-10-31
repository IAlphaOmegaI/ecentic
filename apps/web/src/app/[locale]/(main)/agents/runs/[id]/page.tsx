import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { Run } from "../../_components/run";
import { RunSkeleton } from "../../_components/skeletons";

type RunParams = PageProps<"/[locale]/agents/runs/[id]">["params"];

// A run is one visitor's result: reachable by link, never worth indexing.
export const metadata: Metadata = {
  title: "Your store's run",
  robots: { index: false, follow: false },
};

const Live = async ({ params }: { params: RunParams }) => {
  const { id } = await params;

  return <Run id={id} />;
};

export default ({ params }: PageProps<"/[locale]/agents/runs/[id]">) => (
  // The product list streams in above the footer: anchoring to the footer would
  // carry a phone, already scrolled to the form, to the bottom of the page.
  <main className="flex min-h-screen flex-col [overflow-anchor:none]">
    <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
      {/* Reads the pathname, unknown at build for a run id. It is fixed-position, so no shift. */}
      <Suspense>
        <Navbar />
      </Suspense>
    </div>

    <section className="border-accent-foreground border-y">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x p-6 md:p-12">
        <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
        <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
        <h1 className="max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
          Getting your store ready for Google, Gemini and ChatGPT
        </h1>
      </div>
    </section>

    <section className="flex-1 border-accent-foreground border-b">
      <div className="mx-auto h-full max-w-6xl border-accent-foreground border-x">
        <Suspense fallback={<RunSkeleton />}>
          <Live params={params} />
        </Suspense>
      </div>
    </section>

    <Footer stacked />
  </main>
);
