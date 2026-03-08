import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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
    <Preview>Verify your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Verify your email</Heading>
        <Text style={paragraph}>
          Thanks for signing up. Click the button below to verify your email
          address and get started.
        </Text>
        <Text style={subtext}>This link was sent to {userEmail}.</Text>
        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify email
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn&apos;t create an account, you can safely ignore this
          email.
        </Text>
        <Text style={footer}>
          Or copy and paste this link into your browser:{" "}
          <Link href={verificationUrl} style={link}>
            {verificationUrl}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const paragraph = {
  margin: "0 0 24px",
  fontSize: "16px",
  lineHeight: "24px",
  color: "#525f7f",
};

const subtext = {
  margin: "0 0 24px",
  fontSize: "14px",
  lineHeight: "20px",
  color: "#8898aa",
};

const buttonContainer = {
  margin: "24px 0",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "24px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0 0 8px",
};

const link = {
  color: "#5469d4",
  wordBreak: "break-all" as const,
};
