import Image from "next/image";
import Background from "@/public/images/background.png";

export const Hero = () => (
  <div className="relative -left-[calc(50vw-50%)] -z-1 h-screen w-screen p-3">
    <section className="relative flex size-full items-center justify-center overflow-hidden rounded-xl bg-primary">
      <Image src={Background} alt="Hero" className="size-full" />
      <div className="absolute bottom-6 left-6 flex max-w-[800px] flex-col gap-2 text-white md:bottom-12 md:left-12">
        <h1 className="font-semibold text-4xl sm:text-5xl md:text-[76px]">
          Win every agent's cart.
        </h1>
        <p className="text-sm sm:text-base md:text-2xl">
          écentic simulates how AI shopping agents choose between your products
          and competitors then automatically rewrites your listings to get
          picked first. Not monitoring. Not auditing. Autonomous optimization.
        </p>
      </div>
    </section>
  </div>
);
