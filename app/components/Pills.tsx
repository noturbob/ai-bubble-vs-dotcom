"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./motion/gsap";

export type Pill = { id: string; label: string; sub: string; w: number; h: number; tone: "ember" | "ink" | "yellow" | "green" };
const TONES = {
  ember: { bg: "#ff8400", fg: "#141414" }, ink: { bg: "#141414", fg: "#ffffff" },
  yellow: { bg: "#fecc33", fg: "#141414" }, green: { bg: "#30a81d", fg: "#ffffff" },
};

/**
 * The seven AI leaders as pills sized by market value. On wide screens they drop into the box when it
 * scrolls into view and can be grabbed and thrown (Matter.js). Otherwise they sit in a tidy row.
 */
export function Pills({ pills, label }: { pills: Pill[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (reducedMotion() || !matchMedia("(min-width: 768px)").matches) return;
    const el = box.current!;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setLive(true); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    const el = box.current!;
    const { Engine, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;
    const W = el.clientWidth, H = el.clientHeight;
    const engine = Engine.create({ gravity: { x: 0, y: 1 } });
    const wall = (x: number, y: number, w: number, h: number) => Bodies.rectangle(x, y, w, h, { isStatic: true });
    Composite.add(engine.world, [wall(W / 2, H + 50, W * 2, 100), wall(-50, H / 2, 100, H * 3), wall(W + 50, H / 2, 100, H * 3)]);
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-pill]")];
    const bodies = nodes.map((n, i) => Bodies.rectangle(
      60 + ((i * 173) % Math.max(1, W - 240)) + n.offsetWidth / 2, -120 - i * 90, n.offsetWidth, n.offsetHeight,
      { chamfer: { radius: n.offsetHeight / 2 - 1 }, restitution: 0.35, friction: 0.3, angle: (i % 2 ? 1 : -1) * 0.25 },
    ));
    Composite.add(engine.world, bodies);
    const mouse = Mouse.create(el);
    // Matter grabs the mouse wheel by default, which would block page scrolling over the box.
    const m = mouse as unknown as { mousewheel: EventListener };
    el.removeEventListener("wheel", m.mousewheel);
    el.removeEventListener("mousewheel", m.mousewheel);
    el.removeEventListener("DOMMouseScroll", m.mousewheel);
    Composite.add(engine.world, MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } }));
    const runner = Runner.create();
    Runner.run(runner, engine);
    let raf = 0;
    const draw = () => {
      bodies.forEach((b, i) => {
        nodes[i].style.transform = `translate(${b.position.x - nodes[i].offsetWidth / 2}px, ${b.position.y - nodes[i].offsetHeight / 2}px) rotate(${b.angle}rad)`;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); Runner.stop(runner); Engine.clear(engine); Mouse.clearSourceEvents(mouse); };
  }, [live]);

  return (
    <div ref={box} role="img" aria-label={label}
      className={`relative rounded-2xl border border-hairline bg-paper ${live ? "h-[460px] cursor-grab overflow-hidden active:cursor-grabbing" : "flex flex-wrap items-end gap-12 p-20"}`}>
      {pills.map((p) => (
        <div key={p.id} data-pill className={`flex select-none flex-col items-center justify-center rounded-full px-24 ${live ? "absolute left-0 top-0" : ""}`}
          style={{ width: p.w, height: p.h, background: TONES[p.tone].bg, color: TONES[p.tone].fg, ...(live ? { transform: "translate(-999px,-999px)" } : {}) }}>
          <span className="display num text-[22px] leading-none">{p.label}</span>
          <span className="mono mt-4 text-[10px] opacity-80">{p.sub}</span>
        </div>
      ))}
      {live && <p className="mono pointer-events-none absolute left-20 top-16 text-[11px] text-[#6b6b6b]">Grab one</p>}
    </div>
  );
}
