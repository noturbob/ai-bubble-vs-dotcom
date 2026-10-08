// Tiny inline charts for the data snapshots. Pure SVG, no interaction.
export function MiniLine({ values, color, height = 56, fill = false, mark }: {
  values: number[]; color: string; height?: number; fill?: boolean; mark?: number;
}) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 100 - ((v - lo) / (hi - lo || 1)) * 92 - 4]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height={height} aria-hidden className="block">
      {fill && <path d={`${d}L100,100L0,100Z`} fill={color} opacity={0.15} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {mark !== undefined && <circle cx={pts[mark][0]} cy={pts[mark][1]} r={3} fill={color} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function MiniBars({ values, color, height = 56, highlight }: { values: number[]; color: string; height?: number; highlight?: number }) {
  const hi = Math.max(...values);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden>
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${(v / hi) * 100}%`, background: i === highlight ? color : "#141414", opacity: i === highlight ? 1 : 0.85 }} />
      ))}
    </div>
  );
}
