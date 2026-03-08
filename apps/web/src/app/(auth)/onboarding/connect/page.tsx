import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { ConnectForm } from "./_components/connect-form";
import { Motion } from "@/components/motion";

export default () => (
  <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
    <Motion.Stagger stagger={0.08} delay={0.1}>
      <Motion.Item>
        <h2 className="font-medium text-4xl text-foreground">
          Create your account
        </h2>
      </Motion.Item>
      <Motion.Item>
        <p className="mt-1 font-light text-foreground-dimmed text-lg">
          Start winning agent carts in 2 minutes.
        </p>
      </Motion.Item>
      <Motion.Item>
        <ConnectForm className="mt-4" />
      </Motion.Item>
    </Motion.Stagger>

    <div className="mt-6 flex w-full items-center justify-between">
      <Button
        variant="ghost"
        color="neutral"
        type="button"
        render={<Link href="/onboarding/select-products" />}
      >
        Skip for now
      </Button>
      <p className="font-light text-foreground-dimmed">
        You can connect more stores later in Settings.
      </p>
    </div>
  </div>
);
