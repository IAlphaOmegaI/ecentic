/** biome-ignore-all lint/suspicious/noTsIgnore: needed for type system */

export type PipeHead<Input extends unknown[], Output> = (
  ...args: Input
) => Output;
export type GenericPipeHead = PipeHead<never[], unknown>;

export type Pipeable<Input, Output> = (arg: Input) => Output;
export type GenericPipeable = Pipeable<never, unknown>;

export type GenericPipe = [GenericPipeHead, ...GenericPipeable[]];

type GenericPipeTail = GenericPipeable[];

type CorrectPipe<
  Tail extends GenericPipeTail,
  Accumulator extends GenericPipeTail = [],
> = Tail extends [
  Pipeable<infer FirstInput, infer FirstOutput>,
  Pipeable<infer _, infer SecondOutput>,
  ...infer LeftoverTail,
]
  ? CorrectPipe<
      LeftoverTail extends GenericPipeTail ? LeftoverTail : [],
      // @ts-ignore: the type system cannot infer the correct type for the first pipeable
      [
        ...Accumulator,
        Pipeable<FirstInput, FirstOutput>,
        Pipeable<FirstOutput, SecondOutput>,
      ]
    >
  : Tail extends [Pipeable<infer _, infer FinalOutput>]
    ? Accumulator extends [
        ...infer _,
        Pipeable<infer _BeforeFinalInput, infer BeforeFinalOutput>,
      ]
      ? [...Accumulator, Pipeable<BeforeFinalOutput, FinalOutput>]
      : Accumulator
    : Accumulator;

type Pipe<
  Head extends GenericPipeHead,
  Tail extends GenericPipeTail,
> = Head extends PipeHead<infer _, infer FirstOutput>
  ? CorrectPipe<[Pipeable<unknown, FirstOutput>, ...Tail]> extends [
      infer _,
      ...infer CorrectedTail,
    ]
    ? [Head, ...(CorrectedTail extends GenericPipeTail ? CorrectedTail : [])]
    : never
  : never;

type PipeEndOutput<F extends GenericPipe> = F extends [
  GenericPipeHead,
  ...GenericPipeable[],
  Pipeable<infer _, infer Output>,
]
  ? Output
  : never;

type PipeHeadInput<F extends GenericPipe> = F extends [
  PipeHead<infer Input, infer _>,
  ...GenericPipeable[],
]
  ? Input
  : never;

export function pipe<
  Head extends GenericPipeHead,
  Tail extends GenericPipeTail,
>(
  ...pipeables: [Head, ...Tail] extends Pipe<Head, Tail>
    ? [Head, ...Tail]
    : Pipe<Head, Tail>
) {
  return (
    ...args: PipeHeadInput<Pipe<Head, Tail>>
  ): PipeEndOutput<Pipe<Head, Tail>> => {
    return pipeables.reduce(
      // @ts-ignore: the type system cannot infer the correct type for the first pipeable
      (acc, fn) => fn(acc),
      pipeables[0](...args),
    ) as PipeEndOutput<Pipe<Head, Tail>>;
  };
}
