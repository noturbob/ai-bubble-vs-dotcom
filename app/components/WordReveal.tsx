"use client";

import { useRef, type ReactNode } from "react";
import { gsap, SplitText, useMotion } from "./motion/gsap";

/** Big statement whose words light up as it scrolls through the screen (inline icons stay put). */
export function WordReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useMotion(ref, (el) => {
    const split = SplitText.create(el, { type: "words" });
    gsap.fromTo(split.words, { opacity: 0.15 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
    });
    return () => split.revert();
  });
  return <p ref={ref} className={className}>{children}</p>;
}

/** A small icon sitting in its own grid tile inside a line of text, like a sticker. */
export function Tile({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span role="img" aria-label={label} className="mx-[0.12em] inline-flex h-[1.05em] w-[1.05em] translate-y-[0.12em] items-center justify-center rounded-md align-baseline grid-paper">
      {children}
    </span>
  );
}
