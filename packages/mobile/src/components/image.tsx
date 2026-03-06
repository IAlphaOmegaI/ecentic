import { Image as ImagePrimitive } from "expo-image";
import type { ComponentPropsWithRef, JSX } from "react";

export const Image = (props: Image.Props): JSX.Element => {
  return <ImagePrimitive {...props} />;
};
export namespace Image {
  export type Props = ComponentPropsWithRef<typeof ImagePrimitive>;
}
