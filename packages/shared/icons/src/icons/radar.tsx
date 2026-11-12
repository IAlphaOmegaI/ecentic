import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · radar · outline-duo · 18px.
// Adapted from RadarOutlineDuo18; original geometry and soft layers retained.
export const RadarIcon = ({
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.1265 3.87347C12.8145 2.56148 11.002 1.75 9 1.75C4.99594 1.75 1.75 4.99594 1.75 9C1.75 13.0041 4.99594 16.25 9 16.25C13.0041 16.25 16.25 13.0041 16.25 9C16.25 8.43687 16.0713 5.75897 15.2597 5.92379L12.1797 9C12.1797 11.0711 11.0711 12.75 9 12.75C6.92893 12.75 5.25 11.0711 5.25 9C5.25 6.92893 6.92893 5.25 9 5.25C10.0355 5.25 10.973 5.66973 11.6516 6.34834L14.1265 3.87347Z"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M15.7897 6.45261C16.087 7.24511 16.25 8.1035 16.25 9C16.25 13.004 13.004 16.25 9 16.25C4.996 16.25 1.75 13.004 1.75 9C1.75 4.996 4.996 1.75 9 1.75C11.002 1.75 12.815 2.56099 14.127 3.87299"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 8.99997L14.869 3.13098"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 2.75V1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M15.25 9H17"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M9 15.25V17"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M2.75 9H1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.7129 9.5296C12.4556 11.3499 10.8913 12.75 9 12.75C6.9289 12.75 5.25 11.0711 5.25 9C5.25 6.9289 6.9289 5.25 9 5.25C10.0355 5.25 10.973 5.6697 11.6516 6.3483"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
