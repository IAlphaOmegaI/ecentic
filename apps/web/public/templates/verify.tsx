import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";

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
        <Container className="mx-auto my-10 max-w-[560px] border border-background-dimmed bg-background-rich">
          <Section className="border-background-dimmed border-b">
            <Row>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-r"
              />
              <Column className="px-6 py-5">
                <Img
                  src={
                    "https://d2qswj4ah2.ufs.sh/f/9ex1yw0sdYpfYxtJKE1HV3X7bTlvR8MC2UEWZihgQFpxI6ak"
                  }
                  alt="ecentic"
                  width={100}
                  height={28}
                />
              </Column>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-l"
              />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-r"
              />
              <Column className="px-6 py-6">
                <Heading className="m-0 font-medium text-[32px] text-emphasis-dimmed leading-[1.2] tracking-[-0.5px]">
                  Verify your email
                </Heading>
                <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                  Start optimizing your listings for AI shopping agents.
                </Text>
              </Column>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-l"
              />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-r"
              />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Thanks for creating your ecentic account. Click the button
                  below to verify your email address.
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
              </Column>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-l"
              />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-r"
              />
              <Column className="px-6 py-5">
                <Text className="m-0 mb-3 text-foreground-dimmed text-xs leading-[18px]">
                  If you didn&apos;t create an account on ecentic, you can
                  safely ignore this email.
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
              </Column>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-l"
              />
            </Row>
          </Section>

          <Section>
            <Row>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-r"
              />
              <Column className="px-6 py-5">
                <Text className="m-0 text-foreground-dimmed text-xs leading-[18px]">
                  ecentic — Win every agent&apos;s cart.
                </Text>
              </Column>
              <Column
                style={{ width: "32px" }}
                className="border-background-dimmed border-l"
              />
            </Row>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
