import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export namespace VerifyEmail {
  export type Props = {
    verificationUrl: string;
    userEmail: string;
  };
}

export const VerifyEmail = ({
  verificationUrl,
  userEmail,
}: VerifyEmail.Props) => (
  <Html>
    <Head />
    <Preview>Verify your email to start using ecentic</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://ecentic.com/images/trademark.svg"
            alt="ecentic"
            width={100}
            height={28}
          />
        </Section>

        <Heading style={heading}>Verify your email</Heading>
        <Text style={paragraph}>
          Thanks for creating your ecentic account. Click the button below to
          verify your email address and start optimizing your product listings
          for AI shopping agents.
        </Text>
        <Text style={subtext}>
          This verification was requested for {userEmail}.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify email address
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          If you didn&apos;t create an account on ecentic, you can safely ignore
          this email.
        </Text>
        <Text style={footer}>
          Or copy and paste this link into your browser:{" "}
          <Link href={verificationUrl} style={link}>
            {verificationUrl}
          </Link>
        </Text>

        <Hr style={hr} />
        <Text style={brand}>
          ecentic — Win every agent's cart.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginTop: "40px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
  border: "1px solid #e4e4e7",
};

const header = {
  borderBottom: "1px solid #e4e4e7",
  padding: "24px 32px",
};

const heading = {
  fontSize: "28px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "500" as const,
  color: "#09090b",
  margin: "0 0 12px",
  padding: "32px 32px 0",
};

const paragraph = {
  margin: "0 0 20px",
  fontSize: "15px",
  lineHeight: "24px",
  color: "#71717a",
  padding: "0 32px",
};

const subtext = {
  margin: "0 0 24px",
  fontSize: "13px",
  lineHeight: "20px",
  color: "#a1a1aa",
  padding: "0 32px",
};

const buttonContainer = {
  padding: "0 32px 32px",
};

const button = {
  backgroundColor: "#1572fa",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "500" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  width: "100%",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px",
  padding: "0 32px",
  paddingTop: "20px",
};

const link = {
  color: "#1572fa",
  wordBreak: "break-all" as const,
};

const brand = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
  padding: "20px 32px",
  margin: "0",
  textAlign: "center" as const,
};
