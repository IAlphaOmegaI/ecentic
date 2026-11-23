import { describe, expect, test } from "bun:test";
import {
  Button,
  type ButtonColor,
  type ButtonVariant,
} from "@zenncore/web/components/button";
import { renderToStaticMarkup } from "react-dom/server";

const renderButton = (props: Button.Props) =>
  renderToStaticMarkup(<Button {...props}>Explore the platform</Button>);

describe("soft buttons on inverse surfaces", () => {
  test.each(["primary", "error", "neutral"] satisfies ButtonColor[])(
    "%s retains its fill while using inverse text and keyboard focus",
    (color) => {
      const markup = renderButton({ variant: "soft", color, tone: "inverse" });

      expect(markup).toContain("text-background-rich");
      expect(markup).toContain("focus-visible:ring-background-rich/80");
      expect(markup).not.toContain("focus-visible:ring-primary/15");
      expect(markup).toContain(`bg-${color}/10`);
      expect(markup).toContain(`hover:bg-${color}/20`);
      expect(markup).not.toContain(" tone=");
      expect(markup).not.toMatch(
        /text-(primary-text|error-dimmed|foreground)\b/,
      );
    },
  );

  test("the default soft button keeps its light-surface styling", () => {
    const markup = renderButton({ variant: "soft" });

    expect(markup).toContain("text-primary-text");
    expect(markup).toContain("focus-visible:ring-primary/15");
    expect(markup).not.toContain("text-background-rich");
  });

  test.each(["ghost", "outline"] satisfies ButtonVariant[])(
    "%s supports inverse actions on the charcoal shell",
    (variant) => {
      const markup = renderButton({
        variant,
        color: "neutral",
        tone: "inverse",
      });

      expect(markup).toContain("text-background-rich");
      expect(markup).toContain("border-background-rich/20");
      expect(markup).toContain("hover:bg-background-rich/15");
      expect(markup).toContain("focus-visible:ring-background-rich/40");
      expect(markup).not.toContain(" tone=");
    },
  );

  test.each(["default", "flat"] satisfies ButtonVariant[])(
    "inverse tone does not change the %s variant",
    (variant) => {
      expect(renderButton({ variant, tone: "inverse" })).toBe(
        renderButton({ variant }),
      );
    },
  );

  test("soft buttons do not create backdrop-filter layers", () => {
    expect(renderButton({ variant: "soft" })).not.toContain("backdrop-blur");
    expect(renderButton({ variant: "soft", tone: "inverse" })).not.toContain(
      "backdrop-blur",
    );
  });

  test("full width is opt-in and is not forwarded as a DOM attribute", () => {
    expect(renderButton({})).toContain("w-fit");
    const markup = renderButton({ width: "full" });
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("w-fit");
    expect(markup).not.toContain(" width=");
  });
});
