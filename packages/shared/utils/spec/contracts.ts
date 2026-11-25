import { access, merge, removeUndefinedEntries } from "../src/helpers/object";
import { useAsyncAction } from "../src/hooks/use-async-action";

// Compile these consumer contracts as part of the package's test command.
const country: string = access(
  { merchant: { address: { country: "AL" } } },
  "merchant.address.country",
);
const source: { merchant?: { name: string } } = {};
const merchant: string | undefined = access(source, "merchant.name");
const key = Symbol("merchant");
const symbol: string = access({ [key]: "ecentic" }, key);
const numeric: boolean = access({ 0: false }, 0);

const settings = removeUndefinedEntries({ enabled: false, count: 0 });
const enabled: boolean = settings.enabled;
const count: number = settings.count;
const merged = merge(
  { details: { name: "ecentic", stock: 1 } },
  {
    details: { stock: 0 },
  },
);
const name: string = merged.details.name;
const stock: number = merged.details.stock;

const useConsumer = () => {
  const [run, pending] = useAsyncAction(async (value: number) => value);
  const result: Promise<number> = run(42);
  const loading: boolean = pending;
  return { result, loading };
};

void [
  country,
  merchant,
  symbol,
  numeric,
  enabled,
  count,
  name,
  stock,
  useConsumer,
];
