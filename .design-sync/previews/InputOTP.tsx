import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@zenncore/web";

// InputOTP is an inline grid of one-time-code slots. maxLength sets slot
// count; a controlled `value` fills the digits so they show in the card.
// onValueChange is required by the wrapper (no-op here for a static preview).
const noop = () => {};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-foreground)",
      }}
    >
      {label}
    </span>
    {children}
  </div>
);

export const SixDigit = () => (
  <Field label="Verify your store">
    <InputOTP maxLength={6} value="284913" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
);

export const Grouped = () => (
  <Field label="Confirmation code">
    <InputOTP maxLength={6} value="052" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
);

export const Empty = () => (
  <Field label="Enter the code we emailed you">
    <InputOTP maxLength={4} value="" onValueChange={noop}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  </Field>
);
