import { StarHandIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import * as motion from "motion/react-client";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Plus } from "@/components/plus";
import { Reveal } from "@/components/reveal";
import { Stagger } from "@/lib/animations";

const testimonialKeys = ["sarah", "marcus", "priya"] as const;
const ratings = { sarah: 5, marcus: 5, priya: 4 } as const;

const stars = [1, 2, 3, 4, 5] as const;

export const getTestimonialData = async (locale: Locale) => {
  const translate = await getTranslations({ locale, namespace: "home" });
  const testimonials = testimonialKeys.map((key) => ({
    key,
    name: translate(`testimonials.items.${key}.name`),
    role: translate(`testimonials.items.${key}.role`),
    company: translate(`testimonials.items.${key}.company`),
    rating: ratings[key],
    text: translate(`testimonials.items.${key}.text`),
  }));

  const aggregateRating = {
    ratingValue:
      testimonials.reduce((sum, testimonial) => sum + testimonial.rating, 0) /
      testimonials.length,
    ratingCount: testimonials.length,
    bestRating: 5,
    worstRating: 1,
  };

  const reviewSchemas = testimonials.map((testimonial) => ({
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

  return { testimonials, aggregateRating, reviewSchemas };
};

const Stars = ({
  count,
  className,
  ariaLabel,
}: {
  count: number;
  className?: string;
  ariaLabel: string;
}) => (
  <div
    role="img"
    className={cn("flex gap-0.5 text-primary", className)}
    aria-label={ariaLabel}
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

export const Testimonials = async ({ locale }: Testimonials.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });
  const { testimonials, aggregateRating } = await getTestimonialData(locale);

  return (
    <section className="relative -left-[calc(50vw-50%)] -z-1 w-screen">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-y">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="relative mx-auto flex flex-col items-center justify-between gap-4 p-6 md:flex-row md:items-start md:p-12">
          <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
            {translate("testimonials.title")}
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
              key={testimonial.key}
              className="relative flex flex-col gap-4 bg-background p-6 md:p-8"
            >
              {index < testimonials.length - 1 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
              )}
              {index < testimonials.length - 1 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
              )}
              <Stars
                count={testimonial.rating}
                ariaLabel={translate("testimonials.starsAria", {
                  count: testimonial.rating,
                })}
              />
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
};

export namespace Testimonials {
  export type Props = {
    locale: Locale;
  };
}
