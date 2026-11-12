import type { JSX } from "react";
import type { IconProps } from "../types";

export const CommerceBottleWineIcon = ({
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
        d="M5.25 2.25C5.25 1.69772 5.69772 1.25 6.25 1.25H7.25C7.80228 1.25 8.25 1.69772 8.25 2.25V4.75H5.25V2.25Z"
        fill="currentColor"
        fillOpacity="0.3"
      />{" "}
      <path
        d="M7.25 9.75H2.75V13.745H7.25V9.75Z"
        fill="currentColor"
        fillOpacity="0.3"
      />{" "}
      <path
        d="M10.75 8.75H14.75L15.162 10.808C15.466 12.33 14.25 13.75 12.75 13.75C11.25 13.75 10.034 12.33 10.338 10.808L10.75 8.75Z"
        fill="currentColor"
        fillOpacity="0.3"
      />{" "}
      <path
        d="M10.75 8.75H14.75L15.162 10.808C15.466 12.33 14.25 13.75 12.75 13.75C11.25 13.75 10.034 12.33 10.338 10.808L10.75 8.75Z"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M11.25 16.75H14.25"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.75 16.75V13.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M8.25 6.75V2.25C8.25 1.698 7.802 1.25 7.25 1.25H6.25C5.698 1.25 5.25 1.698 5.25 2.25V6.75C5.25 6.75 2.75 7.188 2.75 10V15.75C2.75 16.302 3.198 16.75 3.75 16.75H8.25"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M2.75 9.75H7.25V13.75H2.75"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M5.25 4.75H8.25"
        stroke="currentColor"
        strokeWidth="var(--nucleo-stroke-width, 1.5)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
