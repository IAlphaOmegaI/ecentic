import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import * as motion from "motion/react-client";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { Fade } from "@/lib/animations";
import { EntryChip } from "./_components/entry-chip";
import { SignUpForm } from "./_components/sign-up-form";

// A server page so the store typed into the landing hero can be read from its
// httpOnly cookie. Only that chip is dynamic — it streams in behind its own
// boundary while the rest of the page stays a static shell.
export default async () => {
  const translate = await getTranslations("signUp");
  const translateAuthChrome = await getTranslations("authChrome");
  const messages = await getMessages();

  return (
    <div className="flex h-screen overflow-hidden bg-primary">
      <Onboarding
        points={messages.signUp.sidebar.points}
        footer={translateAuthChrome("footer")}
        imageAlt={translateAuthChrome("imageAlt")}
        headline={
          <>
            {translate("sidebar.headline.primary")}
            <br />
            {translate("sidebar.headline.accent")}
          </>
        }
      />
      <motion.div
        className="flex flex-1 flex-col overflow-hidden bg-background"
        variants={Fade.Right}
        initial="hidden"
        animate="visible"
      >
        <Motion.Stagger
          stagger={0.08}
          delay={0.1}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <Motion.Item className="w-full border-accent-foreground border-b px-8">
            <div className="relative flex flex-col gap-4 border-accent-foreground border-x p-6">
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <div className="lg:hidden">
                <Image
                  src="/images/trademark.svg"
                  alt="ecentic"
                  width={100}
                  height={28}
                  className="h-auto w-24"
                  loading="eager"
                />
              </div>
              <div>
                <h2 className="font-medium text-4xl text-foreground">
                  {translate("title")}
                </h2>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  {translate("description")}
                </p>
              </div>
              <Suspense>
                <EntryChip />
              </Suspense>
            </div>
          </Motion.Item>

          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="relative h-full border-accent-foreground border-x p-6">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
              <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
              <SignUpForm />
            </div>
          </Motion.Item>
          <Motion.Item className="w-full border-accent-foreground border-b px-8">
            <div className="relative flex justify-between gap-2 border-accent-foreground border-x p-6 font-light text-foreground-dimmed">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
              <Button
                type="button"
                color="accent"
                className="flex items-center gap-2"
                render={<Link href="/sign-in" />}
              >
                {translate("action.secondary")}{" "}
                <ArrowRightIcon className="size-4" />
              </Button>
              <p className="w-1/2">
                {translate.rich("prompt.terms", {
                  termsLink: translate("prompt.termsLink"),
                  privacyLink: translate("prompt.privacyLink"),
                  terms: (chunks) => (
                    <span className="text-foreground">{chunks}</span>
                  ),
                  privacy: (chunks) => (
                    <span className="text-foreground">{chunks}</span>
                  ),
                })}
              </p>
            </div>
          </Motion.Item>
        </Motion.Stagger>
      </motion.div>
    </div>
  );
};
