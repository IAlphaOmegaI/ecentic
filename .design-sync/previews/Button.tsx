import { Button } from "@zenncore/web";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
  >
    {children}
  </div>
);

export const Variants = () => (
  <Row>
    <Button variant="default" color="primary">
      Run simulation
    </Button>
    <Button variant="soft" color="primary">
      Optimize listing
    </Button>
    <Button variant="outline" color="primary">
      View report
    </Button>
    <Button variant="ghost" color="primary">
      Cancel
    </Button>
    <Button variant="flat" color="primary">
      Add competitor
    </Button>
  </Row>
);

export const Colors = () => (
  <Row>
    <Button color="primary">Primary</Button>
    <Button color="secondary">Secondary</Button>
    <Button color="success">Success</Button>
    <Button color="warning">Warning</Button>
    <Button color="error">Error</Button>
    <Button color="info">Info</Button>
    <Button color="neutral">Neutral</Button>
  </Row>
);

export const Soft = () => (
  <Row>
    <Button variant="soft" color="primary">
      Winning
    </Button>
    <Button variant="soft" color="success">
      Approved
    </Button>
    <Button variant="soft" color="warning">
      At risk
    </Button>
    <Button variant="soft" color="error">
      Losing
    </Button>
  </Row>
);

export const Disabled = () => (
  <Row>
    <Button disabled>Add to Cart — $139</Button>
    <Button variant="soft" color="primary" disabled>
      Processing…
    </Button>
  </Row>
);
