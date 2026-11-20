"use client";

import { useMotionTemplate, useSpring } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import sneakerRest from "@/components/hairline/rest/sneaker.json";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Motion } from "@/components/motion";
import "./commerce-hero-scene.css";

const tiles = Array.from({ length: 357 }, (_, index) => `tile-${index}`);
const barcode = Array.from({ length: 25 }, (_, index) => `barcode-${index}`);

/** One tangible product record, rather than a second workflow diagram. */
export const CommerceHeroScene = ({ label }: CommerceHeroScene.Props) => {
  const stage = useRef<HTMLDivElement>(null);
  const { ready, reduced } = useInteractive();
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(false);
  const horizontal = useSpring(0, { duration: 0.5, bounce: 0.2 });
  const vertical = useSpring(0, { duration: 0.5, bounce: 0.2 });
  const tilt = useMotionTemplate`rotateX(${vertical}deg) rotateY(${horizontal}deg)`;
  const light = useMotionTemplate`translateX(${horizontal}%)`;
  const active = ready && !reduced && visible && awake;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(element);
    const update = () => setAwake(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (active) return;
    horizontal.jump(0);
    vertical.jump(0);
  }, [active, horizontal, vertical]);

  return (
    <div
      ref={stage}
      role="img"
      aria-label={label}
      data-commerce-hero
      data-motion={active ? "active" : "rest"}
      className="commerce-hero-scene relative isolate w-full"
      onPointerMove={(event) => {
        if (
          !active ||
          event.pointerType !== "mouse" ||
          !window.matchMedia("(hover: hover) and (pointer: fine)").matches
        ) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        horizontal.set(
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 12,
        );
        vertical.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -8);
      }}
      onPointerLeave={() => {
        horizontal.set(0);
        vertical.set(0);
      }}
    >
      <div
        aria-hidden
        className="commerce-hero-world pointer-events-none absolute inset-0"
      >
        <div className="commerce-hero-floor">
          <Motion.Item
            initial={false}
            style={{ transform: light }}
            className="commerce-hero-light"
          />
          <div className="commerce-hero-tiles">
            {tiles.map((tile) => (
              <span key={tile} />
            ))}
          </div>
          <div className="commerce-hero-grid-cross commerce-hero-grid-cross-left" />
          <div className="commerce-hero-grid-cross commerce-hero-grid-cross-right" />
        </div>
        <Motion.Item
          initial={false}
          animate={
            active
              ? {
                  opacity: [0.25, 0.16, 0.25],
                  transform: ["scale(1)", "scale(0.94)", "scale(1)"],
                }
              : { opacity: 0.25, transform: "scale(1)" }
          }
          transition={
            active
              ? {
                  duration: 7,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }
              : { duration: 0 }
          }
          className="commerce-hero-shadow"
        />
        <div className="commerce-hero-object">
          <Motion.Item
            initial={false}
            animate={
              active
                ? {
                    transform: [
                      "translateY(0px)",
                      "translateY(-14px)",
                      "translateY(0px)",
                    ],
                  }
                : { transform: "translateY(0px)" }
            }
            transition={
              active
                ? {
                    duration: 7,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }
                : { duration: 0 }
            }
            className="commerce-hero-float"
          >
            <Motion.Item
              initial={false}
              style={{ transform: tilt }}
              className="commerce-hero-bank"
            >
              <div className="commerce-hero-folio">
                <div className="commerce-hero-spine" />
                <div className="commerce-hero-paper commerce-hero-paper-back" />
                <div className="commerce-hero-paper commerce-hero-paper-middle" />
                <div className="commerce-hero-cover">
                  <div className="commerce-hero-cover-top">
                    <Image
                      src="/images/logo.svg"
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 object-contain"
                    />
                    <span className="commerce-hero-top-rule" />
                    <span className="commerce-hero-corner-mark" />
                  </div>
                  <div className="commerce-hero-product">
                    <div className="commerce-hero-shoe">
                      <svg
                        viewBox="55 100 290 200"
                        preserveAspectRatio="xMidYMid meet"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: Local validated Hairline rest geometry, never user content.
                        dangerouslySetInnerHTML={{ __html: sneakerRest }}
                      />
                    </div>
                    <div className="commerce-hero-facts">
                      <div className="commerce-hero-label-lines">
                        <span />
                        <span />
                      </div>
                      <div className="commerce-hero-detail-lines">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="commerce-hero-swatches">
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="commerce-hero-barcode">
                        {barcode.map((bar) => (
                          <span key={bar} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="commerce-hero-cover-bottom">
                    <span className="commerce-hero-bottom-rule" />
                    <span className="commerce-hero-bottom-rule-short" />
                    <span className="commerce-hero-registration">+</span>
                  </div>
                </div>
              </div>
            </Motion.Item>
          </Motion.Item>
        </div>
      </div>
    </div>
  );
};

export namespace CommerceHeroScene {
  export type Props = { label: string };
}
