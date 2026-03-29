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
  Tailwind,
  Text,
} from "@react-email/components";

const config = {
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#f5f5f5",
          rich: "#ffffff",
          dimmed: "#e8e8e8",
        },
        foreground: {
          DEFAULT: "#474747",
          dimmed: "#919191",
        },
        emphasis: {
          DEFAULT: "#292929",
          dimmed: "#1c1c1c",
        },
        primary: {
          DEFAULT: "#1572fa",
        },
      },
    },
  },
};

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
    <Tailwind config={config}>
      <Body className="bg-background font-sans">
        <Container className="mx-auto mt-10 mb-16 max-w-[480px] border border-background-dimmed bg-background-rich p-0">
          <Section className="border-background-dimmed border-b px-8 py-6">
            <Img
              src="https://ecentic.com/images/trademark.svg"
              alt="ecentic"
              width={100}
              height={28}
            />
          </Section>

          <Heading className="m-0 mb-3 px-8 pt-8 pb-0 font-medium text-[28px] text-emphasis-dimmed leading-[1.3] tracking-[-0.5px]">
            Verify your email
          </Heading>
          <Text className="m-0 mb-5 px-8 text-[15px] text-foreground leading-6">
            Thanks for creating your ecentic account. Click the button below to
            verify your email address and start optimizing your product listings
            for AI shopping agents.
          </Text>
          <Text className="m-0 mb-6 px-8 text-[13px] text-foreground-dimmed leading-5">
            This verification was requested for {userEmail}.
          </Text>

          <Section className="px-8 pb-8">
            <Button
              className="block w-full bg-primary px-6 py-3 text-center font-medium text-[15px] text-background-rich no-underline"
              href={verificationUrl}
            >
              Verify email address
            </Button>
          </Section>

          <Hr className="m-0 border-background-dimmed" />

          <Text className="m-0 mb-2 px-8 pt-5 text-foreground-dimmed text-xs leading-[18px]">
            If you didn&apos;t create an account on ecentic, you can safely
            ignore this email.
          </Text>
          <Text className="m-0 mb-2 px-8 pt-5 text-foreground-dimmed text-xs leading-[18px]">
            Or copy and paste this link into your browser:{" "}
            <Link href={verificationUrl} className="break-all text-primary">
              {verificationUrl}
            </Link>
          </Text>

          <Hr className="m-0 border-background-dimmed" />
          <Text className="m-0 px-8 py-5 text-center text-foreground-dimmed text-xs leading-[18px]">
            ecentic — Win every agent&apos;s cart.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
