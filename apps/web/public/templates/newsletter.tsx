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

const host = "https://ecentic.ai";

// Mirrors the landing page Button (variant "default") from
// @zenncore/web/components/button — inline styles with a solid
// background fallback because email clients drop gradients and
// can't read the app's CSS variables.
const buttons = {
  primary: {
    textDecoration: "none",
    borderRadius: "6px",
    border: "1.5px solid #1572fa",
    backgroundColor: "#1572fa",
    backgroundImage: "linear-gradient(to bottom, #5b9dff, #1572fa)",
    boxShadow: "inset 0px 1px 1px 0px rgba(255,255,255,0.7)",
  },
  neutral: {
    textDecoration: "none",
    borderRadius: "6px",
    border: "1.5px solid #e2e2e2",
    backgroundColor: "#e8e8e8",
    backgroundImage: "linear-gradient(to bottom, #ffffff, #e8e8e8)",
    boxShadow: "inset 0px 1px 1px 0px rgba(255,255,255,0.7)",
  },
} as const;

const Gutter = ({ side }: { side: "left" | "right" }) => (
  <Column
    style={{ width: "32px" }}
    className={
      side === "left"
        ? "border-background-dimmed border-r"
        : "border-background-dimmed border-l"
    }
  />
);

export namespace Newsletter {
  export type Props = {
    unsubscribeUrl?: string;
  };
}

export const Newsletter = ({
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
}: Newsletter.Props) => (
  <Html>
    <Head />
    <Preview>
      Startup deals for YC and Techstars, plus EU market entry with EU Presence
    </Preview>
    <Tailwind config={config}>
      <Body className="bg-background font-sans">
        <Container className="mx-auto my-10 max-w-[560px] border border-background-dimmed bg-background-rich">
          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
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
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Heading className="m-0 font-medium text-[32px] text-emphasis-dimmed leading-[1.2] tracking-[-0.5px]">
                  Two ways in, one agent economy
                </Heading>
                <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                  Startup deals for YC and Techstars founders, and a new
                  partnership that opens the European market.
                </Text>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Startup deals
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Y Combinator students and Techstars founders get ecentic
                  Dominate
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  We opened two partner deals: one for YC students, one for
                  Techstars founders. Both unlock extended access to ecentic
                  Dominate — continuous agent simulations across GPT-4, Claude,
                  Gemini, and Perplexity, auto-optimization with one-click
                  publish, drift alerts, and UCP generation — plus 50% off for
                  two years after the deal period.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Redemption takes about two minutes and no credit card. We
                  verify your batch or cohort against the program directory and
                  email your activation link, usually the same day. Salesforce
                  tied roughly $67 billion of Cyber Week 2025 spending to AI and
                  agents — and becoming machine-readable costs least while your
                  catalog is still small.
                </Text>
                <Button
                  className="mr-3 px-5 py-2.5 font-medium text-[15px] text-background-rich"
                  style={buttons.primary}
                  href={`${host}/yc`}
                >
                  Redeem the YC deal
                </Button>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/techstars`}
                >
                  Redeem the Techstars deal
                </Button>
                <Text className="m-0 mt-4 text-[13px] text-foreground-dimmed leading-5">
                  Full details in{" "}
                  <Link
                    href={`${host}/blog/ecentic-partner-deals-y-combinator-techstars`}
                    className="text-primary"
                  >
                    the startup deals announcement
                  </Link>
                  .
                </Text>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Partnership
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  ecentic × EU Presence: compliance and AI visibility in one
                  bundle
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  You cannot get picked by an agent in a market you are not yet
                  allowed to sell in. So we partnered with EU Presence: they
                  handle the GDPR Article 27 representative, the GPSR
                  responsible person, and a hosted privacy center — the legal
                  gate into Europe. We keep your listings winning the agent
                  comparison once you are live.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  The Compliance + AI Visibility bundle pairs all of that with
                  ecentic Dominate for $584/mo instead of $730/mo — a 20%
                  discount that saves $146 every month, on one invoice, with no
                  minimums, no setup fees, and month-to-month billing.
                </Text>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-background-rich"
                  style={buttons.primary}
                  href={`${host}/pricing`}
                >
                  See the bundle
                </Button>
                <Text className="m-0 mt-4 text-[13px] text-foreground-dimmed leading-5">
                  The full story is in{" "}
                  <Link
                    href={`${host}/blog/ecentic-eu-presence-partnership-compliance-ai-visibility-bundle`}
                    className="text-primary"
                  >
                    the partnership announcement
                  </Link>
                  .
                </Text>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section>
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-5">
                <Text className="m-0 mb-3 text-foreground-dimmed text-xs leading-[18px]">
                  ecentic — Win every agent&apos;s cart.
                </Text>
                <Text className="m-0 text-foreground-dimmed text-xs leading-[18px]">
                  You are receiving this because you have an ecentic account.{" "}
                  <Link
                    href={unsubscribeUrl}
                    className="text-foreground-dimmed underline"
                  >
                    Unsubscribe
                  </Link>
                </Text>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default Newsletter;
