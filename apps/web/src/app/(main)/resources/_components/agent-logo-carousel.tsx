"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";

const agents = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Perplexity", logo: perplexity },
] as const;

const INTERVAL_MS = 2800;

export const AgentLogoCarousel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % agents.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const agent = agents[index];

  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={agent.name}
          initial={{ opacity: 0, x: 24, filter: "blur(12px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: -24, filter: "blur(12px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Image
            src={agent.logo}
            alt={agent.name}
            className="h-full w-auto max-w-full object-contain"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
