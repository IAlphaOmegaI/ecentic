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
const cli = "https://www.npmjs.com/package/@ecentic/cli";

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
      Your optimized listings now reach Google Shopping. Plus three new reports:
      brand visibility across AI engines, an agentic readability score, and feed
      data quality.
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
                  Four new things in your dashboard
                </Heading>
                <Text className="m-0 mt-2 font-light text-[18px] text-foreground-dimmed leading-[1.4]">
                  Since the WooCommerce launch we shipped a Google Shopping
                  channel, a brand visibility report, an agentic readability
                  score, and data quality checks across your whole feed.
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
                  Channel
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Your optimized listings now reach Google Shopping
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Connect the Google account that manages your Merchant Center
                  and ecentic layers your published optimizations over the feed
                  your store already sends. Titles, descriptions, product types,
                  and custom labels come from us. Price, stock, images, and the
                  domain claim stay with your existing Google plugin, so we
                  never touch your live store data as a side effect of feed
                  work.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Google policy-checks an overridden title as if you wrote it
                  yourself, so every rewrite gets linted before it goes out. A
                  disapproval caused by our copy is the worst thing this product
                  could do to you. The dashboard reflects that honestly: you see
                  optimizing, then applied, then live on Google, rather than a
                  green tick the moment we push.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Available for Shopify today. WooCommerce is next.
                </Text>
                <Button
                  className="mr-3 px-5 py-2.5 font-medium text-[15px] text-background-rich"
                  style={buttons.primary}
                  href={`${host}/dashboard`}
                >
                  Connect Google Shopping
                </Button>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Brand
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  What the engines say about you when nobody names you
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Brand Visibility runs twenty real shopper queries through AI
                  engines and audits the answers. You get three numbers that
                  matter: how often your brand is mentioned, how often it
                  surfaces when the query never named you, and how often it
                  actually comes back when someone asks for you directly. The
                  third one being low is its own kind of bad news.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Underneath the numbers is the evidence: who won the answer
                  instead of you, which sources the engines leaned on to decide,
                  and a funnel view of where you get picked up and where you get
                  dropped. There is a crawlability check as well, covering
                  robots.txt, llms.txt, and whether the engines can reach you at
                  all. A run takes about a minute and you can walk away while it
                  works.
                </Text>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/dashboard`}
                >
                  Run a brand analysis
                </Button>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Readability
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Agentic Score: can an agent actually use your storefront?
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Visibility gets you recommended. Readability decides whether
                  the agent can then do anything about it. The new Agentic Score
                  page scores your storefront on discovery, accessibility,
                  usability, and agentic payments, and shows every check behind
                  the number with the fixes ranked by the points each one is
                  worth.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  It also replays the walk. A real agent is turned loose on your
                  store with a task to finish, and you see the steps it took,
                  what it reasoned, and how far it got. You can run the same
                  scan against your competitors' storefronts, and because each
                  domain carries its own cooldown, checking a rival never costs
                  you a scan of your own.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  The scoring is done by Is Agentic, a free public service from
                  Vercel Labs, and we show their number unchanged. We send them
                  your storefront domain. No customer or order data leaves
                  ecentic.
                </Text>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/dashboard`}
                >
                  Score this storefront
                </Button>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Catalog
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Data Quality: the feed rules every AI surface enforces
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Every active product now runs through one rule registry:
                  universal checks any AI shopping agent applies, plus platform
                  packs written against Google Merchant Center's product data
                  specification and the OpenAI product feed spec that ChatGPT
                  Shopping reads. All-caps titles, promo text where a price
                  attribute belongs, duplicate feed IDs, placeholder brands,
                  mojibake left over from a bad export.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Findings are graded by what they cost you, from outright
                  disapproval down to advisory, and the fix list is ordered by
                  how many products each fix unblocks. You start with the one
                  that clears forty listings instead of the one that clears one.
                </Text>
                <Button
                  className="px-5 py-2.5 font-medium text-[15px] text-foreground"
                  style={buttons.neutral}
                  href={`${host}/dashboard`}
                >
                  Audit the catalog
                </Button>
              </Column>
              <Gutter side="right" />
            </Row>
          </Section>

          <Section className="border-background-dimmed border-b">
            <Row>
              <Gutter side="left" />
              <Column className="px-6 py-6">
                <Text className="m-0 mb-1 font-medium text-[11px] text-primary uppercase tracking-[1px]">
                  Also shipped
                </Text>
                <Heading className="m-0 mb-3 font-medium text-[22px] text-emphasis-dimmed leading-[1.3]">
                  Smaller changes worth knowing about
                </Heading>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  Competitors now start from measured offers. Rather than
                  guessing who you compete with, we read the offers actually
                  competing for your products on Google Shopping and build the
                  roster from what is on the shelf.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  AI Discovery answers a plainer question: type a shopping query
                  and see which stores ChatGPT, Claude, Gemini, and Perplexity
                  each recommend, where you placed, and if you did not place,
                  the reason the model gave.
                </Text>
                <Text className="m-0 mb-4 text-[15px] text-foreground leading-6">
                  And there is a CLI now.{" "}
                  <Link href={cli} className="text-primary">
                    @ecentic/cli
                  </Link>{" "}
                  wraps the public API and the MCP endpoint, prints JSON on
                  stdout so it pipes into jq, and ships a sandbox that returns
                  the real response shape without an account. Nothing is stored
                  or billed, and the scores are synthetic, because the sandbox
                  never calls a model.
                </Text>
                <Text className="m-0 mt-4 text-[13px] text-foreground-dimmed leading-5">
                  Plans and what each one includes are on{" "}
                  <Link href={`${host}/pricing`} className="text-primary">
                    the pricing page
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
