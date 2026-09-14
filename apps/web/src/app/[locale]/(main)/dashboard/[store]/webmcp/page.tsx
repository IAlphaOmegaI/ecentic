import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Scanner } from "@/app/[locale]/(main)/webmcp-scanner/_components/scanner";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ScannerShell } from "./_components/shell";
import { ScannerSkeleton } from "./_components/skeletons";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/webmcp">["params"];

const ConnectedScanner = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const record = await Store.resolveForUser(Environment.SERVER, { store });
  if (!record.success) notFound();
  const translate = await getTranslations("webmcpScanner.dashboard");
  return (
    <>
      <p className="border-accent-foreground border-b bg-background-rich px-6 py-4 text-foreground-dimmed text-sm sm:px-8">
        {translate("store", { name: record.data.name })}
      </p>
      <Scanner key={store} initialUrl={record.data.domain} store={store} />
    </>
  );
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/webmcp">) => (
  <ScannerShell>
    <Suspense fallback={<ScannerSkeleton />}>
      <ConnectedScanner params={params} />
    </Suspense>
  </ScannerShell>
);
