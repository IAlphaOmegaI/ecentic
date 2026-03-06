import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import type { RenderComponentProps } from "../utils/types/render-component-props";
import { type Button, buttonVariants } from "./button";

//TODO: add state management to pagination (context)
export const Pagination = ({
  render,
  className,
  ...props
}: Pagination.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "nav",
    render,
    props: mergeProps<"nav">(props, {
      "aria-label": "pagination",
      className: cn("mx-auto flex w-full justify-center", className),
    }),
  });

  return element;
};
export namespace Pagination {
  export type Props = RenderComponentProps<"nav">;
}

export const PaginationContent = ({
  render,
  className,
  ...props
}: PaginationContent.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "ul",
    render,
    props: mergeProps<"ul">(props, {
      className: cn("flex flex-row items-center gap-1", className),
    }),
  });

  return element;
};
export namespace PaginationContent {
  export type Props = RenderComponentProps<"ul">;
}

export const PaginationItem = ({
  render,
  isActive,
  size = "icon",
  className,
  ...props
}: PaginationItem.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "li",
    render,
    props: mergeProps<"li">(props, {
      "aria-current": isActive ? "page" : undefined,
      // "data-active": isActive,
      className: cn(
        buttonVariants({
          size,
          variant: "outline",
        }),
        isActive && "!text-primary-dimmed border-primary-dimmed",
        className,
      ),
    }),
  });

  return element;
};
export namespace PaginationItem {
  export type Props = {
    isActive?: boolean;
  } & Pick<ComponentProps<typeof Button>, "size"> &
    RenderComponentProps<"li">;
}

export const PaginationLink = ({
  render,
  ...props
}: PaginationLink.Props): JSX.Element => {
  const element = useRender({
    defaultTagName: "a",
    render,
    props,
  });

  return element;
};
export namespace PaginationLink {
  export type Props = RenderComponentProps<"a">;
}

export namespace PaginationPrevious {
  export type Props = PaginationLink.Props;
}
