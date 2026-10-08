"use client";

import { useRef } from "react";
import { EMBER_LINE, HAIR, INK, MUTED } from "./format";
import { gsap, useMotion } from "./motion/gsap";

type Pt = { m: number; d: string; nasdaq: number };

const W = 1000, H = 440;

/**
 * Pinned comparison: the Nasdaq after Netscape's IPO (1995) vs after ChatGPT (2022), both indexed to
 * 100. Scrolling draws both booms month by month up to today, then lets the dot-com line run on to
 * its peak and crash. Server render = the finished chart.
 */
export function Overlay({ dotcom, ai, peak }: { dotcom: Pt[]; ai: Pt[]; peak: { month: number; date: string; nasdaq: number; trough: number; fall: number } }) {
  const ref = useRef<HTMLElement>(null);
  const months = dotcom.length - 1, now = ai[ai.length - 1];
  const top = Math.ceil(Math.max(...dotcom.map((p) => p.nasdaq)) / 100) * 100;
  const x = (m: number) => 40 + (m / months) * (W - 60);
  const y = (v: number) => 16 + (1 - v / top) * (H - 48);
  const line = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.m)},${y(p.nasdaq)}`).join("");
  const same = dotcom.find((p) => p.m === now.m)!;

  useMotion(ref, (root) => {
    const ai = root.querySelector<SVGRectElement>("[data-clip-ai]")!;
    const dc = root.querySelector<SVGRectElement>("[data-clip-dc]")!;
    const notes = root.querySelectorAll<HTMLElement>("[data-at]");
    const counter = root.querySelector<HTMLElement>("[data-month]")!;
    const apply = (p: number) => {
      const m = p * months;
      ai.setAttribute("width", String(x(Math.min(m, now.m)) + 4));
      dc.setAttribute("width", String(x(m) + 4));
      counter.textContent = `Month ${Math.round(m)}`;
      notes.forEach((n) => { n.style.opacity = m >= Number(n.dataset.at) ? "1" : "0"; });
    };
    const s = { p: 0 };
    apply(0);
    gsap.to(s, { p: 1, ease: "none", onUpdate: () => apply(s.p), scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.6 } });
  });

  // Notes in the right half of the chart open to the left of their point, so they stay on screen.
  const note = (m: number, v: number, text: string) => (
    <div data-at={m} className="absolute w-[150px] rounded-lg border border-hairline bg-paper px-12 py-8 text-[12px] leading-[1.3] transition-opacity duration-500 sm:w-[210px] sm:text-[13px]"
      style={{ left: `${(x(m) / W) * 100}%`, top: `${(y(v) / H) * 100}%`, transform: x(m) / W > 0.5 ? "translate(calc(-100% - 12px), -110%)" : "translate(12px, -110%)" }}>
      {text}
    </div>
  );

  return (
    <section ref={ref} id="script" aria-label="The dot-com boom and the AI boom, month by month" className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden px-16 sm:px-24">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex flex-wrap items-end justify-between gap-16">
            <div>
              <p className="mono text-[12px]">Nasdaq, indexed to 100 at launch</p>
              <h2 className="display mt-8 text-[36px] leading-[1] sm:text-[47px]">Month by <span className="marker">month.</span></h2>
            </div>
            <p data-month className="mono num text-[12px] text-[#6b6b6b]">Month {months}</p>
          </div>
          <div className="mt-16 flex flex-wrap gap-24 text-[13px]" style={{ color: MUTED }}>
            <span className="flex items-center gap-8"><svg width="18" height="4" aria-hidden><line x1="0" x2="18" y1="2" y2="2" stroke={INK} strokeWidth={2.5} /></svg>Dot-com: from Netscape&apos;s IPO, Aug 1995</span>
            <span className="flex items-center gap-8"><svg width="18" height="4" aria-hidden><line x1="0" x2="18" y1="2" y2="2" stroke={EMBER_LINE} strokeWidth={3} /></svg>AI: from ChatGPT&apos;s launch, Nov 2022</span>
          </div>
          <div className="relative mt-16 h-[52svh] min-h-[260px]">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img"
              aria-label={`Month ${now.m}: AI-era Nasdaq at ${now.nasdaq}, dot-com Nasdaq at ${same.nasdaq} (${same.d}). Dot-com peaked at ${peak.nasdaq} in month ${peak.month} (${peak.date}) then fell ${Math.round(-peak.fall * 100)}%.`}>
              <defs>
                <clipPath id="clip-ai"><rect data-clip-ai x="0" y="0" width={W} height={H} /></clipPath>
                <clipPath id="clip-dc"><rect data-clip-dc x="0" y="0" width={W} height={H} /></clipPath>
              </defs>
              {[0, 100, 200, 300, 400].filter((t) => t <= top).map((t) => (
                <line key={t} x1={40} x2={W - 20} y1={y(t)} y2={y(t)} stroke={t === 100 ? "#b5b5b5" : HAIR} vectorEffect="non-scaling-stroke" strokeDasharray={t === 100 ? "5 5" : undefined} />
              ))}
              <line x1={x(now.m)} x2={x(now.m)} y1={16} y2={H - 32} stroke={INK} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              <path d={line(dotcom)} fill="none" stroke={INK} strokeWidth={2.5} vectorEffect="non-scaling-stroke" clipPath="url(#clip-dc)" strokeLinejoin="round" />
              <path d={line(ai)} fill="none" stroke={EMBER_LINE} strokeWidth={3.5} vectorEffect="non-scaling-stroke" clipPath="url(#clip-ai)" strokeLinejoin="round" />
            </svg>
            {[0, 100, 200, 300, 400].filter((t) => t <= top).map((t) => (
              <span key={t} className="num absolute left-0 -translate-y-1/2 text-[11px] text-[#6b6b6b]" style={{ top: `${(y(t) / H) * 100}%` }}>{t}</span>
            ))}
            <span className="mono absolute -bottom-24 text-[11px] text-[#6b6b6b]" style={{ left: `${(x(now.m) / W) * 100}%`, transform: "translateX(-50%)" }}>You are here · month {now.m}</span>
            {note(now.m, now.nasdaq, `Today: AI-era Nasdaq ×${(now.nasdaq / 100).toFixed(1)}. Dot-com at month ${now.m} (${same.d}): ×${(same.nasdaq / 100).toFixed(1)}.`)}
            {note(peak.month, peak.nasdaq, `Dot-com peak, ${peak.date}: ×${(peak.nasdaq / 100).toFixed(1)}. ${peak.month - now.m} months after this point in the story.`)}
            {note(peak.month + 18, peak.trough + 40, `Then ${Math.round(-peak.fall * 100)}% gone in two and a half years.`)}
          </div>
        </div>
      </div>
    </section>
  );
}
