const LINKS = [["#valuation", "Valuation"], ["#script", "The script"], ["#buildout", "Build-out"], ["#leaders", "Leaders"], ["#leverage", "Leverage"], ["#history", "History"], ["#forecast", "Projection"]];

/** Ghost mono links on the canvas, one filled black action on the right. */
export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="flex h-[48px] items-center justify-between gap-24 px-16 sm:px-24">
        <a href="#top" className="mono flex items-center gap-8 text-[12px]"><span aria-hidden className="text-signal-green">▶</span>AI Bubble?</a>
        <nav aria-label="Chapters" className="hidden lg:block">
          <ul className="flex gap-40">{LINKS.map(([h, l]) => <li key={h}><a href={h} className="mono text-[12px] hover:underline">{l}</a></li>)}</ul>
        </nav>
        <div className="flex items-center gap-16">
          <a href="#method" className="mono hidden text-[12px] hover:underline sm:inline">Sources</a>
          <a href="#verdict" className="btn !py-4">Verdict</a>
        </div>
      </div>
    </header>
  );
}
