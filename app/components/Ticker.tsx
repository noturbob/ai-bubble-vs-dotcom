/** Full-width marquee of the AI leaders' market values (the "trusted by" strip). Pure CSS motion. */
export function Ticker({ eyebrow, items }: { eyebrow: string; items: { sym: string; value: string; note: string }[] }) {
  const row = items.map((it) => (
    <span key={it.sym} className="flex items-baseline gap-12 whitespace-nowrap pr-64">
      <span className="display text-[27px]">{it.sym}</span>
      <span className="display num text-[27px] text-ember-ink">{it.value}</span>
      <span className="mono text-[11px] text-[#6b6b6b]">{it.note}</span>
    </span>
  ));
  return (
    <section aria-label={eyebrow} className="border-y border-hairline bg-canvas py-40">
      <p className="mono text-center text-[12px]">{eyebrow}</p>
      <div className="mt-24 overflow-hidden" aria-hidden>
        <div className="marquee flex w-max">{row}{row}</div>
      </div>
      <ul className="sr-only">{items.map((it) => <li key={it.sym}>{it.sym}: {it.value}, {it.note}</li>)}</ul>
    </section>
  );
}
