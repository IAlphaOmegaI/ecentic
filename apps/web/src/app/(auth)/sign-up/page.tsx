import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import { SignUpForm } from "./_components/sign-up-form";

const brandPoints = [
  "Simulate how GPT-4, Claude & Gemini pick products",
  "Diagnose exactly why agents skip yours",
  "Auto-optimize listings to win every cart",
] as const;

export default () => (
  <div className="flex h-screen">
    <div className="hidden lg:flex lg:w-1/2 sticky top-0 h-screen overflow-hidden">
      <div className="absolute inset-0 bg-primary" />
      <Image
        src="/images/onboarding-photo.png"
        alt=""
        fill
        className="object-contain object-bottom opacity-20"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
        <Image
          src="/images/wordmark.svg"
          alt="écentic"
          width={120}
          height={32}
          className="h-auto w-28 brightness-0 invert"
        />
        <div className="flex flex-1 items-end pb-2">
          <h1 className="font-medium text-6xl text-white leading-none mb-6">
            Win every
            <br />
            agent's cart.
          </h1>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {brandPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckIcon className="size-3 text-white" />
                </div>
                <p className="font-light text-sm text-white/90">{point}</p>
              </div>
            ))}
          </div>
          <p className="font-light text-sm text-white/50">
            Free to start. No credit card required.
          </p>
        </div>
      </div>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-6">
      <div className="w-full max-w-md">
        <div className="mb-8 lg:hidden">
          <Image
            src="/images/trademark.svg"
            alt="écentic"
            width={100}
            height={28}
            className="h-auto w-24"
          />
        </div>

        <div className="mb-6">
          <h2 className="font-medium text-2xl text-foreground">
            Create your account
          </h2>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Start winning agent carts in 2 minutes.
          </p>
        </div>

        <SignUpForm />

        <p className="mt-4 text-center font-light text-foreground-dimmed text-sm">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-3 text-center font-light text-foreground-dimmed text-sm">
          By creating an account you agree to our{" "}
          <span className="text-foreground">Terms of Service</span> and{" "}
          <span className="text-foreground">Privacy Policy</span>.
        </p>
      </div>
    </div>
  </div>
);
