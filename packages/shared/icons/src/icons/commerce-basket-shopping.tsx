import type { JSX } from "react";
import type { IconProps } from "../types";

export const CommerceBasketShoppingIcon = ({
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
        d="M15 6.25L14.403 13.416C14.317 14.453 13.45 15.25 12.41 15.25H5.59C4.55 15.25 3.683 14.453 3.597 13.416L3 6.25"
        fill="currentColor"
        fillOpacity="0.3"
      />{" "}
      <path
        d="M4.75 6.25L7.25 1.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M13.25 6.25L10.75 1.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M15 6.25L14.403 13.416C14.317 14.453 13.45 15.25 12.41 15.25H5.59C4.55 15.25 3.683 14.453 3.597 13.416L3 6.25"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M1.75 6.25H16.25"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
