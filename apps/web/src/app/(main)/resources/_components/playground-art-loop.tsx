"use client";

import { ShoppingCartIcon, StarHandIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import chatgpt from "@/public/images/chatgpt.svg";

const QUESTION = "Find wireless earbuds under $150";
const PRODUCT_IMAGE = "/images/products/apple-airpods-pro.jpg";

const ease = [0.22, 1, 0.36, 1] as const;

type Phase = "idle" | "typing" | "thinking" | "answer" | "cart";

const useAgentLoop = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questionText, setQuestionText] = useState("");

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      setPhase("idle");
      setQuestionText("");

      let time = 700;
      timeouts.push(setTimeout(() => setPhase("typing"), time));

      for (let index = 1; index <= QUESTION.length; index++) {
        const captured = index;
        timeouts.push(
          setTimeout(() => setQuestionText(QUESTION.slice(0, captured)), time),
        );
        time += 26;
      }

      timeouts.push(setTimeout(() => setPhase("thinking"), time));
      time += 1400;
      timeouts.push(setTimeout(() => setPhase("answer"), time));
      time += 2200;
      timeouts.push(setTimeout(() => setPhase("cart"), time));
      time += 2800;
      timeouts.push(setTimeout(run, time));
    };

    run();

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, []);

  return { phase, questionText };
};

export const PlaygroundArt = ({ className }: PlaygroundArt.Props) => {
  const { phase, questionText } = useAgentLoop();
  const showQuestion = phase !== "idle";
  const showCursor = phase === "typing";
  const showThinking = phase === "thinking";
  const showProduct = phase === "answer" || phase === "cart";
  const showCart = phase === "cart";
  const isActive = phase !== "idle" && phase !== "cart";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-64 w-full flex-col bg-background p-5 md:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-radial-[at_100%_0%] from-primary/10 to-transparent"
      />

      <div className="relative mb-4 flex items-center gap-2">
        <Image src={chatgpt} alt="" className="size-5" />
        <span className="font-light text-foreground-dimmed text-sm">
          Agent shopping
        </span>
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{
              duration: 1.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="size-1.5 rounded-full bg-success"
          />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-3">
        <AnimatePresence>
          {showQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.35, ease } }}
              transition={{ duration: 0.5, ease }}
              className="max-w-[88%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white"
            >
              {questionText}
              {showCursor && (
                <motion.span
                  className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-white"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.3, ease } }}
              transition={{ duration: 0.45, ease }}
              className="flex w-fit items-center gap-1 rounded-lg border border-accent-foreground bg-background-rich px-3 py-3"
            >
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="size-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{
                    duration: 1.1,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.18,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showProduct && (
            <motion.div
              key="product"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.4, ease } }}
              transition={{ duration: 0.55, ease }}
              className="flex gap-4 rounded-lg border border-accent-foreground bg-background-rich p-4"
            >
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-accent-foreground bg-white p-2">
                <Image
                  src={PRODUCT_IMAGE}
                  alt="Pro Wireless Earbuds"
                  width={80}
                  height={80}
                  className="size-full object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <StarHandIcon className="size-4 shrink-0 text-primary" />
                  <span className="font-medium text-foreground text-sm">
                    Pro Wireless Earbuds — $139
                  </span>
                </div>
                <p className="font-light text-foreground-dimmed text-xs leading-relaxed">
                  Lightweight fit, 32-hour battery, and multipoint pairing. Top
                  pick for the budget.
                </p>
                <span className="mt-1 w-fit rounded-full bg-primary px-3 py-1 font-medium text-white text-xs">
                  Buy now — $139
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCart && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35, ease } }}
              transition={{ duration: 0.5, ease, delay: 0.1 }}
              className="flex max-w-[90%] items-center gap-2 self-start rounded-2xl rounded-bl-sm border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-foreground"
            >
              <ShoppingCartIcon className="size-4 shrink-0 text-success" />
              <span>Added to cart · 1 item · $139.00</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export namespace PlaygroundArt {
  export type Props = {
    className?: string;
  };
}
