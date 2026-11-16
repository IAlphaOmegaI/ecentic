import {
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import Image from "next/image";
import { PlatformLight } from "./page-bodies/platform-light";
import { PlatformProviderStack } from "./provider-stack";

/** The graphic explains source records converging; it does not imply measurements. */
export const CatalogConnection = () => (
  <div
    aria-hidden
    className="relative isolate overflow-hidden px-7 py-8 max-sm:px-4"
    data-catalog-connection
  >
    <div className="absolute inset-0 -z-1 bg-radial-[at_50%_45%] from-primary/12 via-background-rich/30 to-transparent" />
    <PlatformProviderStack
      providers={["shopify", "woocommerce", "googleMerchant"]}
    />
    <div className="mx-auto h-7 w-px bg-primary-text/30" />
    <div className="relative mx-auto flex max-w-64 items-center justify-center overflow-hidden rounded-lg border border-primary-text/20 bg-background-rich px-8 py-5 shadow-lg shadow-primary/20">
      <Image
        src="/images/trademark.svg"
        width={1022}
        height={257}
        alt=""
        className="h-auto w-32"
      />
      <PlatformLight />
    </div>
    <div className="mx-auto h-7 w-px bg-primary-text/30" />
    <div className="relative mx-auto max-w-80 rounded-lg border border-primary-text/20 bg-background-rich shadow-sm shadow-emphasis/10">
      <div className="flex items-center gap-2 border-accent-foreground border-b px-4 py-3 font-mono text-xs">
        <CommerceCode_3Icon className="size-5 text-primary-text" />
        <span className="text-foreground">product.json</span>
      </div>
      <div className="grid grid-cols-3 gap-3 px-4 py-4 font-mono text-xs">
        <span className="text-primary-text">title</span>
        <span className="text-secondary">price</span>
        <span className="text-success-dimmed">source</span>
        <span className="h-px bg-primary-text/25" />
        <span className="h-px bg-secondary/25" />
        <span className="h-px bg-success-dimmed/25" />
      </div>
    </div>
    <div className="mx-auto mt-6 flex max-w-80 items-center justify-between gap-3 border-accent-foreground border-t pt-4 font-mono text-foreground text-xs">
      <span className="flex items-center gap-2">
        <CommerceCode_3Icon className="size-5 text-primary-text" />
        XML / JSON
      </span>
      <span className="flex items-center gap-2">
        <CommerceFilePenIcon className="size-5 text-primary-text" />
        CSV
      </span>
      <span className="flex items-center gap-2">
        <CommerceGlobePointerIcon className="size-5 text-primary-text" />
        HTTPS
      </span>
    </div>
  </div>
);
