// Vertical columns with the value printed on each one; the highlighted columns are ember.
export function Columns({ rows, label, height = 240, max }: {
  rows: { label: string; value: number; display: string; hi?: boolean; sub?: string }[];
  label: string; height?: number; max?: number;
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value));
  const floor = Math.min(0, ...rows.map((r) => r.value));
  const span = top - floor;
  // Negative values hang below the zero line, with their label underneath.
  const negH = (-floor / span) * height;
  return (
    <div role="img" aria-label={label}>
      <div className="flex gap-[6px]" style={{ height: height + (negH ? 18 : 0) }}>
        {rows.map((r) => (
          <div key={r.label} className="relative flex-1" title={`${r.label}: ${r.display}`}>
            <div className="absolute inset-x-0 border-b border-ink" style={{ top: height - negH }} />
            {r.value >= 0 ? (
              <div className="absolute inset-x-0 flex flex-col justify-end" style={{ bottom: negH + (negH ? 18 : 0), height: height - negH }}>
                <span className="num mb-4 text-center text-[11px] font-bold sm:text-[12px]">{r.display}</span>
                <div className="rounded-t-md" style={{ height: `${(r.value / top) * 100}%`, background: r.hi ? "#ff8400" : "#141414" }} />
              </div>
            ) : (
              <div className="absolute inset-x-0 flex flex-col" style={{ top: height - negH }}>
                <div className="rounded-b-md" style={{ height: (-r.value / span) * height, background: r.hi ? "#ff8400" : "#141414" }} />
                <span className="num mt-4 text-center text-[11px] font-bold sm:text-[12px]">{r.display}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-[6px]">
        {rows.map((r) => (
          <div key={r.label} className="flex-1 text-center">
            <div className="mono text-[10px] sm:text-[11px]">{r.label}</div>
            {r.sub && <div className="num text-[10px] text-[#6b6b6b] sm:text-[11px]">{r.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
