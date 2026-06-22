import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web";

// Column mode: one rich, full-width cell. A competitor win-rate breakdown
// across AI shopping agents and marketplaces.
const rows = [
  { name: "AcousticPro X3", marketplace: "Amazon", gpt4: 71, claude: 68, win: 69 },
  { name: "SoundForge Studio", marketplace: "Shopify", gpt4: 54, claude: 49, win: 52 },
  { name: "EchoLab Mini", marketplace: "Walmart", gpt4: 38, claude: 41, win: 40 },
  { name: "PulseWave Air", marketplace: "Amazon", gpt4: 22, claude: 27, win: 25 },
];

export const CompetitorWinRates = () => (
  <div style={{ width: 560 }}>
    <Table>
      <TableCaption>Win rate vs. tracked competitors, last 7 days</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Competitor</TableHead>
          <TableHead>Marketplace</TableHead>
          <TableHead>GPT-4</TableHead>
          <TableHead>Claude</TableHead>
          <TableHead>Win Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.marketplace}</TableCell>
            <TableCell>{row.gpt4}%</TableCell>
            <TableCell>{row.claude}%</TableCell>
            <TableCell>{row.win}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Portfolio average</TableCell>
          <TableCell>3 markets</TableCell>
          <TableCell>46%</TableCell>
          <TableCell>46%</TableCell>
          <TableCell>47%</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);
