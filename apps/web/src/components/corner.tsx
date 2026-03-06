import { cn } from "@zenncore/utils";

export namespace Corner {
  export type Props = {
    className?: string;
  };
}
export const Corner = ({ className }: Corner.Props) => {
  return (
    <div className={cn("absolute relative size-8", className)}>
      <div className="absolute top-1/2 left-1/2 size-full h-full w-px -translate-x-1/2 -translate-y-1/2 bg-accent" />
      <div className="absolute top-1/2 left-1/2 size-full h-full w-px -translate-x-1/2 -translate-y-1/2 rotate-90 bg-accent" />
    </div>
  );
};
