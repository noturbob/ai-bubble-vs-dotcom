"use client";

import { useEffect, useRef, useState } from "react";
import { HAIR, MUTED, fmtBy, type Fmt } from "./format";

export type Series = { name: string; color: string; values: (number | null)[]; dashed?: boolean; width?: number };
export type Note = { i: number; s: number; label: string; below?: boolean };

export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Light-theme line chart: hairline grid, direct labels on chosen points, crosshair readout.
 * Props are plain data (fmt is a key) so server pages can render it.
 */
export function LineChart({ label, x, series, fmt = "num", height = 300, notes = [], yMin, yMax, every }: {
  label: string;
  x: string[];
  series: Series[];
  fmt?: Fmt;
  height?: number;
  notes?: Note[];
  yMin?: number;
  yMax?: number;
  every?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const f = fmtBy[fmt];
  const h = height, m = { t: 16, r: 16, b: 28, l: 48 };
  const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const lo = yMin ?? Math.min(0, ...vals), hi = yMax ?? Math.max(...vals);
  const span = hi - lo;
  const step = [1, 2, 2.5, 5, 10].map((k) => k * 10 ** Math.floor(Math.log10(span / 4))).find((s) => s >= span / 4)!;
  const top = Math.ceil(hi / step) * step, bottom = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let v = bottom; v <= top + step / 2; v += step) ticks.push(v);
  const last = x.length - 1;
  const sx = (i: number) => m.l + (i * (w - m.l - m.r)) / last;
  const sy = (v: number) => m.t + (1 - (v - bottom) / (top - bottom)) * (h - m.t - m.b);
  const path = (vs: (number | null)[]) => vs.map((v, i) => (v === null ? "" : `${i && vs[i - 1] !== null ? "L" : "M"}${sx(i)},${sy(v)}`)).join("");
  const stride = every ?? Math.max(1, Math.ceil(80 / ((w - m.l - m.r) / last)));

  return (
    <div ref={ref} className="relative">
      {series.length > 1 && (
        <div className="mb-12 flex flex-wrap gap-16 text-[13px]" style={{ color: MUTED }}>
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-8">
              <svg width="18" height="4" aria-hidden><line x1="0" x2="18" y1="2" y2="2" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={label} tabIndex={0} className="block"
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          const i = Math.round((((e.clientX - b.left) / b.width) * w - m.l) / ((w - m.l - m.r) / last));
          setHover(Math.max(0, Math.min(last, i)));
        }}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((i) => Math.max(0, (i ?? last) - 1));
          if (e.key === "ArrowRight") setHover((i) => Math.min(last, (i ?? 0) + 1));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? "#b5b5b5" : HAIR} />
            <text x={m.l - 8} y={sy(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={MUTED} className="num">{f(t)}</text>
          </g>
        ))}
        {x.map((lbl, i) => (i % stride === 0 || i === last) && (i === last || last - i >= stride) ? (
          <text key={i} x={sx(i)} y={h - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize="11" fill={MUTED}>{lbl}</text>
        ) : null)}
        {series.map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.5}
            strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {notes.map((n) => {
          const v = series[n.s].values[n.i];
          if (v === null) return null;
          const anchor = sx(n.i) > w * 0.8 ? "end" : sx(n.i) < w * 0.15 ? "start" : "middle";
          return (
            <g key={`${n.i}-${n.label}`}>
              <circle cx={sx(n.i)} cy={sy(v)} r={4.5} fill={series[n.s].color} stroke="#f5f5f5" strokeWidth={2} />
              <text x={sx(n.i)} y={sy(v) + (n.below ? 18 : -10)} textAnchor={anchor} fontSize="12" fontWeight={700} fill="#141414"
                stroke="#ffffff" strokeWidth={4} paintOrder="stroke">{n.label}</text>
            </g>
          );
        })}
        {hover !== null && (
          <g>
            <line x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={h - m.b} stroke="#b5b5b5" />
            {series.map((s) => s.values[hover] !== null && (
              <circle key={s.name} cx={sx(hover)} cy={sy(s.values[hover]!)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-24 rounded-lg border border-hairline bg-paper px-12 py-8 text-[13px]"
          style={{ left: Math.min(sx(hover) + 12, w - 190), width: 180 }}>
          <div className="mono text-[11px]" style={{ color: MUTED }}>{x[hover]}</div>
          {series.map((s) => s.values[hover] !== null && (
            <div key={s.name} className="flex items-center gap-8">
              <svg width="12" height="4" aria-hidden><line x1="0" x2="12" y1="2" y2="2" stroke={s.color} strokeWidth={2.5} /></svg>
              <strong className="num">{f(s.values[hover]!)}</strong>
              <span className="truncate" style={{ color: MUTED }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
