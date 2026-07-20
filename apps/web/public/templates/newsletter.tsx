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
const plugin = "https://wordpress.org/plugins/ecentic-for-woocommerce/";

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
      écentic for WooCommerce is live — a free plugin that lets AI shopping
      agents find your store, price a real cart, and check out.
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
                  ecentic is live on WooCommerce
                </Heading>
                <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                  A free plugin that makes your store discoverable and
                  transactable by AI shopping agents — plus a recap of last
                  issue&apos;s startup deals and EU partnership.
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
                  Launch
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  écentic for WooCommerce: let agents buy, not just browse
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  The free écentic for WooCommerce plugin is now on
                  WordPress.org. It serves the Universal Commerce Protocol at
                  /.well-known/ucp on your own domain, so AI shopping agents
                  discover your store at your address — not a third
                  party&apos;s — and can complete the purchase instead of just
                  recommending you.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Quotes run against a live WooCommerce cart, so your tax
                  tables, shipping zones, and coupons all apply. Agent
                  checkouts create real orders through native WooCommerce
                  internals, tagged created_via = ucp, and payment is charged
                  by your own gateway — you stay Merchant of Record and
                  credentials never leave your server. You keep the controls:
                  switch the agent surface on or off, allow-list which agent
                  platforms may transact, require signed (RFC 9421) requests,
                  and rate-limit per agent.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Setup takes about two minutes: install from wp-admin, approve
                  the connection, and the plugin provisions the REST key for
                  you — no keys to copy. Your theme, storefront, and checkout
                  stay untouched.
                </Text>
                <Button
                  className="mr-3 px-5 py-2.5 font-medium text-[15px] text-background-rich"
                  style={buttons.primary}
                  href={plugin}
                >
                  Get the plugin
                </Button>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/ucp-validator`}
                >
                  Check if your store is agent-ready
                </Button>
                <Text className="m-0 mt-4 text-[13px] text-foreground-dimmed leading-5">
                  Everything the plugin does — and what it never touches — is
                  on{" "}
                  <Link
                    href={`${host}/platforms/woocommerce`}
                    className="text-primary"
                  >
                    the WooCommerce page
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
                  In case you missed it
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Last issue: startup deals and a route into Europe
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Y Combinator students and Techstars founders get extended
                  access to ecentic Dominate — continuous agent simulations
                  across GPT-4, Claude, Gemini, and Perplexity, plus
                  auto-optimization — and 50% off for two years after the deal
                  period. Redemption takes about two minutes, no credit card:{" "}
                  <Link href={`${host}/yc`} className="text-primary">
                    YC deal
                  </Link>{" "}
                  ·{" "}
                  <Link href={`${host}/techstars`} className="text-primary">
                    Techstars deal
                  </Link>
                  .
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  We also partnered with EU Presence on a Compliance + AI
                  Visibility bundle: their GDPR Article 27 representative, GPSR
                  responsible person, and hosted privacy center, paired with
                  ecentic Dominate for $584/mo instead of $730/mo — one
                  invoice, no minimums, month-to-month.
                </Text>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/pricing`}
                >
                  See the bundle
                </Button>
                <Text className="m-0 mt-4 text-[13px] text-foreground-dimmed leading-5">
                  Full stories:{" "}
                  <Link
                    href={`${host}/blog/ecentic-partner-deals-y-combinator-techstars`}
                    className="text-primary"
                  >
                    the startup deals announcement
                  </Link>{" "}
                  and{" "}
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
