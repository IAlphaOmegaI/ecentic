import type { JSX } from "react";
import type { IconProps } from "../types";

export const CommerceCode_3Icon = ({
  title,
  ...props
}: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      <path
        d="M5.25 13.25L1.75 9L5.25 4.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.75 13.25L16.25 9L12.75 4.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M7.75 13.25L10.25 4.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
