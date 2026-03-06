"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  countries,
  formatPhone,
  inferPhoneCountryConfig,
  normalizePhone,
} from "@zenncore/phone";
import { type ClassList, cn } from "@zenncore/utils";
import {
  createContext,
  useControlled,
  useStableCallback,
} from "@zenncore/utils/hooks";
import {
  type ComponentProps,
  type JSX,
  type KeyboardEvent,
  type RefObject,
  useId,
  useMemo,
  useRef,
} from "react";
import { createClassName, resolveClassName } from "../utils/helpers/class-name";
import type { RenderComponentProps } from "../utils/types/render-component-props";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPositioner,
  ComboboxTrigger,
  ComboboxValue,
} from "./combobox";

type CountryConfig = (typeof countries)[number];
export type ISO = CountryConfig["iso"];

type PhoneFieldContext = {
  id: string;
  name?: string;
  significantNumber: string;
  countryConfig: CountryConfig;
  inputRef: RefObject<HTMLInputElement | null>;
  setSignificantNumber: (significantNumber: string) => void;
  setCountryConfig: (config: CountryConfig) => void;
  setPhone: (phone: string) => void;
} & PhoneField.State;

const [PhoneFieldContext, usePhoneFieldRootContext] =
  createContext<PhoneFieldContext>({
    name: "PhoneFieldRootContextProvider",
  });

export const PhoneField = ({
  render,
  id: inheritedID,
  name,
  value: inheritedValue,
  defaultValue,
  defaultCountry = "AL",
  disabled = false,
  onValueChange,
  onCountryChange,
  className,
  ...props
}: PhoneField.Props): JSX.Element => {
  const [value, setValue] = useControlled({
    controlled: inheritedValue,
    default: defaultValue,
    name: "PhoneField",
  });

  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const countryConfig =
    //TODO: inferPhoneCountryConfig bundled type is not correct (AL | DE | US)
    inferPhoneCountryConfig(value ?? "") ??
    // biome-ignore lint/style/noNonNullAssertion: guaranteed to be in options
    countries.find((country) => country.iso === defaultCountry)!;

  const formattedSignificantNumber = formatPhone(value ?? "", countryConfig.iso)
    .replace(countryConfig.prefix, "")
    .trim();

  const handleValueChange = useStableCallback((updatedValue: string) => {
    setValue(updatedValue);
    onValueChange?.(updatedValue);
  });

  const handleSignificantNumberChange = useStableCallback(
    (updatedSignificantNumber: string) => {
      const normalizedNumber = normalizePhone(updatedSignificantNumber);
      //TODO: input shouldn't exceed the maximum length of the country national number
      handleValueChange(`${countryConfig.prefix}${normalizedNumber}`);
    },
  );

  const handlePhoneChange = useStableCallback((updatedPhone: string) => {
    const normalizedPhone = normalizePhone(updatedPhone);

    const updatedCountryConfig = inferPhoneCountryConfig(normalizedPhone);

    if (!updatedCountryConfig) {
      handleValueChange(`${countryConfig.prefix}${normalizedPhone}`);
      return;
    }

    const updatedSignificantNumber = normalizedPhone.replace(
      updatedCountryConfig.prefix,
      "",
    );

    handleValueChange(
      `${updatedCountryConfig.prefix}${updatedSignificantNumber}`,
    );

    if (countryConfig.iso !== updatedCountryConfig.iso) {
      onCountryChange?.(updatedCountryConfig.iso);
    }
  });

  const handleCountryConfigChange = useStableCallback(
    (updatedCountryConfig: CountryConfig) => {
      const updatedValue = (() => {
        if (!value) return updatedCountryConfig.prefix;

        const normalizedValue = normalizePhone(value);

        return normalizedValue.startsWith(countryConfig.prefix)
          ? normalizedValue.replace(
              countryConfig.prefix,
              updatedCountryConfig.prefix,
            )
          : `${updatedCountryConfig.prefix}${normalizedValue}`;
      })();

      handleValueChange(updatedValue);

      if (updatedCountryConfig.iso !== countryConfig.iso) {
        onCountryChange?.(updatedCountryConfig.iso);
      }
      inputRef.current?.focus();
    },
  );

  const contextValue: PhoneFieldContext = useMemo(
    () => ({
      id: inheritedID ?? `zenncore-${id}`,
      name,
      significantNumber: formattedSignificantNumber,
      countryConfig,
      disabled,
      inputRef,
      setSignificantNumber: handleSignificantNumberChange,
      setPhone: handlePhoneChange,
      setCountryConfig: handleCountryConfigChange,
    }),
    [
      inheritedID,
      id,
      name,
      formattedSignificantNumber,
      countryConfig,
      disabled,
      handleSignificantNumberChange,
      handlePhoneChange,
      handleCountryConfigChange,
    ],
  );

  const state: PhoneField.State = {
    disabled,
  };

  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(props, {
      className: cn(
        "flex h-10 items-center gap-2 overflow-hidden rounded-md border border-accent-foreground px-1 py-1 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-blue-800 has-[input:focus:not(:focus-visible)]:outline-0 has-[input:focus-visible]:-outline-offset-1",
        disabled && "cursor-not-allowed opacity-50",
        resolveClassName(className, state),
      ),
    }),
    state,
  });

  return <PhoneFieldContext value={contextValue}>{element}</PhoneFieldContext>;
};
export namespace PhoneField {
  export type Props = RenderComponentProps<
    "div",
    PhoneField.State,
    {
      name?: string;
      value?: string;
      defaultValue?: string;
      defaultCountry?: ISO;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
      onCountryChange?: (country: ISO) => void;
    }
  >;
  //TODO: replace with proper state PhoneFieldState
  export type State = { disabled: boolean };
}

