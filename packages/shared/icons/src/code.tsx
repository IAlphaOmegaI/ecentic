import type { JSX } from "react";
import type { IconProps } from "./types";

export const CodeIcon = ({ title, ...props }: IconProps): JSX.Element => {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      strokeWidth="1.5"
      {...props}
    >
      {title && <title>{title}</title>}
      <g fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M5.78033 4.96967C6.07322 5.26256 6.07322 5.73744 5.78033 6.03033L2.81066 9L5.78033 11.9697C6.07322 12.2626 6.07322 12.7374 5.78033 13.0303C5.48744 13.3232 5.01256 13.3232 4.71967 13.0303L1.21967 9.53033C0.926777 9.23744 0.926777 8.76256 1.21967 8.46967L4.71967 4.96967C5.01256 4.67678 5.48744 4.67678 5.78033 4.96967Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M12.2197 4.96967C12.5126 4.67678 12.9874 4.67678 13.2803 4.96967L16.7803 8.46967C17.0732 8.76256 17.0732 9.23744 16.7803 9.53033L13.2803 13.0303C12.9874 13.3232 12.5126 13.3232 12.2197 13.0303C11.9268 12.7374 11.9268 12.2626 12.2197 11.9697L15.1893 9L12.2197 6.03033C11.9268 5.73744 11.9268 5.26256 12.2197 4.96967Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M10.675 2.0207C11.0778 2.11736 11.3259 2.52224 11.2293 2.92502L8.22928 15.425C8.13261 15.8278 7.72773 16.0759 7.32496 15.9793C6.92218 15.8826 6.67403 15.4777 6.7707 15.075L9.7707 2.57496C9.86736 2.17218 10.2722 1.92403 10.675 2.0207Z" fill="currentColor" fillOpacity=".4"></path></g>
    </svg>
  );
}; 