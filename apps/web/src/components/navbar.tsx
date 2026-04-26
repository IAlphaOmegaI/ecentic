import { ArrowRightIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";

export const Navbar = () => (
  <nav className="fixed inset-x-0 top-0 right-0 left-0 z-50 flex items-center justify-between">
    <div className="absolute inset-x-0 top-0 h-[6px] w-full bg-background" />
    <div className="relative shrink-0 p-4 pt-3 pr-12 pl-4 h-8">
      <Image
        src="/images/left-menu.svg"
        alt="écentic"
        fill
        className="absolute inset-0 object-cover"
      />
      <Link href="/" aria-label="Go to the écentic homepage">
        <Image
          src="/images/trademark.svg"
          alt="écentic"
          width={100}
          height={100}
          className="relative z-100 -mt-1.5 h-auto w-32 md:w-40"
          loading="eager"
        />
      </Link>
    </div>

    <div className="relative shrink-0 p-4 pr-6 pl-12 h-8">
      <Image
        src="/images/right-menu.svg"
        alt="écentic"
        fill
        className="absolute inset-0 object-cover"
      />
      <Link
        href="/sign-up"
        className="group relative z-100 flex cursor-pointer items-center gap-2 text-primary font-header text-2xl"
      >
        Get Started{" "}
        <ArrowRightIcon className="size-6 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>
  </nav>
);
