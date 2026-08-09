"use client";

import { SearchIcon, StarHandIcon } from "@zenncore/icons";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Plus } from "@/components/plus";

const oldResults = [
  {
    rank: "1",
    title: "Sony WH-1000XM5 Wireless",
    host: "bestbuy.com",
    rating: "4.6",
    image: "/images/products/sony-wh-1000xm5.webp",
  },
  {
    rank: "2",
    title: "Bose QuietComfort Ultra",
    host: "bose.com",
    rating: "4.5",
    image: "/images/products/bose-qc-ultra.jpg",
  },
  {
    rank: "3",
    title: "Apple AirPods Pro",
    host: "apple.com",
    rating: "4.4",
    image: "/images/products/apple-airpods-pro.jpg",
  },
];

const ANSWER_IMAGE = "/images/products/sony-wh-1000xm5.webp";

type AgentPhase = "idle" | "typing" | "wait" | "thinking" | "answer";

const useSearchLoop = (searchQuery: string) => {
  const [typed, setTyped] = useState(0);
  const [visibleResults, setVisibleResults] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      setTyped(0);
      setVisibleResults(0);

      let time = 700;
      for (let index = 1; index <= searchQuery.length; index++) {
        const captured = index;
        timeouts.push(setTimeout(() => setTyped(captured), time));
        time += 45;
      }

      time += 350;
      for (let result = 1; result <= oldResults.length; result++) {
        const captured = result;
        timeouts.push(setTimeout(() => setVisibleResults(captured), time));
        time += 380;
      }

      time += 2800;
      timeouts.push(setTimeout(run, time));
    };

    run();

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, [searchQuery]);

  return { typedText: searchQuery.slice(0, typed), visibleResults };
};

const useAgentLoop = (question: string) => {
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [questionTyped, setQuestionTyped] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      setPhase("idle");
      setQuestionTyped(0);

      let time = 700;
      timeouts.push(setTimeout(() => setPhase("typing"), time));

      for (let index = 1; index <= question.length; index++) {
        const captured = index;
        timeouts.push(setTimeout(() => setQuestionTyped(captured), time));
        time += 32;
      }

      timeouts.push(setTimeout(() => setPhase("wait"), time));
      time += 500;
      timeouts.push(setTimeout(() => setPhase("thinking"), time));
      time += 1300;
      timeouts.push(setTimeout(() => setPhase("answer"), time));
      time += 3400;
      timeouts.push(setTimeout(run, time));
    };

    run();

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, [question]);

  return { phase, questionText: question.slice(0, questionTyped) };
};

