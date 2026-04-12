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

const Stars = ({ count }: { count: number }) => (
  <div
    role="img"
    className="flex gap-0.5 text-primary"
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
  <section>
    <div className="grid gap-6 border-accent-foreground border-y p-4 md:grid-cols-[3fr_5fr] md:p-8">
      <div>
        <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
          What merchants say
        </p>
        <h2 className="mt-3 max-w-md text-4xl text-foreground leading-tight">
          Trusted by ecommerce teams shipping real products
        </h2>
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-3">
          <span className="font-semibold text-5xl text-foreground tabular-nums">
            {aggregateRating.ratingValue.toFixed(1)}
          </span>
          <Stars count={Math.round(aggregateRating.ratingValue)} />
        </div>
        <p className="mt-1 text-foreground-dimmed">
          Based on {aggregateRating.ratingCount} merchant reviews
        </p>
      </div>
    </div>

    <div className="grid gap-px border-accent-foreground border-b bg-accent-foreground md:grid-cols-3">
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
