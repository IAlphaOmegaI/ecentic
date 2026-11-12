import type { JSX } from "react";
import type { IconProps } from "../types";

// Nucleo UI · headphones · outline-duo · 18px.
// Adapted from HeadphonesOutlineDuo18; original geometry and soft layers retained.
export const CommerceHeadphonesIcon = ({
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
        d="M5.47259 14.75H4.0856C3.1446 14.75 2.33059 14.094 2.13059 13.174L1.79559 11.629C1.60259 10.739 2.0356 9.83 2.8486 9.42L4.1179 8.7791"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M13.8821 8.7791L15.1514 9.42C15.9644 9.83 16.3974 10.739 16.2044 11.629L15.8694 13.174C15.6694 14.094 14.8554 14.75 13.9144 14.75H12.5274"
        fill="currentColor"
        data-color="color-2"
        data-stroke="none"
        opacity={duoOpacity}
      />{" "}
      <path
        d="M5.47259 14.75H4.0856C3.1446 14.75 2.33059 14.094 2.13059 13.174L1.79559 11.629C1.60259 10.739 2.0356 9.83 2.8486 9.42L4.1179 8.7791"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M13.8821 8.7791L15.1514 9.42C15.9644 9.83 16.3974 10.739 16.2044 11.629L15.8694 13.174C15.6694 14.094 14.8554 14.75 13.9144 14.75H12.5274"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />{" "}
      <path
        d="M12.5274 14.75L13.8671 8.8451C14.5756 5.7225 12.2019 2.75 9 2.75C5.798 2.75 3.4244 5.7225 4.1329 8.8451L5.47259 14.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
