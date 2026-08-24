"use client";

import { ChevronRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export const ProductThumb = ({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) => (
  <Avatar
    className={cn("size-8 shrink-0 rounded-md bg-background-dimmed", className)}
  >
    <AvatarImage src={src ?? "/images/fallback.png"} alt={alt} />
    <AvatarFallback className="relative">
      <Image src="/images/fallback.png" alt="" fill />
    </AvatarFallback>
  </Avatar>
);

export const AffectedProductsTable = ({
  store,
  products,
  header,
}: AffectedProductsTable.Props) => (
  <div className="mt-2 max-h-64 overflow-auto border border-accent-foreground">
    <Table className="table-fixed border-b-0">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 bg-background-rich">
            {header}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id} className="hover:bg-background">
            <TableCell className="overflow-hidden py-2">
              <Link
                href={`/dashboard/${store}/products/${product.id}`}
                className="group flex min-w-0 items-center gap-2"
              >
                <ProductThumb src={product.image} alt={product.title} />
                <span className="min-w-0 truncate font-medium text-foreground-rich transition-colors group-hover:text-primary">
                  {product.title}
                </span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export const AffectedProductsDisclosure = ({
  store,
  products,
  header,
  trigger,
}: AffectedProductsTable.Props & { trigger: string }) => (
  <Collapsible className="group w-full">
    <CollapsibleTrigger className="flex w-fit cursor-pointer items-center gap-1 font-medium text-primary-text text-sm underline-offset-2 hover:underline">
      <ChevronRightIcon
        aria-hidden
        className="size-3.5 transition-transform group-data-open:rotate-90"
      />
      {trigger}
    </CollapsibleTrigger>
    <CollapsiblePanel className="justify-start bg-transparent">
      <AffectedProductsTable
        store={store}
        products={products}
        header={header}
      />
    </CollapsiblePanel>
  </Collapsible>
);

export namespace AffectedProductsTable {
  export type Product = {
    id: string;
    title: string;
    image: string | null;
  };

  export type Props = {
    store: string;
    products: Product[];
    header: string;
  };
}
