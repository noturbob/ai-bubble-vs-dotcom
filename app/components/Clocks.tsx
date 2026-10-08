import { EMBER_LINE, INK } from "./format";

type Clock = { id: string; pace: string; name: string; date: string; range?: string[] };

const idx = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
const label = (d: string) => new Date(`${d}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Timeline of the four clocks: one row each, a dot at its date, a bar across its fit-window range. Plain HTML, positions in %. */
export function Clocks({ asOf, clocks, central, window: [lo, hi] }: { asOf: string; clocks: Clock[]; central: string; window: string[] }) {
  const t0 = idx(asOf), t1 = idx(`${Number(hi.slice(0, 4)) + 1}-01`);
  const x = (d: string) => `${(((idx(d) - t0) / (t1 - t0)) * 100).toFixed(2)}%`;
  const years = Array.from({ length: Number(hi.slice(0, 4)) - Number(asOf.slice(0, 4)) + 1 }, (_, i) => `${Number(asOf.slice(0, 4)) + 1 + i}-01`).filter((d) => idx(d) <= t1);
  return (
    <figure aria-label={`Four clocks for the top of the boom, from ${label(lo)} to ${label(hi)}; the middle is ${label(central)}`}>
      <div className="mb-20 flex flex-wrap gap-20 text-[13px]">
        {[["At 1999's pace", INK], ["At today's pace", EMBER_LINE]].map(([k, c]) => (
          <span key={k} className="flex items-center gap-8"><span className="h-[10px] w-[10px] rounded-[50%]" style={{ background: c }} />{k}</span>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-x-16 sm:grid-cols-[200px_1fr]">
        <div />
        <div className="relative h-[24px]">
          {years.map((d) => <span key={d} className="mono absolute top-0 -translate-x-1/2 text-[11px] text-[#6b6b6b]" style={{ left: x(d) }}>{d.slice(0, 4)}</span>)}
        </div>
        {clocks.map((c) => {
          const color = c.pace === "1999" ? INK : EMBER_LINE;
          return [
            <p key={`${c.id}-n`} className="flex items-center border-t border-hairline py-16 text-[14px] leading-[1.2]">{c.name}</p>,
            <div key={`${c.id}-t`} className="relative border-t border-hairline">
              <span aria-hidden className="absolute inset-y-0 border-l border-dashed border-ember-ink" style={{ left: x(central) }} />
              {c.range && <span className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-[2px] opacity-40" style={{ left: x(c.range[0]), width: `calc(${x(c.range[1])} - ${x(c.range[0])})`, background: color }} />}
              <span className="absolute top-1/2 h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] ring-2 ring-paper" style={{ left: x(c.date), background: color }}
                title={`${c.name}: ${label(c.date)}${c.range ? ` (range ${label(c.range[0])} to ${label(c.range[1])})` : ""}`} />
              <span className={`mono num absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] ${idx(c.date) > (t0 + t1) / 2 ? "-translate-x-[calc(100%+12px)]" : "translate-x-12"}`} style={{ left: x(c.date) }}>{label(c.date)}</span>
            </div>,
          ];
        })}
        <div />
        <div className="relative h-[28px] border-t border-hairline">
          <span className="mono absolute top-8 -translate-x-1/2 whitespace-nowrap bg-highlight-yellow px-8 text-[11px]" style={{ left: x(central) }}>Middle: {label(central)}</span>
        </div>
      </div>
    </figure>
  );
}
