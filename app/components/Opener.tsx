"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useMotion } from "./motion/gsap";

/** Chapter opener: a coloured grid panel with a big black circle, beside a black panel with the headline. */
export function Opener({ id, tone, kicker, title, sub, inCircle }: {
  id: string; tone: "green" | "ember"; kicker: string; title: string; sub: string; inCircle: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, (root) => {
    const st = { trigger: root, start: "top 85%", end: "center 50%", scrub: true };
    gsap.fromTo("[data-circle]", { scale: 0.4 }, { scale: 1, ease: "none", scrollTrigger: st });
    gsap.fromTo("[data-op-title]", { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { ...st, end: "center 60%" } });
  });
  const bg = tone === "green" ? "#30a81d" : "#ff8400";
  return (
    <section ref={ref} id={id} aria-label={title} className="grid min-h-[90svh] grid-cols-1 overflow-hidden md:grid-cols-2">
      <div className="relative flex min-h-[46svh] items-center justify-center overflow-hidden" style={{
        backgroundColor: bg,
        backgroundImage: "linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}>
        <div data-circle className="flex aspect-square w-[78%] max-w-[560px] items-center justify-center rounded-[50%] bg-ink p-[12%] text-paper">
          {inCircle}
        </div>
      </div>
      <div className="flex flex-col justify-center bg-ink px-24 py-64 text-paper sm:px-52">
        <p className="mono text-[12px] text-paper/70">{kicker}</p>
        <h2 data-op-title className="display mt-16 text-[56px] leading-[0.92] sm:text-[88px]">{title}</h2>
        <p className="mt-24 max-w-[440px] text-[18px] leading-[1.4] text-paper/85">{sub}</p>
      </div>
    </section>
  );
}
