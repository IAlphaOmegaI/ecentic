import { expect, test } from "bun:test";
import { RobotIcon } from "@zenncore/icons";
import { renderToStaticMarkup } from "react-dom/server";
import { VerticalStepCycle } from "./vertical-step-cycle";

test("the server-rendered workflow tells the complete story without JavaScript", () => {
  const markup = renderToStaticMarkup(
    <VerticalStepCycle
      steps={[
        {
          icon: RobotIcon,
          title: "Connect",
          description: "Import the products from your store.",
        },
        {
          icon: RobotIcon,
          title: "Compare",
          description: "See how agents compare the products.",
        },
        {
          icon: RobotIcon,
          title: "Publish",
          description: "Publish the approved improvements.",
        },
      ]}
    />,
  );

  expect(markup).toContain("Import the products from your store.");
  expect(markup).toContain("See how agents compare the products.");
  expect(markup).toContain("Publish the approved improvements.");
  expect(markup.match(/<li\b/g)).toHaveLength(3);
  expect(markup).not.toContain('role="tab"');
  expect(markup).not.toContain('hidden=""');
});
