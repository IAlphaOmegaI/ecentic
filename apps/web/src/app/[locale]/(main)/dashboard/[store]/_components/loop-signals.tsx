import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Signals from "@/server/app/integration/loop/signal-actions";
import { Environment } from "@/server/utils/environment";
import { LoopReturnSignals } from "./loop-return-signals";

export const LoopSignals = async ({
  params,
  queue = false,
  standalone = false,
}: {
  params: Promise<{ store: string; id?: string }>;
  queue?: boolean;
  standalone?: boolean;
}) => {
  await connection();
  const { store, id: product } = await params;
  const result = await Signals.getSignals(Environment.SERVER, {
    store,
    product,
  });
  if (!result.success) {
    const translate = await getTranslations("dashboard.loop");
    return (
      <p
        role="status"
        className="px-4 py-6 text-foreground-dimmed text-sm sm:px-6"
      >
        {translate("unavailable")}
      </p>
    );
  }
  if (
    standalone &&
    !result.data.connected &&
    result.data.signals.length === 0
  ) {
    const translate = await getTranslations("dashboard.loop");
    return (
      <div className="px-4 py-6 sm:px-6">
        <p className="text-foreground-dimmed text-sm">
          {translate("status.not_connected")}
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-3 inline-block font-medium text-primary text-sm"
        >
          {translate("setupTitle")}
        </Link>
      </div>
    );
  }
  return (
    <LoopReturnSignals
      store={store}
      product={product}
      data={result.data}
      queue={queue}
      standalone={standalone}
    />
  );
};

export const LoopSignalsSkeleton = () => (
  <div
    aria-hidden
    className="h-28 animate-pulse border-accent-foreground border-t bg-background-dimmed motion-reduce:animate-none"
  />
);
