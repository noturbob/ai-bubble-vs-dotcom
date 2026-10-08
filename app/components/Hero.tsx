"use client";

import { useRef, type ReactNode } from "react";
import { Draggable, gsap, useMotion } from "./motion/gsap";

// x and y are percentages of the board, so the scatter keeps its shape at any width.
export type Snapshot = { id: string; label: string; value: string; caption: string; chart: ReactNode; x: number; y: number; r: number };

/**
 * Wordmark hero over a scatter of data snapshots pinned to the grid. The snapshots drop in on
 * load and, on large screens, can be dragged and thrown (with inertia) inside the board.
 * Every tween states its end values explicitly (fromTo): React runs effects twice in development,
 * and a plain from() would then treat the half-animated position as the resting place.
 */
export function Hero({ snapshots, asOf }: { snapshots: Snapshot[]; asOf: string }) {
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, (root) => {
    const cards = [...root.querySelectorAll<HTMLElement>("[data-snap]")];
    gsap.fromTo(root.querySelectorAll("[data-word] > span"), { yPercent: 105 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.06 });
    gsap.fromTo("[data-tag]", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.3, ease: "power3.out" });
    if (!matchMedia("(min-width: 1024px)").matches) return;
    cards.forEach((c, i) => {
      const r = Number(c.dataset.r);
      c.style.rotate = "0deg"; // GSAP owns the tilt from here; the CSS one is the no-JS fallback
      gsap.fromTo(c, { y: gsap.utils.random(-420, -260), rotation: r + gsap.utils.random(-20, 20), autoAlpha: 0 },
        { y: 0, x: 0, rotation: r, autoAlpha: 1, duration: 1.3, ease: "bounce.out", delay: 0.25 + i * 0.07 });
    });
    const d = Draggable.create(cards, {
      type: "x,y", inertia: true, bounds: root.querySelector("[data-board]"), edgeResistance: 0.85, zIndexBoost: true,
      onPress() { gsap.to(this.target, { scale: 1.04, duration: 0.2 }); },
      onRelease() { gsap.to(this.target, { scale: 1, duration: 0.3 }); },
    });
    return () => d.forEach((x) => x.kill());
  });

  return (
    <section ref={ref} id="top" aria-label="AI Bubble?" className="relative pt-64">
      <div className="flex flex-col gap-24 border-b border-ink px-16 pb-28 sm:px-24 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="display whitespace-nowrap text-[18vw] leading-[0.86] lg:text-[13.5vw]">
          <span data-word className="inline-block overflow-hidden pb-[0.06em] align-bottom"><span className="inline-block">AI</span></span>{" "}
          <span data-word className="inline-block overflow-hidden pb-[0.06em] align-bottom"><span className="inline-block">Bubble?</span></span>
        </h1>
        <div data-tag className="flex flex-col gap-20 lg:max-w-[440px] lg:items-end lg:pb-[1.2vw] lg:text-right">
          <p className="text-[24px] font-bold leading-[1.13] sm:text-[28px] xl:text-[32px]">
            The biggest boom since 1999, measured against it, <span className="marker">number by number.</span>
          </p>
          <div className="flex items-center gap-12">
            <span className="mono flex items-center gap-8 text-[12px]"><span className="h-[8px] w-[8px] rounded-full bg-signal-green" /> Data to {asOf}</span>
            <a href="#verdict" className="btn">See the verdict</a>
          </div>
        </div>
      </div>

      <div data-board className="relative grid grid-cols-1 gap-16 px-16 pb-64 pt-16 sm:grid-cols-2 lg:block lg:h-[720px] lg:px-0 lg:pb-0">
        {snapshots.map((s) => (
          <figure key={s.id} data-snap data-r={s.r}
            className="snap rounded-2xl border border-hairline bg-paper p-16 lg:absolute lg:cursor-grab lg:active:cursor-grabbing"
            style={{ ["--x" as string]: `${s.x}%`, ["--y" as string]: `${s.y}%`, ["--r" as string]: `${s.r}deg` }}>
            <p className="mono text-[11px] text-[#6b6b6b]">{s.label}</p>
            <p className="display num mt-8 text-[30px] leading-none">{s.value}</p>
            {s.chart && <div className="mt-12">{s.chart}</div>}
            <figcaption className="mt-8 text-[13px] leading-[1.35] text-[#3a3a3a]">{s.caption}</figcaption>
          </figure>
        ))}
        <p className="mono pointer-events-none absolute bottom-24 left-1/2 hidden -translate-x-1/2 text-[11px] text-[#6b6b6b] lg:block">Drag the cards around</p>
      </div>
      <style>{`@media (min-width: 1024px) { .snap { left: var(--x); top: var(--y); width: min(270px, 17vw); rotate: var(--r); } }`}</style>
    </section>
  );
}
