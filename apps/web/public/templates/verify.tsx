import {
  Body,
  Button,
  Container,
  Head,
  Heading,
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

const origin =
  process.env.NODE_ENV === "production"
    ? "/static"
    : `${process.env.APP_HOST}/_next/static`;

export const VerifyEmail = ({
  verificationUrl,
  userEmail,
}: VerifyEmail.Props) => (
  <Html>
    <Head />
    <Preview>Verify your email to start using ecentic</Preview>
    <Tailwind config={config}>
      <Body className="bg-background font-sans">
        <Container className="mx-auto my-10 max-w-[560px] border border-background-dimmed bg-background-rich">
          <Section className="border-background-dimmed border-b px-8">
            <div className="border-background-dimmed border-x px-6 py-5">
              <Img
                src={`${origin}/images/trademark.png`}
                alt="ecentic"
                width={100}
                height={28}
              />
            </div>
          </Section>

          <Section className="border-background-dimmed border-b px-8">
            <div className="border-background-dimmed border-x px-6 py-6">
              <Heading className="m-0 font-medium text-[32px] text-emphasis-dimmed leading-[1.2] tracking-[-0.5px]">
                Verify your email
              </Heading>
              <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                Start optimizing your listings for AI shopping agents.
              </Text>
            </div>
          </Section>

          <Section className="border-background-dimmed border-b px-8">
            <div className="border-background-dimmed border-x px-6 py-6">
              <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                Thanks for creating your ecentic account. Click the button below
                to verify your email address.
              </Text>
              <Text className="m-0 mb-6 text-[13px] text-foreground-dimmed leading-5">
                This verification was requested for {userEmail}.
              </Text>
              <Button
                className="bg-primary px-6 py-3 font-medium text-[15px] text-background-rich"
                style={{ textDecoration: "none" }}
                href={verificationUrl}
              >
                Verify email address
              </Button>
            </div>
          </Section>

          <Section className="border-background-dimmed border-b px-8">
            <div className="border-background-dimmed border-x px-6 py-5">
              <Text className="m-0 mb-3 text-foreground-dimmed text-xs leading-[18px]">
                If you didn&apos;t create an account on ecentic, you can safely
                ignore this email.
              </Text>
              <Text className="m-0 text-foreground-dimmed text-xs leading-[18px]">
                Or copy and paste this link into your browser:{" "}
                <Link
                  href={verificationUrl}
                  className="text-primary"
                  style={{ overflowWrap: "break-word" }}
                >
                  {verificationUrl}
                </Link>
              </Text>
            </div>
          </Section>

          <Section className="px-8">
            <div className="border-background-dimmed border-x px-6 py-5">
              <Text className="m-0 text-foreground-dimmed text-xs leading-[18px]">
                ecentic — Win every agent&apos;s cart.
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
