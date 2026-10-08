// Chart colours on the grid canvas. INK is the neutral reference (the past, the baseline);
// EMBER is today's AI boom. Thin lines use EMBER_LINE, deep enough to read on #f5f5f5.
export const INK = "#141414";
export const EMBER = "#ff8400";
export const EMBER_LINE = "#c96500";
export const GREEN = "#21935b";
export const MUTED = "#6b6b6b";
export const HAIR = "#d9d9d9";

export const usd = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(1)}tn`;
  if (a >= 1e9) return `$${Math.round(n / 1e9)}bn`;
  if (a >= 1e6) return `$${Math.round(n / 1e6)}m`;
  return `$${Math.round(n)}`;
};
export const pct = (x: number, digits = 0, signed = false) => `${signed && x > 0 ? "+" : ""}${x < 0 ? "−" : ""}${Math.abs(x * 100).toFixed(digits)}%`;
export const times = (x: number) => `${x.toFixed(1)}×`;

export type Fmt = "num" | "num1" | "times" | "pct" | "pct1" | "index";
export const fmtBy: Record<Fmt, (n: number) => string> = {
  num: (n) => Math.round(n).toLocaleString("en-US"),
  num1: (n) => n.toFixed(1),
  times: (n) => `${(n / 100).toFixed(1)}×`,
  pct: (n) => `${(n * 100).toFixed(0)}%`,
  pct1: (n) => `${(n * 100).toFixed(1)}%`,
  index: (n) => Math.round(n).toString(),
};
