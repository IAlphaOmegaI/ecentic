import { StarHandIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import * as motion from "motion/react-client";
import { Plus } from "@/components/plus";
import { Reveal } from "@/components/reveal";
import { Stagger } from "@/lib/animations";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Head of Ecommerce",
    company: "Meridian Goods",
    rating: 5,
    text: "We had no idea AI agents were comparing our listings against competitors until ecentic showed us the simulation. Within a week we fixed three product titles and saw a measurable lift in agent-referred traffic.",
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
  <section className="relative -left-[calc(50vw-50%)] -z-1 w-screen">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="relative mx-auto flex flex-col items-center justify-between gap-4 p-6 md:flex-row md:items-start md:p-12">
        <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
          Hear what they say.
        </h2>
        <div className="flex flex-col justify-center">
          <h3 className="flex items-center gap-2 font-semibold text-5xl text-foreground tabular-nums">
            {aggregateRating.ratingValue.toFixed(1)} / 5{" "}
            <StarHandIcon className="size-12 text-primary" />
          </h3>
        </div>
      </div>

      <Reveal className="relative mx-auto grid max-w-6xl gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {testimonials.map((testimonial, index) => (
          <motion.article
            variants={Stagger.Item}
            key={testimonial.name}
            className="relative flex flex-col gap-4 bg-background p-6 md:p-8"
          >
            {index < testimonials.length - 1 && (
              <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
            )}
            {index < testimonials.length - 1 && (
              <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
            )}
            <Stars count={testimonial.rating} />
            <p className="flex-1 font-light text-foreground-dimmed text-lg leading-relaxed">
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <div>
              <p className="font-medium text-foreground text-xl">
                {testimonial.name}
              </p>
              <p className="text-foreground-dimmed">
                {testimonial.role}, {testimonial.company}
              </p>
            </div>
          </motion.article>
        ))}
      </Reveal>
    </div>
  </section>
);
