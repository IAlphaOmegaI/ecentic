import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · basket-shopping · outline-duo · 18px.
// Adapted from BasketShoppingOutlineDuo18; original geometry and soft layers retained.
export const CommerceBasketShoppingIcon = ({
  title,
  strokeWidth = 1.5,
  duoOpacity = 0.3,
  ...props
}: IconProps & { duoOpacity?: number | string }): JSX.Element => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 18 18"
      {...props}
    >
      {title && <title>{title}</title>}
      <path
        d="M15 6.25L14.403 13.416C14.317 14.453 13.45 15.25 12.41 15.25H5.59C4.55 15.25 3.683 14.453 3.597 13.416L3 6.25"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M4.75 6.25L7.25 1.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M13.25 6.25L10.75 1.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M15 6.25L14.403 13.416C14.317 14.453 13.45 15.25 12.41 15.25H5.59C4.55 15.25 3.683 14.453 3.597 13.416L3 6.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M1.75 6.25H16.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
