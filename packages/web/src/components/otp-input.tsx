"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn, type ClassList } from "@zenncore/utils";
import { MinusIcon } from "@zenncore/icons";

export const InputOTP = ({
  className,
  classList,
  onValueChange,
  ...props
}: InputOTP.Props): React.JSX.Element => {
  return (
    <OTPInput
      onChange={onValueChange}
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        classList?.root,
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className, classList?.input)}
      {...props}
    />
  );
};

export namespace InputOTP {
  export type ClassListKey = "root" | "input";

  export type Props = React.ComponentProps<typeof OTPInput> & {
    classList?: ClassList<ClassListKey>;
    onValueChange: (value: string) => void;
  };
}

export namespace InputOTPGroup {
  export type ClassListKey = "root" | "input";

  export type Props = React.ComponentProps<"div"> & {
    classList?: ClassList<ClassListKey>;
  };
}

export const InputOTPGroup = ({
  className,
  classList,
  ...props
}: InputOTPGroup.Props): React.JSX.Element => {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
};

export namespace InputOTPSlot {
  export type Props = React.ComponentProps<"div">;
}

export const InputOTPSlot = ({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}): React.JSX.Element => {
  const context = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex items-center justify-center size-12 first:border-l border-y border-r border-accent-foreground text-base text-foreground outline-none transition-colors data-[active=true]:z-10 data-[active=true]:border-primary aria-invalid:border-error data-[active=true]:aria-invalid:border-error",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
};

export namespace InputOTPSeparator {
  export type Props = React.ComponentProps<"div">;
}

export const InputOTPSeparator = ({
  children,
  ...props
}: InputOTPSeparator.Props): React.JSX.Element => {
  return (
    <div
      data-slot="input-otp-separator"
      className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
      {...props}
    >
      {children ?? <MinusIcon />}
    </div>
  );
};
