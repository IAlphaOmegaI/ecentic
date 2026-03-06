import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Product from "@/public/images/product.png";

export const BlindSpot = () => (
  <section>
    <div className="border-accent-foreground border-y p-4 md:p-8">
      <div className="mb-3 flex items-center gap-2 md:mb-5">
        <span className="size-6 animate-pulse rounded-full bg-primary" />
        <span className="font-light text-primary text-xl">The Blind Spot</span>
      </div>
      <h2 className="mb-3 max-w-3xl font-medium text-3xl text-foreground leading-tight tracking-tight md:mb-5 md:text-6xl">
        Your products are invisible to the buyers that matter most.
      </h2>
      <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
        AI agents are already shopping for your customers. They don't see ads or
        scroll your page. They read data, compare specs, and choose in
        milliseconds. You don't know how often they pick you or how to change
        it.
      </p>
    </div>
    <div className="grid bg-background-dimmed/30 md:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-4">
        <p className="font-light text-primary text-xl">What Humans See</p>
        <Image src={Product} alt="Hero" className="w-full" />
        <div className="flex w-full flex-col">
          <h3 className="font-medium text-4xl text-foreground">
            Pro Wireless Earbuds - Light
          </h3>
          <p className="mb-4 font-light text-foreground-dimmed text-xl">
            Immerse yourself in crystal-clear sound with our award-winning
            ergonomic design. The perfect companion for your daily commute.
          </p>
          <Button
            variant="flat"
            color="primary"
            type="button"
            className="w-full p-4 font-medium text-xl"
          >
            Add to Cart - $139
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between border-accent-foreground border-t p-4 md:border-t-0 md:border-l">
        <p className="font-light text-primary text-xl">What Agents See</p>
        <p className="font-light font-mono text-foreground-dimmed text-primary text-xl">
          {"{"}
          <br />
          "product": <span className="text-green-400">"Earbuds"</span>,<br />
          "brand": <span className="text-green-400">"Pro Audio"</span>, <br />
          "price": <span className="text-amber-400">139.00</span>, <br />
          <span className="text-red-500 line-through">"battery_life"</span>:{" "}
          <span className="text-red-500">null</span>, <br />
          <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
          <br />
          <span className="text-red-500 line-through">"warranty"</span>:{" "}
          <span className="text-red-500">null</span>, <br />
          <span className="text-gray-400">{"// FATAL: Agent Rejected"}</span>{" "}
          <br />
          "description":
          <span className="text-green-400">"Immerse yourself ..."</span> <br />
          {"}"}
        </p>
        <h1 className="text-center font-light text-2xl text-red-500">
          RESULT: Dropped from consideration set. Competitor chosen due to
          explicit spec verification.
        </h1>
      </div>
    </div>
  </section>
);
