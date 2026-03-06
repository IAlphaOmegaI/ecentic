import Image from "next/image";
import Link from "next/link";

export const Navbar = () => (
  <nav className="fixed absolute inset-x-0 top-0 top-0 right-0 left-0 z-50 flex items-center justify-between">
    <div className="absolute inset-x-0 top-0 h-1 w-full bg-background" />
    <div className="notch notch-right notch-inverted relative -left-4 shrink-0 bg-background p-2 pt-3 pl-4">
      <Image
        src="/images/trademark.svg"
        alt="écentric"
        width={100}
        height={100}
        className="h-auto w-24 md:w-32"
      />
    </div>

    <div className="notch notch-right notch-inverted relative -right-6 shrink-0 bg-background p-2 px-3 pt-3 pr-6">
      <Link href={"/sign-up"} className="font-light text-primary text-xl">
        Get Started
      </Link>
    </div>
  </nav>
);
