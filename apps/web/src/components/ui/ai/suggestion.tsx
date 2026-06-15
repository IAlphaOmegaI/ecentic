"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea
    className="w-full overflow-x-auto whitespace-nowrap"
    classList={{ scrollBar: { root: "hidden" } }}
    {...props}
  >
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      {children}
    </div>
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4", className)}
      color="neutral"
      onClick={handleClick}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
