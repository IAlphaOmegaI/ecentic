import Image from "next/image";
import Link from "next/link";
import { SignInForm } from "./_components/sign-in-form";

export default () => (
  <div className="flex min-h-screen">
    <div className="hidden flex-col justify-between bg-primary p-10 lg:flex lg:w-2/5">
      <Image
        src="/images/wordmark.svg"
        alt="écentic"
        width={120}
        height={32}
        className="h-auto w-28 brightness-0 invert"
      />
      <div className="flex flex-col gap-4">
        <h1 className="font-medium text-4xl text-white leading-tight">
          Welcome back.
        </h1>
        <p className="font-light text-lg text-white/80">
          Your products are waiting to win more agent carts.
        </p>
      </div>
      <p className="font-light text-sm text-white/50">
        écentic — Infrastructure for the agent economy.
      </p>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
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
            Sign in to écentic
          </h2>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Continue optimizing your product listings.
          </p>
        </div>

        <SignInForm />

        <p className="mt-4 text-center font-light text-foreground-dimmed text-xs">
          Don't have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Get started free
          </Link>
        </p>
      </div>
    </div>
  </div>
);
