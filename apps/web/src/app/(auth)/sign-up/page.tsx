"use client";

import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const brandPoints = [
  "Simulate how GPT-4, Claude & Gemini pick products",
  "Diagnose exactly why agents skip yours",
  "Auto-optimize listings to win every cart",
] as const;

const roles = [
  "Founder / CEO",
  "Marketing Lead",
  "E-commerce Manager",
  "Agency",
  "Developer",
  "Other",
] as const;

const sources = [
  "Product Hunt",
  "Twitter / X",
  "LinkedIn",
  "Google Search",
  "Shopify App Store",
  "Friend / Colleague",
  "Newsletter",
  "Podcast",
  "Other",
] as const;

export default () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => router.push("/onboarding/connect"), 800);
  };

  return (
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
                <p className="font-light text-white/90 text-sm">{point}</p>
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

          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-background-rich px-4 py-2.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
            >
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 border border-accent-foreground bg-[#96BF48] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#85a83e]"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M15.337 23.979c-.5.107-1.021.021-1.393-.232L9.19 20.34c-.223-.15-.506-.173-.75-.063l-2.7 1.244c-.83.381-1.786-.105-1.786-1.003v-2.19c0-.228-.107-.44-.29-.573L1.3 15.5C.478 14.888 0 13.938 0 12.93V4.607C0 2.607 1.607 1 3.607 1h16.786C22.393 1 24 2.607 24 4.607v8.323c0 1.008-.478 1.957-1.3 2.57l-2.364 1.754c-.183.133-.29.345-.29.573v2.19c0 .897-.956 1.384-1.786 1.003l-2.7-1.244c-.244-.11-.527-.087-.75.063l-4.754 3.407c-.186.133-.41.198-.638.198l.92-.466z" />
              </svg>
              Continue with Shopify
            </button>
          </div>

          <div className="relative mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-accent-foreground" />
            <span className="font-light text-foreground-dimmed text-xs">
              or
            </span>
            <div className="h-px flex-1 bg-accent-foreground" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="fullName"
                  className="text-xs font-medium text-foreground"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="company"
                  className="text-xs font-medium text-foreground"
                >
                  Company / Brand
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  placeholder="Acme Store"
                  className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-xs font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jane@acmestore.com"
                className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-xs font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Min 8 characters"
                className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="role"
                  className="text-xs font-medium text-foreground"
                >
                  Your Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="source"
                  className="text-xs font-medium text-foreground"
                >
                  How did you hear?
                </label>
                <select
                  id="source"
                  name="source"
                  className="w-full border border-accent-foreground bg-background-rich px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="flat"
              color="primary"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 py-2.5 font-medium text-sm"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
              {!isSubmitting && <ArrowRightIcon className="size-4" />}
            </Button>
          </form>

          <p className="mt-4 text-center font-light text-foreground-dimmed text-xs">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
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
};
