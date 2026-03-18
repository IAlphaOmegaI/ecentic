import { mergeProps, useRender } from "@base-ui/react";
import { cn } from "@zenncore/utils";
import type { JSX } from "react";
import type { RenderComponentProps } from "../utils/types/render-component-props";

export const Table = ({
  render,
  className,
  ...props
}: Table.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "table",
    render,
    props: mergeProps<"table">(props, {
      className: cn(
        "w-full max-w-full caption-bottom overflow-hidden text-sm border-collapse",
        className,
      ),
    }),
  });

  return element;
};
export namespace Table {
  export type Props = RenderComponentProps<"table">;
}

export const TableHeader = ({
  render,
  className,
  ...props
}: TableHeader.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "thead",
    render,
    props: mergeProps<"thead">(props, {
      className: cn(
        "[&_tr]:!bg-transparent overflow-hidden [&_tr]:border-b-accent-foreground",
        className,
      ),
    }),
  });

  return element;
};
export namespace TableHeader {
  export type Props = RenderComponentProps<"thead">;
}

export const TableBody = ({
  render,
  className,
  ...props
}: TableBody.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "tbody",
    render,
    props: mergeProps<"tbody">(props, {
      className,
    }),
  });

  return element;
};
export namespace TableBody {
  export type Props = RenderComponentProps<"tbody">;
}

export const TableRow = ({
  render,
  className,
  ...props
}: TableRow.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "tr",
    render,
    props: mergeProps<"tr">(props, {
      className: cn(
        "border-accent-foreground border-b transition-colors",
        className,
      ),
    }),
  });

  return element;
};
export namespace TableRow {
  export type Props = RenderComponentProps<"tr">;
}

export const TableHead = ({
  render,
  className,
  ...props
}: TableHead.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "th",
    render,
    props: mergeProps<"th">(props, {
      className: cn(
        "whitespace-nowrap bg-accent-foreground/30 p-4 font-light text-center text-lg text-foreground-dimmed [&:has([role=checkbox])]:pr-0 border-x border-accent-foreground",
        className,
      ),
    }),
  });

  return element;
};
export namespace TableHead {
  export type Props = RenderComponentProps<"th">;
}

export const TableCell = ({
  render,
  className,
  ...props
}: TableCell.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "td",
    render,
    props: mergeProps<"td">(props, {
      className: cn(
        "h-12 px-4 py-2 align-middle [&:has([role=checkbox])]:pr-0 border-x border-accent-foreground",
        className,
      ),
    }),
  });

  return element;
};
export namespace TableCell {
  export type Props = RenderComponentProps<"td">;
}

export const TableFooter = ({
  render,
  className,
  ...props
}: TableFooter.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "tfoot",
    render,
    props: mergeProps<"tfoot">(props, {
      className: cn("border-t bg-background-dimmed/50 font-medium", className),
    }),
  });

  return element;
};
export namespace TableFooter {
  export type Props = RenderComponentProps<"tfoot">;
}

export const TableCaption = ({
  render,
  className,
  ...props
}: TableCaption.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "caption",
    render,
    props: mergeProps<"caption">(props, {
      className: cn("mt-4 text-foreground-dimmed text-sm", className),
    }),
  });

  return element;
};
export namespace TableCaption {
  export type Props = RenderComponentProps<"caption">;
}