const SearchEra = ({
  searchQuery,
  label,
  resultsCount,
  summary,
}: {
  searchQuery: string;
  label: string;
  resultsCount: string;
  summary: string;
}) => {
  const { typedText, visibleResults } = useSearchLoop(searchQuery);
  const countVisible = typedText.length === searchQuery.length;

  return (
    <div className="relative flex flex-col border-accent-foreground border-b p-4 md:border-r md:border-b-0 md:p-8">
      <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
      <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
      <div className="mb-4 flex items-center gap-2 text-foreground-dimmed">
        <SearchIcon className="size-5" />
        <span className="font-light text-lg">{label}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 rounded-lg border border-accent-foreground bg-background p-4">
        <div className="flex items-center gap-2 rounded-full border border-accent-foreground px-4 py-2 text-foreground-dimmed text-sm">
          <SearchIcon className="size-4 shrink-0" />
          <span className="flex min-h-5 items-center">
            {typedText}
            <motion.span
              className="ml-px inline-block h-3.5 w-px bg-foreground-dimmed"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY }}
            />
          </span>
        </div>
        <motion.p
          className="text-foreground-dimmed text-xs"
          animate={{ opacity: countVisible ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {resultsCount}
        </motion.p>
        <div className="flex flex-1 flex-col gap-3">
          {oldResults.map((result, index) => (
            <motion.div
              key={result.title}
              initial={false}
              animate={
                visibleResults > index
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex items-start gap-3"
            >
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary font-medium text-[10px] text-white">
                {result.rank}
              </span>
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-accent-foreground bg-white p-1">
                <Image
                  src={result.image}
                  alt={result.title}
                  width={48}
                  height={48}
                  className="size-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {result.title}
                </span>
                <span className="text-foreground-dimmed text-xs">
                  {result.host} · ★ {result.rating}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
        {summary}
      </p>
    </div>
  );
};

const AgentEra = ({
  question,
  label,
  answerTitle,
  answerDescription,
  buyNow,
  summary,
}: {
  question: string;
  label: string;
  answerTitle: string;
  answerDescription: string;
  buyNow: string;
  summary: string;
}) => {
  const { phase, questionText } = useAgentLoop(question);
  const showQuestion = phase !== "idle";
  const showCursor = phase === "typing";
  const showThinking = phase === "thinking";
  const showAnswer = phase === "answer";

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Image
          src="/images/chatgpt.svg"
          alt="ChatGPT"
          width={20}
          height={20}
          className="size-5"
        />
        <span className="font-light text-lg">{label}</span>
      </div>
      <div className="flex min-h-[176px] flex-1 flex-col gap-3 rounded-lg border border-primary/40 bg-background p-4">
        <AnimatePresence>
          {showQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white"
            >
              {questionText}
              {showCursor && (
                <motion.span
                  className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-white"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    duration: 0.7,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex w-fit items-center gap-1 rounded-lg border border-accent-foreground px-3 py-3"
            >
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="size-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}

          {showAnswer && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex gap-3 rounded-lg border border-accent-foreground p-3"
            >
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-accent-foreground bg-white p-1.5">
                <Image
                  src={ANSWER_IMAGE}
                  alt="Sony WH-1000XM5"
                  width={64}
                  height={64}
                  className="size-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <StarHandIcon className="size-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">
                    {answerTitle}
                  </span>
                </div>
                <p className="font-light text-foreground-dimmed text-xs">
                  {answerDescription}
                </p>
                <button
                  type="button"
                  className="mt-1 w-fit rounded-full bg-primary px-3 py-1 font-medium text-white text-xs transition-opacity hover:opacity-90"
                >
                  {buyNow}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-4 font-light text-base text-foreground-dimmed md:text-lg">
        {summary}
      </p>
    </div>
  );
};

export const DiscoveryShift = () => {
  const translate = useTranslations("home");

  return (
    <section className="relative border-accent-foreground border-y">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="p-4 md:p-8">
        <div className="mb-3 flex items-center gap-2 md:mb-5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute size-full animate-ping rounded-full bg-primary opacity-40" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-light text-primary text-xl">
            {translate("discoveryShift.eyebrow")}
          </span>
        </div>
        <h2 className="mb-3 max-w-3xl font-body text-3xl text-foreground leading-none tracking-tight md:mb-5 md:text-6xl">
          {translate("discoveryShift.title")}
        </h2>
        <p className="max-w-4xl font-light text-foreground-dimmed text-lg md:text-2xl">
          {translate("discoveryShift.description.before")}
          <span className="text-foreground">
            {translate("discoveryShift.description.highlight")}
          </span>
          {translate("discoveryShift.description.after")}
        </p>
      </div>

      <div className="relative grid border-accent-foreground border-t bg-background-dimmed md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <SearchEra
          searchQuery={translate("discoveryShift.searchEra.searchQuery")}
          label={translate("discoveryShift.searchEra.label")}
          resultsCount={translate("discoveryShift.searchEra.resultsCount")}
          summary={translate("discoveryShift.searchEra.summary")}
        />
        <AgentEra
          question={translate("discoveryShift.agentEra.question")}
          label={translate("discoveryShift.agentEra.label")}
          answerTitle={translate("discoveryShift.agentEra.answerTitle")}
          answerDescription={translate(
            "discoveryShift.agentEra.answerDescription",
          )}
          buyNow={translate("discoveryShift.agentEra.buyNow")}
          summary={translate("discoveryShift.agentEra.summary")}
        />
      </div>
    </section>
  );
};
