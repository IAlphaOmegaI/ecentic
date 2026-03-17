"use client";

import ImagePrimitive from "next/image";
import type { ComponentPropsWithRef, JSX } from "react";

export const Image = (props: Image.Props): JSX.Element => {
  return (
    <ImagePrimitive
      {...props}
      onError={(event) => {
        props.onError?.(event);
        if (event.currentTarget.src === "/images/placeholder.svg") return;
        event.currentTarget.src = "/images/placeholder.svg";
      }}
    />
  );
};

export namespace Image {
  export type Props = ComponentPropsWithRef<typeof ImagePrimitive>;
}