export const PhoneFieldInput = ({
  render,
  id: inheritedID,
  disabled: inheritedDisabled = false,
  className,
  ...props
}: PhoneFieldInput.Props): JSX.Element => {
  const {
    id,
    // name,
    significantNumber,
    setSignificantNumber,
    setPhone,
    disabled: rootDisabled,
    inputRef,
  } = usePhoneFieldRootContext();

  const disabled = rootDisabled || inheritedDisabled;

  const state: PhoneField.State = {
    disabled,
  };

  const element = useRender({
    render: render ?? <InputPrimitive />,
    ref: inputRef,
    props: mergeProps<typeof InputPrimitive>(props, {
      id: inheritedID ?? id,
      value: significantNumber,
      type: "tel",
      autoComplete: "tel",
      inputMode: "tel",
      disabled,
      className: cn("outline-0", resolveClassName(className, state)),
      onValueChange: (input: string) => {
        const isBrowserAutofill = input.includes("+");

        if (isBrowserAutofill) {
          setPhone(input);
          return;
        }

        const isEditingPhoneNumber =
          (inputRef.current?.selectionStart ?? 0) < input.length;

        if (isEditingPhoneNumber) {
          const previousCursorPosition = inputRef.current?.selectionStart ?? 0;

          requestAnimationFrame(() => {
            // this ensures that the cursor position is set after the value is updated
            // (like useEffect) but runs even if the value doesn't change
            if (!inputRef.current) return;

            inputRef.current.setSelectionRange(
              previousCursorPosition,
              previousCursorPosition,
            );
          });
        }

        setSignificantNumber(input);
      },
      onPaste: (event) => {
        console.log(event.bubbles.valueOf());
        if (disabled) return;

        const value = event.clipboardData?.getData("text/plain");

        if (value.trim()) setPhone(value);
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Backspace") return;

        const input = event.currentTarget;
        const cursorPosition = input.selectionStart ?? 0;
        const value = input.value;

        if (cursorPosition === 0) return;

        const previousChar = value[cursorPosition - 1];
        const isNonDigit = previousChar && !/\d/.test(previousChar);

        if (isNonDigit) {
          event.preventDefault();
          input.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
        }
      },
    }),
    state,
  });

  return element;
};
export namespace PhoneFieldInput {
  export type Props = RenderComponentProps<
    "input",
    PhoneField.State,
    ComponentProps<typeof InputPrimitive>,
    ComponentProps<typeof InputPrimitive>
  >;
  export type State = PhoneField.State;
}

export const PhoneFieldCountryCombobox = ({
  disabled: inheritedDisabled = false,
  // className,
  classList,
  onOpenChange,
  onValueChange,
  ...props
}: PhoneFieldCountryCombobox.Props): JSX.Element => {
  const {
    countryConfig,
    setCountryConfig,
    disabled: rootDisabled,
    inputRef,
  } = usePhoneFieldRootContext();

  const disabled = rootDisabled || inheritedDisabled;

  return (
    <Combobox
      {...props}
      items={countries}
      value={countryConfig}
      itemToStringValue={(item) => item.iso}
      itemToStringLabel={(item) => `${item.iso}+${item.prefix}`}
      disabled={disabled}
      onOpenChange={(open, event) => {
        if (open && event.reason !== "item-press") return;

        const input = inputRef.current;
        if (input) {
          input.setSelectionRange(input.value.length, input.value.length);
          input.focus();
        }

        onOpenChange?.(open, event);
      }}
      onValueChange={(value, event) => {
        setCountryConfig(value);
        onValueChange?.(value, event);
      }}
    >
      <ComboboxTrigger
        // title={countryConfig.iso}
        //TODO: extend with PhoneField.State
        className={createClassName(
          "-ml-1 min-w-20 gap-0 rounded-r-none border-0 border-accent-foreground border-r",
          classList?.trigger,
        )}
      >
        <ComboboxValue>
          {(value: CountryConfig) => `+${value.prefix}`}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxPositioner className={createClassName(classList?.positioner)}>
        <ComboboxPopup
          aria-label="Select country code"
          className={createClassName(
            "min-w-50 overflow-y-visible pb-0 [--input-container-height:2.2rem]",
            classList?.popup,
          )}
        >
          <ComboboxInput
            className={
              "mx-auto mt-1 block h-[var(--input-container-height)] w-[calc(100%-var(--spacing)*4)]"
            }
          />
          <ComboboxEmpty>No countries found</ComboboxEmpty>
          <ComboboxList
            className={createClassName(
              "max-h-[min(calc(15.2rem-var(--input-container-height)),calc(var(--available-height)-var(--input-container-height)))] overflow-y-auto overscroll-contain py-1 empty:p-0",
              classList?.list,
            )}
          >
            {(option: CountryConfig) => (
              <ComboboxItem
                key={option.iso}
                value={option}
                className={createClassName(
                  "group flex pl-8 data-selected:pl-3",
                  classList?.item?.root,
                )}
                classList={classList?.item}
              >
                {option.flag} {option.iso} {/* TODO: add classList to span  */}
                <span className="ml-auto text-foreground-dimmed group-data-highlighted:text-white/70">
                  +{option.prefix}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </ComboboxPositioner>
    </Combobox>
  );
};
export namespace PhoneFieldCountryCombobox {
  export type ClassListKey =
    // | "root"
    | "trigger"
    | "value"
    | "positioner"
    | "popup"
    | "list"
    | {
        item: ComboboxItem.ClassListKey;
      };
  export type Props = {
    disabled?: boolean;
    classList?: ClassList<ClassListKey>;
  } & ComponentProps<typeof Combobox<CountryConfig>>;
  export type State = PhoneField.State;
}

export const PhoneFieldFlag = (): JSX.Element => {
  return <>TODO PhoneFieldFlag</>;
};
