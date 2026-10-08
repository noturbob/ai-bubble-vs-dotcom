/** Fixed bottom pill (the reference's search bar): the bubble gauge, always in view, with a jump to the verdict. */
export function GaugePill({ now, peak, peakDate }: { now: number; peak: number; peakDate: string }) {
  const segs = 20;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center px-12">
      <div className="pointer-events-auto flex w-full max-w-[640px] items-center gap-12 rounded-full bg-mist/95 py-8 pl-20 pr-8 backdrop-blur" style={{ border: "1px solid #d9d9d9" }}>
        <span className="mono hidden shrink-0 text-[12px] sm:inline">Bubble gauge</span>
        <div className="flex flex-1 items-center gap-[3px]" role="img" aria-label={`Bubble gauge ${now.toFixed(2)} out of 1; ${peakDate} peak was ${peak.toFixed(2)}`}>
          {Array.from({ length: segs }, (_, i) => {
            const on = (i + 0.5) / segs <= now;
            const atPeak = Math.abs((i + 0.5) / segs - peak) < 0.5 / segs;
            return <span key={i} className="h-[14px] flex-1 rounded-[2px]" style={{ background: on ? "#ff8400" : "#d9d9d9", outline: atPeak ? "2px solid #141414" : "none", outlineOffset: 1 }} />;
          })}
        </div>
        <span className="mono num shrink-0 text-[12px]">{now.toFixed(2)}<span className="hidden text-[#6b6b6b] sm:inline"> · {peakDate}: {peak.toFixed(2)}</span></span>
        <a href="#verdict" className="btn shrink-0 !rounded-full !bg-paper !px-16 !text-ink" style={{ border: "1px solid #d9d9d9" }}>Verdict ↓</a>
      </div>
    </div>
  );
}
