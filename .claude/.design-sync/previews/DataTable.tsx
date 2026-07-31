import {
  createColumnHelper,
  DataTable,
  DataTableProvider,
} from "@zenncore/web";

type Row = {
  _id: string;
  title: string;
  price: string;
  winRate: number;
  agent: string;
  marketplace: string;
};

const helper = createColumnHelper<Row>();

const columns = [
  helper.accessor("title", { header: "Product" }),
  helper.accessor("marketplace", { header: "Marketplace" }),
  helper.accessor("price", { header: "Price" }),
  helper.accessor("agent", { header: "Top Agent" }),
  helper.accessor("winRate", {
    header: "Win Rate",
    cell: (info) => `${info.getValue()}%`,
  }),
];

const rows: Row[] = [
  {
    _id: "1",
    title: "AcousticPro X3 Headphones",
    price: "$249.00",
    winRate: 72,
    agent: "ChatGPT",
    marketplace: "Amazon",
  },
  {
    _id: "2",
    title: "SoundForge Studio Monitor",
    price: "$389.00",
    winRate: 58,
    agent: "Claude",
    marketplace: "Shopify",
  },
  {
    _id: "3",
    title: "EchoLab Mini Speaker",
    price: "$79.99",
    winRate: 41,
    agent: "Gemini",
    marketplace: "Walmart",
  },
  {
    _id: "4",
    title: "PulseWave Air Earbuds",
    price: "$129.00",
    winRate: 33,
    agent: "Perplexity",
    marketplace: "Amazon",
  },
];

// Column mode: one full-width cell built on the TanStack-backed DataTable.
// DataTableProvider is required as the root — DataTable reads from its context.
export const ProductCatalog = () => (
  <div style={{ width: 620 }}>
    <DataTableProvider rows={rows} columns={columns} pageSize={20}>
      <DataTable />
    </DataTableProvider>
  </div>
);
