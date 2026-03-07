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
  <div className="flex min-h-screen">
    <div className="hidden flex-col justify-between bg-primary p-10 lg:flex lg:w-2/5">
      <Image
        src="/images/wordmark.svg"
        alt="écentric"
        width={120}
        height={32}
        className="h-auto w-28 brightness-0 invert"
      />
      <div className="flex flex-col gap-8">
        <h1 className="font-medium text-4xl text-white leading-tight">
          Win every
          <br />
          agent's cart.
        </h1>
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
      </div>
      <p className="font-light text-sm text-white/50">
        Free to start. No credit card required.
      </p>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 lg:hidden">
          <Image
            src="/images/trademark.svg"
            alt="écentric"
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

        <p className="mt-4 text-center font-light text-foreground-dimmed text-xs">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-3 text-center font-light text-foreground-dimmed text-xs">
          By creating an account you agree to our{" "}
          <span className="text-foreground">Terms of Service</span> and{" "}
          <span className="text-foreground">Privacy Policy</span>.
        </p>
      </div>
    </div>
  </div>
);
