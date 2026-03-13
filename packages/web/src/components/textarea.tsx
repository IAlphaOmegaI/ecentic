"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@zenncore/utils";
import {
  createContext,
  useControlled,
  useStableCallback,
} from "@zenncore/utils/hooks";
import { type JSX, useId, useMemo, useRef } from "react";
import { resolveClassName } from "../utils/helpers/class-name";
import type { RenderComponentProps } from "../utils/types/render-component-props";

type TextareaContext = {
  id: string;
  value: string;
  disabled: boolean;
  setValue: (value: string) => void;
};

const [TextareaContext, useTextareaContext] = createContext<TextareaContext>({
  name: "Textarea",
});

export const Textarea = ({
  render,
  name,
  id: inheritedID,
  value: inheritedValue,
  defaultValue = "",
  disabled = false,
  className,
  onValueChange,
  ...props
}: Textarea.Props): JSX.Element => {
  const [value, setValue] = useControlled({
    controlled: inheritedValue,
    default: defaultValue,
    name: "Textarea",
  });
  const id = useId();

  const handleValueChange = useStableCallback((updatedValue: string) => {
    setValue(updatedValue);
    onValueChange?.(updatedValue);
  });

  const contextValue: TextareaContext = useMemo(
    () => ({
      id: inheritedID ?? `zenncore-${id}`,
      value,
      disabled,
      setValue: handleValueChange,
    }),
    [id, inheritedID, value, disabled, handleValueChange],
  );

  const state: Textarea.State = { disabled };

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(props, {
      className: cn(
        "flex w-full overflow-hidden border border-accent-foreground transition-colors duration-200 focus-within:border-primary",
        disabled && "cursor-not-allowed opacity-50",
        resolveClassName(className, state),
      ),
    }),
    state,
  });

  return <TextareaContext value={contextValue}>{element}</TextareaContext>;
};

export namespace Textarea {
  export type Props = {
    name?: string;
    disabled?: boolean;
  } & RenderComponentProps<
    "div",
    State,
    {
      value?: string | null;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
    }
  >;
  export type State = { disabled: boolean };
}

export const TextareaInput = ({
  render,
  id: inheritedID,
  disabled: inheritedDisabled = false,
  className,
  ...props
}: TextareaInput.Props): JSX.Element => {
  const { id, value, disabled: rootDisabled, setValue } = useTextareaContext();
  const ref = useRef<HTMLTextAreaElement>(null);

  const disabled = rootDisabled || inheritedDisabled;
  const state: Textarea.State = { disabled };

  const element = useRender({
    render: render ?? <textarea />,
    ref,
    props: mergeProps<"textarea">(props, {
      id: inheritedID ?? id,
      value: value === null ? "" : value,
      disabled,
      "aria-roledescription": "Text area",
      className: cn(
        "min-w-0 flex-1 resize-y border-0 bg-transparent px-3 py-2 text-foreground placeholder:text-foreground-dimmed/40 focus-visible:outline-0",
        resolveClassName(className, state),
      ),
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(event.target.value);
      },
    }),
    state,
  });

  return element;
};

export namespace TextareaInput {
  export type Props = RenderComponentProps<"textarea", Textarea.State>;
  export type State = Textarea.State;
}
