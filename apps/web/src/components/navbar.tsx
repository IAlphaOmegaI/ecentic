import { ArrowRightIcon } from "@zenncore/icons";
import Image from "next/image";
import Link from "next/link";

export const Navbar = () => (
  <nav className="fixed inset-x-0 top-0 right-0 left-0 z-50 flex items-center justify-between">
    <div className="absolute inset-x-0 top-0 h-[6px] w-full bg-background" />
    <div className="relative shrink-0 p-2 pt-3 pl-4 pr-12">
      <Image
        src="/images/left-menu.svg"
        alt="écentic"
        fill
        className="absolute inset-0 object-cover"
      />
      <Image
        src="/images/trademark.svg"
        alt="écentic"
        width={100}
        height={100}
        className="h-auto w-22 md:w-30 relative z-100 -mt-1.5"
      />
    </div>

    <div className="relative shrink-0 p-2 pl-10 pr-4">
      <Image
        src="/images/right-menu.svg"
        alt="écentic"
        fill
        className="absolute inset-0 object-cover"
      />
      <Link
        href="/sign-up"
        className="font-light text-primary text-xl relative z-100 flex  gap-2 flex items-center cursor-pointer group"
      >
        Get Started{" "}
        <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    </div>
  </nav>
);
