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

export namespace DealApprovedEmail {
  export type Props = {
    contactName: string;
    /** The address the deal is bound to — the discount only resolves for it. */
    userEmail: string;
    /** Partner program name, e.g. "Y Combinator". */
    programName: string;
    /**
     * Tier the deal's coupon is restricted to, e.g. "Dominate", or `null` when it
     * is valid on every plan. Mirrors `DEALS[merchant].plan` — telling a founder
     * to pick one named tier is wrong for an unrestricted deal, and telling them
     * "any plan" is wrong for a restricted one, where Stripe rejects the checkout.
     */
    planName: string | null;
    signUpUrl: string;
  };
}

/**
 * Sent once a partner-deal redemption flips to `approved`. The discount is
 * resolved at checkout by matching the account's email against the redemption,
 * so the "use this exact address" instruction below is load-bearing, not
 * boilerplate — a founder who signs up with a different address silently pays
 * list price.
 *
 * Deal terms (percentage, duration) are deliberately not restated: they live in
 * the Stripe coupon, and a figure copied into an email is a figure that goes
 * stale without anyone noticing.
 */
export const DealApprovedEmail = ({
  contactName,
  userEmail,
  programName,
  planName,
  signUpUrl,
}: DealApprovedEmail.Props) => (
  <Html>
    <Head />
    <Preview>
      Your ecentic deal is approved — here is how to activate it
    </Preview>
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
                  Your plan is ready
                </Heading>
                <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                  {programName} · ecentic{planName ? ` ${planName}` : ""}
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
                  Hi {contactName}, your {programName} redemption checked out.
                  The deal is approved and sitting on your address.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Create your account using{" "}
                  <strong className="text-emphasis-dimmed">{userEmail}</strong>,
                  then{" "}
                  {planName
                    ? `choose the ${planName} plan. Your partner discount is applied automatically at checkout`
                    : "pick whichever plan fits you. Your partner discount is applied automatically at checkout, on any tier you choose"}
                  {", and there is no code to enter."}
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  There is no rush and no deadline on it. The approval stays on
                  your address, so activate it today or months from now,
                  whenever you actually have time to point it at a catalog.
                </Text>
                <Text className="m-0 mb-6 text-[13px] text-foreground-dimmed leading-5">
                  The discount is matched on your email, so signing up with a
                  different address quietly puts you on list price. Use the one
                  above.
                </Text>
                <Button
                  className="bg-primary px-6 py-3 font-medium text-[15px] text-background-rich"
                  style={{ textDecoration: "none" }}
                  href={signUpUrl}
                >
                  Create your account
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
              <Column className="px-6 py-6">
                <Text className="m-0 mb-3 text-[15px] text-emphasis-dimmed leading-6">
                  What you get
                </Text>
                <Text className="m-0 mb-2 text-[14px] text-foreground leading-5">
                  · Agent simulations across ChatGPT, Claude, Gemini, and
                  Perplexity
                </Text>
                <Text className="m-0 mb-2 text-[14px] text-foreground leading-5">
                  · Continuous simulations and one-click publish on Scale and
                  above
                </Text>
                <Text className="m-0 mb-2 text-[14px] text-foreground leading-5">
                  · Model drift alerts and UCP generation on Dominate
                </Text>
                <Text className="m-0 mb-2 text-[14px] text-foreground leading-5">
                  · Brand visibility, agentic readability, and data quality
                  reports, all shipped in the last few weeks
                </Text>
                <Text className="m-0 text-[14px] text-foreground leading-5">
                  · White-glove onboarding for your catalog
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
                <Text className="m-0 mb-3 text-foreground-dimmed text-xs leading-[18px]">
                  Questions, or want us to import your catalog for you? Just
                  reply to this email.
                </Text>
                <Text className="m-0 text-foreground-dimmed text-xs leading-[18px]">
                  <Link href="https://ecentic.ai" className="text-primary">
                    ecentic.ai
                  </Link>
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
