import { Avatar, AvatarFallback, AvatarImage } from "@zenncore/web";

const Cell = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      color: "var(--color-foreground)",
    }}
  >
    {children}
    <span>{label}</span>
  </div>
);

// A real image URL that resolves, exercising the AvatarImage path.
export const WithImage = () => (
  <Cell label="Store owner">
    <Avatar className="size-12">
      <AvatarImage
        src="https://i.pravatar.cc/96?img=12"
        alt="Mara Ellison"
      />
      <AvatarFallback>ME</AvatarFallback>
    </Avatar>
  </Cell>
);

// Initials fallback — no src, so the fallback renders immediately.
export const Fallback = () => (
  <Cell label="Competitor brand">
    <Avatar className="size-12">
      <AvatarFallback>AP</AvatarFallback>
    </Avatar>
  </Cell>
);

// Small square avatar as used in the product-catalog table rows.
export const ProductThumb = () => (
  <Cell label="AcousticPro X3">
    <Avatar className="size-9 rounded-md bg-background-dimmed">
      <AvatarFallback>AX</AvatarFallback>
    </Avatar>
  </Cell>
);
