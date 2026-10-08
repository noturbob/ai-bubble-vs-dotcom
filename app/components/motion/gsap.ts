"use client";

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLayoutEffect, type RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

export { Draggable, gsap, ScrollTrigger, SplitText };

export const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Run GSAP setup scoped to `ref`, reverted on unmount. Skipped for reduced-motion readers: the
 * server-rendered markup is already the final state of every animation.
 */
export function useMotion(ref: RefObject<HTMLElement | null>, setup: (root: HTMLElement) => void | (() => void)) {
  useLayoutEffect(() => {
    if (!ref.current || reducedMotion()) return;
    let extra: void | (() => void);
    const ctx = gsap.context(() => { extra = setup(ref.current!); }, ref);
    return () => { extra?.(); ctx.revert(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
