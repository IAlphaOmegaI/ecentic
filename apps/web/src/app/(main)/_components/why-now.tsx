import Image from "next/image";

type Milestone = {
  brand: string;
  logo?: string;
  date: string;
  title: string;
  description: string;
};

const milestones: Milestone[] = [
  {
    brand: "Visa",
    date: "Oct 2025",
    title: "Agent payments go live",
    logo: "/images/visa.png",
    description:
      "Visa lets agents pay on a shopper's behalf — with Microsoft, Shopify, Stripe, and Worldpay.",
  },
  {
    brand: "Google",
    logo: "/images/google.svg",
    date: "NRF 2026",
    title: "Agentic shopping protocol",
    description:
      "Opened to the market with Shopify, Walmart, Target, Etsy, Visa, Mastercard, and PayPal endorsing.",
  },
  {
    brand: "Mastercard",
    date: "Live now",
    logo: "/images/mastercard.png",
    title: "Agent Pay merchant framework",
    description:
      "Agent-initiated checkout running across partner shops — payments built for AI buyers.",
  },
  {
    brand: "OpenAI",
    logo: "/images/chatgpt.svg",
    date: "Live now",
    title: "Checkout inside ChatGPT",
    description:
      "Buy without leaving the chat — Etsy, Coach, Kate Spade, Revolve, and URBN already in.",
  },
];

export const WhyNow = () => (
  <section className="border-accent-foreground border-y bg-background-dimmed">
    <div className="p-4 md:p-8">
      <div className="mb-3 flex items-center gap-2 md:mb-5">
        <span className="size-6 animate-pulse rounded-full bg-primary" />
        <span className="font-light text-primary text-xl">Why now</span>
      </div>
      <h2 className="mb-3 max-w-4xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
        Six months ago, agents couldn't buy. Now they can.
      </h2>
      <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
        This isn't a forecast. The biggest names in payments and AI shipped
        agent checkout in the last two quarters. The cart is already moving —
        the only question is whether agents pick you.
      </p>
    </div>

    <div className="grid border-accent-foreground border-t md:grid-cols-4">
      {milestones.map((milestone, index) => (
        <article
          key={milestone.brand}
          className={`flex flex-col gap-3 border-accent-foreground border-b p-4 md:border-b-0 md:p-6 ${index < milestones.length - 1 ? "md:border-r" : ""}`}
        >
          <div className="flex items-center justify-between">
            {milestone.logo ? (
              <Image
                src={milestone.logo}
                alt={milestone.brand}
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            ) : (
              <span className="font-semibold text-foreground text-xl">
                {milestone.brand}
              </span>
            )}
            <span className="border border-accent-foreground px-3 py-1 font-light text-foreground-dimmed text-xs">
              {milestone.date}
            </span>
          </div>
          <h3 className="font-medium text-foreground text-xl md:text-2xl">
            {milestone.title}
          </h3>
          <p className="font-light text-base text-foreground-dimmed">
            {milestone.description}
          </p>
        </article>
      ))}
    </div>
  </section>
);
