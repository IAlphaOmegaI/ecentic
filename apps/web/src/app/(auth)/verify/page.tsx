import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";
import { VerifyForm } from "./_components/verify-form";

const brandPoints = [
  "Check your spam folder if you don't see it",
  "The code expires in 10 minutes",
  "Each code can only be used once",
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
            One step
            <br />
            away.
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

        <div className="mb-8 text-center">
          <h2 className="font-medium text-2xl text-foreground">
            Verify your email
          </h2>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            We sent a 6-digit code to your email address.
            <br />
            Enter it below to confirm your account.
          </p>
        </div>

        <VerifyForm />

        <p className="mt-4 text-center font-light text-foreground-dimmed text-sm">
          Didn't receive a code?{" "}
          <button
            type="button"
            className="text-primary hover:underline"
          >
            Resend code
          </button>
        </p>

        <p className="mt-3 text-center font-light text-foreground-dimmed text-sm">
          Wrong email?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Go back
          </Link>
        </p>
      </div>
    </div>
  </div>
);
