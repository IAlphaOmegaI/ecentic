"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { EyeClosedIcon, EyeIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import {
  createContext,
  useControlled,
  useStableCallback,
} from "@zenncore/utils/hooks";
import {
  type ComponentProps,
  type JSX,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import { resolveClassName } from "../utils/helpers/class-name";
import type { RenderComponentProps } from "../utils/types/render-component-props";

type InputFocusState = {
  clickTriggered: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
};

type TextFieldContext = {
  id: string;
  // name?: string;
  type: "text" | "email" | "password";
  value: string;
  disabled: boolean;
  focusState: RefObject<InputFocusState>;
  inputRef: RefObject<HTMLInputElement | null>;
  // variant?: VariantProps<typeof inputVariants>["variant"];
  setValue: (value: string) => void;
  setMasked: (masked: boolean) => void;
} & TextField.State;

const [TextFieldContext, useTextFieldContext] = createContext<TextFieldContext>(
  {
    name: "TextField",
  },
);

const INITIAL_FOCUS_STATE: InputFocusState = {
  clickTriggered: false,
  selectionStart: null,
  selectionEnd: null,
};

export const TextField = ({
  render,
  name,
  id: inheritedID,
  value: inheritedValue,
  defaultValue = "",
  disabled = false,
  // variant,
  className,
  onValueChange,
  ...props
}: TextField.Props): JSX.Element => {
  //TODO: add field state to TextField (dirty, invalid, touched, etc. ) => useFieldRootContext

  const maskedProps =
    props.type === "password"
      ? {
          masked: props.masked,
          defaultMasked: props.defaultMasked ?? true,
          onMaskChange: props.onMaskChange,
        }
      : {
          masked: false,
          defaultMasked: false,
          onMaskChange: undefined,
        };

  const { type = "text", ...elementProps } = (() => {
    if (props.type !== "password") return props;

    const { masked, defaultMasked, onMaskChange, ...rest } = props;

    return {
      ...rest,
    };
  })();

  const [value, setValue] = useControlled({
    controlled: inheritedValue,
    default: defaultValue,
    name: "TextField",
  });
  const [masked, setMasked] = useControlled({
    controlled: maskedProps.masked,
    default: maskedProps.defaultMasked,
    name: "TextField",
    state: "masked",
  });
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const focusState = useRef<InputFocusState>(INITIAL_FOCUS_STATE);

  const handleValueChange = useStableCallback((updatedValue: string) => {
    setValue(updatedValue);
    onValueChange?.(updatedValue);
  });

  const handleMaskedChange = useStableCallback((updatedMasked: boolean) => {
    setMasked(updatedMasked);
    maskedProps.onMaskChange?.(updatedMasked);
  });

  const contextValue: TextFieldContext = useMemo(
    () => ({
      id: inheritedID ?? `zenncore-${id}`,
      type,
      value,
      // variant,
      masked,
      disabled,
      inputRef,
      focusState,
      setValue: handleValueChange,
      setMasked: handleMaskedChange,
    }),
    [
      id,
      inheritedID,
      type,
      value,
      masked,
      disabled,
      handleValueChange,
      handleMaskedChange,
    ],
  );

  const state: TextField.State = { masked, disabled };

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(elementProps, {
      className: cn(
        "flex h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-accent-foreground px-2",
        disabled && "cursor-not-allowed opacity-50",
        resolveClassName(className, state),
      ),
      // ...(masked ? { "data-masked": "" } : {}),
      //  ...{
      //     [`data-${masked? "masked" : "unmasked"`]: "",
      //    }
    }),
    state,
  });

  return <TextFieldContext value={contextValue}>{element}</TextFieldContext>;
};

export namespace TextField {
  export type Props = {
    name?: string;
    disabled?: boolean;
  } & RenderComponentProps<
    // & VariantProps<typeof inputVariants>
    "div",
    State,
    {
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
    } & (
      | { type?: "text" | "email" }
      | {
          type: "password";
          masked?: boolean;
          defaultMasked?: boolean;
          onMaskChange?: (masked: boolean) => void;
        }
    )
  >;
  export type State = { masked: boolean; disabled: boolean };
}

const inputTypeProps: Record<
  TextFieldContext["type"],
  ComponentProps<typeof InputPrimitive>
> = {
  text: {},
  email: {
    type: "email",
    autoComplete: "email",
    autoCapitalize: "off",
    inputMode: "email",
    spellCheck: "false",
  },
  password: {
    type: "password",
    autoComplete: "current-password",
    autoCapitalize: "off",
    spellCheck: "false",
  },
};

