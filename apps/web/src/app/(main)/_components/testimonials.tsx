import { cn } from "@zenncore/utils";
import { StarHandIcon } from "@zenncore/icons";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Head of Ecommerce",
    company: "Meridian Goods",
    rating: 5,
    text: "We had no idea AI agents were comparing our listings against competitors until écentic showed us the simulation. Within a week we fixed three product titles and saw a measurable lift in agent-referred traffic.",
  },
  {
    name: "Marcus Trejo",
    role: "DTC Brand Manager",
    company: "Olven Studio",
    rating: 5,
    text: "The competitor battlecards alone saved us hours of manual research. Now we know exactly which attributes to add so our products stop losing to cheaper alternatives in AI shopping results.",
  },
  {
    name: "Priya Nair",
    role: "Shopify Store Owner",
    company: "Leafwork",
    rating: 4,
    text: "I connected my store in two minutes and immediately saw which listings AI agents were ignoring. The optimization suggestions are specific and actionable — not generic SEO advice.",
  },
] as const;

export const aggregateRating = {
  ratingValue:
    testimonials.reduce((sum, testimonial) => sum + testimonial.rating, 0) /
    testimonials.length,
  ratingCount: testimonials.length,
  bestRating: 5,
  worstRating: 1,
};

export const reviewSchemas = testimonials.map((testimonial) => ({
  "@type": "Review" as const,
  author: {
    "@type": "Person" as const,
    name: testimonial.name,
  },
  reviewRating: {
    "@type": "Rating" as const,
    ratingValue: testimonial.rating,
    bestRating: 5,
    worstRating: 1,
  },
  reviewBody: testimonial.text,
}));

const stars = [1, 2, 3, 4, 5] as const;

const Stars = ({ count, className }: { count: number; className?: string }) => (
  <div
    role="img"
    className={cn("flex gap-0.5 text-primary", className)}
    aria-label={`${count} out of 5 stars`}
  >
    {stars.map((star) => (
      <span
        key={star}
        className={star <= count ? "text-primary" : "text-accent-foreground"}
        aria-hidden="true"
      >
        ★
      </span>
    ))}
  </div>
);

export const Testimonials = () => (
  <section className="relative -left-[calc(50vw-50%)] -z-1 w-screen border border-accent-foreground">
    <div className="relative mx-auto max-w-6xl p-6 md:p-12 flex flex-row justify-between">
      <h1 className="font-body text-3xl text-foreground md:text-5xl">
        Hear what they say.
      </h1>
      <div className="flex flex-col justify-center">
        <h3 className="font-semibold text-5xl text-foreground tabular-nums flex items-center gap-2">
          {aggregateRating.ratingValue.toFixed(1)} / 5{" "}
          <StarHandIcon className="size-12 text-primary" />
        </h3>
      </div>
    </div>

    <div className="mx-auto grid gap-px bg-accent-foreground md:grid-cols-3 max-w-6xl border-t border-accent-foreground">
      {testimonials.map((testimonial) => (
        <article
          key={testimonial.name}
          className="flex flex-col gap-4 bg-background p-6 md:p-8"
        >
          <Stars count={testimonial.rating} />
          <p className="flex-1 font-light text-foreground-dimmed leading-relaxed">
            &ldquo;{testimonial.text}&rdquo;
          </p>
          <div>
            <p className="font-medium text-foreground">{testimonial.name}</p>
            <p className="text-foreground-dimmed text-sm">
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </article>
      ))}
    </div>
  </section>
);
