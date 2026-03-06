import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Logo from "@/public/images/footer.png";
import WordMark from "@/public/images/wordmark.svg";

export const Footer = () => (
  <section className="relative -left-[calc(50vw-50%)] w-screen p-1 h-screen">
    <div className="h-full overflow-hidden rounded-xl border-accent-foreground border-y bg-linear-to-t from-primary to-primary/20">
      <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 p-6 pb-0 md:gap-12 md:p-12 md:pb-0">
        <Image src={WordMark} alt="WordMark" className="w-46" />
        <p className="text-center font-light text-2xl text-foreground md:text-4xl">
          The next era of commerce isn't about who ranks #1 on Google. <br />
          <span className="font-medium text-primary">
            It's about who gets picked by the agent.
          </span>
        </p>
        <Button
          variant="flat"
          color="primary"
          type="button"
          className="px-12 py-4 font-medium text-xl"
        >
          Get your free Win Rate Report
        </Button>
        <div className="relative w-full flex-1">
          <Image
            src={Logo}
            alt="Logo"
            fill
            className="object-contain object-bottom"
          />
        </div>
      </div>
    </div>
  </section>
);
