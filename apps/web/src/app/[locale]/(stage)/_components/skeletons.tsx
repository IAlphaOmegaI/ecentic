export const StageSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex h-full flex-col gap-[3vh] p-[clamp(1.5rem,4vw,5rem)]"
  >
    <div className="h-[4vh] w-[30vw] rounded bg-accent-foreground" />
    <div className="h-[28vh] w-[70vw] rounded bg-accent-foreground" />
    <div className="h-[7vh] w-[60vw] rounded bg-accent-foreground" />
    <div className="h-[7vh] w-[60vw] rounded bg-accent-foreground" />
    <div className="h-[7vh] w-[35vw] rounded bg-accent-foreground" />
  </div>
);

export const BoardSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex h-full flex-col gap-[4vh] p-[clamp(1.5rem,4vw,5rem)]"
  >
    <div className="h-[18vh] w-[80vw] rounded bg-accent-foreground" />
    <div className="flex min-h-0 flex-1 gap-[4vw]">
      <div className="aspect-square h-[50vh] rounded-lg bg-accent-foreground" />
      <div className="flex flex-1 flex-col gap-[2vh]">
        <div className="h-[8vh] rounded bg-accent-foreground" />
        <div className="h-[8vh] rounded bg-accent-foreground" />
        <div className="h-[8vh] rounded bg-accent-foreground" />
      </div>
    </div>
  </div>
);