export const TextFieldInput = ({
  render,
  id: inheritedID,
  disabled: inheritedDisabled = false,
  className,
  ...props
}: TextFieldInput.Props): JSX.Element => {
  const {
    id,
    type,
    value,
    masked,
    disabled: rootDisabled,
    focusState,
    inputRef,
    setValue,
    setMasked,
  } = useTextFieldContext();

  const disabled = rootDisabled || inheritedDisabled;

  const state: TextField.State = { masked, disabled };

  // biome-ignore lint/correctness/useExhaustiveDependencies: inputRef.current?.form is stable reference
  useEffect(() => {
    const form = inputRef.current?.form;

    if (type !== "password" || !form) return;

    const abortController = new AbortController();

    form.addEventListener(
      "submit",
      () => {
        // always reset the visibility on submit regardless of whether the
        // default action is prevented
        setMasked(true);
      },
      {
        signal: abortController.signal,
      },
    );
    form.addEventListener(
      "reset",
      (event) => {
        if (event.defaultPrevented) return;

        setMasked(true);
      },
      {
        signal: abortController.signal,
      },
    );

    return () => abortController.abort();
  }, [type, setMasked]);

  const element = useRender({
    render: render ?? <InputPrimitive />,
    ref: inputRef,
    props: mergeProps<typeof InputPrimitive>(inputTypeProps[type], props, {
      id: inheritedID ?? id,
      type: type === "password" ? (masked ? "password" : "text") : type,
      value: value ?? "",
      disabled,
      "aria-roledescription": "Text field",
      //TODO className: (inputState)=> resolveClassName(className,{...state,...inputState})
      className: cn(
        "h-full min-w-0 flex-1 border-0 bg-transparent text-foreground placeholder:text-foreground-dimmed/40 focus-visible:outline-0",
        // inputVariants({ variant })
        resolveClassName(className, state),
      ),
      onValueChange: setValue,
      onBlur: (event) => {
        if (type !== "password") return;

        // get the cursor position
        const { selectionStart, selectionEnd } = event.currentTarget;
        focusState.current.selectionStart = selectionStart;
        focusState.current.selectionEnd = selectionEnd;
      },
    }),
    state,
  });

  return element;
};
export namespace TextFieldInput {
  export type Props = RenderComponentProps<
    "input",
    TextField.State, //TODO: implement InputPrimitive.State
    InputPrimitive.Props,
    //include ref
    ComponentProps<typeof InputPrimitive>
  >;
  export type State = TextField.State;
}

export const TextFieldMaskToggle = ({
  render,
  type = "button",
  children,
  disabled: inheritedDisabled = false,
  "aria-label": ariaLabel,
  className,
  classList,
  ...props
}: TextFieldMaskToggle.Props): JSX.Element | null => {
  const {
    id,
    type: fieldType,
    masked,
    setMasked,
    disabled: rootDisabled,
    inputRef,
    focusState,
  } = useTextFieldContext();

  const disabled = rootDisabled || inheritedDisabled;

  const state: TextField.State = { masked, disabled };

  const element = useRender({
    enabled: fieldType === "password",
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(props, {
      children:
        children ??
        (masked ? (
          <EyeIcon className={cn("size-5", classList?.icon)} />
        ) : (
          <EyeClosedIcon className={cn("size-5", classList?.icon)} />
        )),
      type,
      disabled,
      "aria-controls": id,
      "aria-label": ariaLabel ?? `${masked ? "Show" : "Hide"} password`,
      "aria-pressed": masked,
      className: cn(
        resolveClassName(className, state),
        resolveClassName(classList?.root, state),
      ),
      onPointerDown: () => {
        if (fieldType !== "password") return;

        focusState.current.clickTriggered = true;
      },
      onPointerCancel: () => {
        if (fieldType !== "password") return;

        // reset the ref on cancellation, regardless of whether the user has
        // called preventDefault on the event
        focusState.current = INITIAL_FOCUS_STATE;
      },
      onPointerUp: () => {
        if (fieldType !== "password") return;

        // if click handler hasn't been called at this point, it may have been
        // intercepted, in which case we still want to reset our internal state
        setTimeout(() => {
          focusState.current = INITIAL_FOCUS_STATE;
        }, 50);
      },
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        setMasked(!masked);

        if (fieldType !== "password") return;

        if (event.defaultPrevented || !focusState.current.clickTriggered) {
          focusState.current = INITIAL_FOCUS_STATE;
          return;
        }

        const input = inputRef.current;

        if (!input) return;

        const { selectionStart, selectionEnd } = focusState.current;
        input.focus();

        if (selectionStart !== null || selectionEnd !== null) {
          // wait a tick so that focus has settled, then restore select position
          requestAnimationFrame(() => {
            // make sure the input still has focus (developer may have
            // programmatically moved focus elsewhere)
            if (input.ownerDocument.activeElement === input) {
              input.selectionStart = selectionStart;
              input.selectionEnd = selectionEnd;
            }
          });
        }
      },
    }),
    state,
  });

  return element;
};
export namespace TextFieldMaskToggle {
  export type ClassListKey = "root" | "icon";
  export type Props = {
    classList?: ClassList<ClassListKey>;
  } & RenderComponentProps<"button", TextField.State>;
  export type State = TextField.State;
}
