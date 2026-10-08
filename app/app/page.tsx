import type { ReactNode } from "react";
import story from "@/data/story.json";
import { Nav } from "@/components/Nav";
import { Hero, type Snapshot } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { Tile, WordReveal } from "@/components/WordReveal";
import { Window } from "@/components/Window";
import { LineChart } from "@/components/LineChart";
import { Overlay } from "@/components/Overlay";
import { Opener } from "@/components/Opener";
import { Pills } from "@/components/Pills";
import { Columns } from "@/components/Columns";
import { GaugePill } from "@/components/GaugePill";
import { Clocks } from "@/components/Clocks";
import { SqlPanel } from "@/components/SqlPanel";
import { MiniBars, MiniLine } from "@/components/Mini";
import { EMBER, EMBER_LINE, INK, pct, usd } from "@/components/format";

const v = story.valuation, o = story.odds, ov = story.overlay, sp = story.spending, mv = story.market_value, lv = story.leverage, g = story.gauge, pj = story.projection, sl = story.soft_landing;
const NAMES: Record<string, string> = { NVDA: "Nvidia", MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon", META: "Meta", AVGO: "Broadcom", ORCL: "Oracle" };
const month = (d: string) => new Date(`${d}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

function Chapter({ id, kicker, title, intro, children }: { id: string; kicker: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-label={kicker} className="px-16 py-100 sm:px-24">
      <div className="mx-auto max-w-[1200px]">
        <p className="mono text-[12px]">{kicker}</p>
        <h2 className="display mt-12 max-w-[900px] text-[40px] leading-[1] sm:text-[64px]">{title}</h2>
        {intro && <div className="mt-24 max-w-[620px] text-[18px] leading-[1.5] text-[#2a2a2a]">{intro}</div>}
        <div className="mt-52">{children}</div>
      </div>
    </section>
  );
}

export default function Home() {
  const lastCapex = sp.rows.at(-1)!, preBoom = sp.rows.filter((r) => r.year <= 2021);
  const ai = ov.ai.months, dc = ov.dotcom.months, now = ov.ai_now, same = ov.dotcom_same_month, peak = ov.dotcom_peak;
  const nv = mv.companies.find((c) => c.symbol === "NVDA")!;
  const hi = o.bands.at(-1)!, low = o.bands[0];
  const capeAt = (d: string) => v.series.find((p) => p.d >= d)!;

  const snapshots: Snapshot[] = [
    { id: "cape", label: "S&P 500 · CAPE", value: v.cape.toFixed(1), caption: `Higher than ${pct(v.percentile, 1)} of months since 1881.`,
      chart: <MiniLine values={v.series.map((p) => p.v)} color={INK} fill />, x: 2, y: 4, r: -3 },
    { id: "nasdaq", label: "Nasdaq since ChatGPT", value: `×${(now.nasdaq / 100).toFixed(1)}`, caption: `Dot-com at the same point: ×${(same.nasdaq / 100).toFixed(1)}.`,
      chart: <MiniLine values={ai.map((p) => p.nasdaq)} color={EMBER_LINE} mark={ai.length - 1} />, x: 17, y: 40, r: 2 },
    { id: "capex", label: `Big Tech capex · ${lastCapex.year}`, value: usd(lastCapex.capex), caption: `${pct(lastCapex.intensity)} of revenue, up from ~10%.`,
      chart: <MiniBars values={sp.rows.map((r) => r.capex)} color={EMBER} highlight={sp.rows.length - 1} />, x: 33, y: 3, r: 1.5 },
    { id: "month", label: "Month 47 of the boom", value: month(same.d), caption: `The same month of the dot-com run. Its peak came ${peak.month - now.m} months later.`,
      chart: null, x: 49, y: 43, r: -2 },
    { id: "seven", label: "7 AI leaders", value: usd(mv.total), caption: `${pct(mv.pct_gdp)} of US GDP.`,
      chart: <MiniLine values={mv.series.map((p) => p.total)} color={EMBER_LINE} fill />, x: 64, y: 6, r: -2.5 },
    { id: "margin", label: "Margin debt", value: pct(lv.margin_now.pct_gdp, 1), caption: `of GDP, a record. 2000 peaked at ${pct(lv.margin_peak_2000_pct_gdp, 1)}.`,
      chart: <MiniLine values={lv.margin.map((p) => p.pct_gdp)} color={INK} mark={lv.margin.length - 1} />, x: 81, y: 37, r: 3 },
    { id: "nvda", label: "Nvidia", value: `${Math.round(nv.ps)}× sales`, caption: `${Math.round(nv.pe!)}× earnings, ${usd(nv.mcap)} market value.`,
      chart: null, x: 2, y: 76, r: 4 },
    { id: "curve", label: "Yield curve", value: `+${lv.rates_now.curve_10y_2y.toFixed(2)}`, caption: `Not inverted. In March 2000 it was −${Math.abs(lv.rates_2000.curve_10y_2y).toFixed(2)}.`,
      chart: null, x: 66, y: 75, r: -1.5 },
  ];

  const pillMax = Math.max(...mv.companies.map((c) => c.mcap));
  const pills = [
    ...[...mv.companies].sort((a, b) => b.mcap - a.mcap).map((c, i) => ({
      id: c.symbol, label: `${c.symbol} ${usd(c.mcap)}`, sub: c.pe ? `${Math.round(c.pe)}× earnings` : `${c.ps.toFixed(0)}× sales`,
      w: Math.round(170 + 190 * Math.sqrt(c.mcap / pillMax)), h: Math.round(58 + 34 * Math.sqrt(c.mcap / pillMax)), tone: (i === 0 ? "ember" : "ink") as "ember" | "ink",
    })),
    { id: "gdp", label: pct(mv.pct_gdp), sub: "of US GDP", w: 170, h: 70, tone: "yellow" as const },
    { id: "total", label: usd(mv.total), sub: "all seven", w: 190, h: 70, tone: "green" as const },
  ];

  return (
    <>
      <Nav />
      <main>
        <Hero snapshots={snapshots} asOf={month(v.as_of)} />

        <Ticker eyebrow={`Seven companies, ${usd(mv.total)}, ${pct(mv.pct_gdp)} of US GDP`}
          items={[...mv.companies].sort((a, b) => b.mcap - a.mcap).map((c) => ({ sym: NAMES[c.symbol], value: usd(c.mcap), note: c.pe ? `${Math.round(c.pe)}× earnings` : `${c.ps.toFixed(0)}× sales` }))} />

        <section aria-label="Introduction" className="px-16 py-180 sm:px-24">
          <p className="mono text-center text-[12px]">What this is</p>
          <WordReveal className="display mx-auto mt-24 max-w-[1100px] text-center text-[34px] leading-[1.15] sm:text-[56px]">
            A new <Tile label="a yellow dot"><span className="h-[0.5em] w-[0.5em] rounded-full bg-highlight-yellow" /></Tile> boom, built
            <Tile label="fast-forward"><span className="text-[0.55em] text-forest">▶▶</span></Tile> on the oldest pattern in markets: a real
            technology, a rush of money, and prices that run ahead of profits.
          </WordReveal>
          <p className="mx-auto mt-40 max-w-[560px] text-center text-[16px] text-[#3a3a3a]">
            No one can date a crash, and this doesn&apos;t try. It measures today against the dot-com bubble on the same yardsticks,
            then asks 150 years of market history what usually came next.
          </p>
        </section>

        <Chapter id="valuation" kicker="01 · Valuation" title={<>Expensive. Almost <span className="marker">1999</span> expensive.</>}
          intro={<>The cyclically adjusted P/E (CAPE) divides the S&P 500 by ten years of inflation-adjusted profits. At {v.cape.toFixed(1)}, it is
            higher than in {pct(v.percentile, 1)} of months since 1881. Only {v.higher_periods.filter((y) => y < 2026).join(" and ")} were higher.
            The 1929 peak was {v.peaks["1929"].toFixed(1)}.</>}>
          <Window title={`CAPE · S&P 500 · ${v.series[0].d.slice(0, 4)}–${v.as_of.slice(0, 4)}`}>
            <LineChart label={`S&P 500 CAPE by quarter since ${v.series[0].d.slice(0, 4)}`} x={v.series.map((p) => p.d.slice(0, 4))} height={340} fmt="num"
              series={[{ name: "CAPE", color: INK, values: v.series.map((p) => p.v) }]}
              notes={[
                { i: v.series.indexOf(capeAt("1929-07")), s: 0, label: `1929: ${v.peaks["1929"].toFixed(0)}` },
                { i: v.series.indexOf(capeAt("1999-10")), s: 0, label: `2000: ${v.peaks["2000"].toFixed(0)}` },
                { i: v.series.length - 1, s: 0, label: `Now: ${v.cape.toFixed(0)}` },
              ]} />
            <p className="mt-12 text-[13px] text-[#6b6b6b]">Median since 1881: {v.median.toFixed(1)}. Source: Robert Shiller, shillerdata.com.</p>
          </Window>
          <SqlPanel files={["01_valuation", "02_valuation_series"]} className="mt-40" />
        </Chapter>

        <Opener id="script-open" tone="green" kicker="02 · The script" title="Same script, so far."
          sub={`${now.m} months after ChatGPT, the AI boom is tracking the dot-com boom month for month. At this point in 1999, the peak was ${peak.month - now.m} months away.`}
          inCircle={<div className="text-center"><p className="display num text-[64px] leading-none sm:text-[96px]">×{(now.nasdaq / 100).toFixed(1)}</p><p className="mono mt-12 text-[11px] text-paper/70">Nasdaq since ChatGPT</p></div>} />
        <Overlay dotcom={dc} ai={ai} peak={peak} />
        <section aria-label="What the comparison shows" className="px-16 pb-100 sm:px-24">
          <p className="mx-auto max-w-[760px] text-[21px] leading-[1.45]">
            The leaders look alike too: the seven AI giants are up <strong>×{(now.leaders / 100).toFixed(1)}</strong> since launch, the dot-com five were
            up ×{(same.leaders / 100).toFixed(1)} at the same point. A rhyme is not a forecast. The dot-com run had seven months and{" "}
            {Math.round((peak.nasdaq / same.nasdaq - 1) * 100)}% left in it from here, and nothing guarantees this one follows.
          </p>
          <SqlPanel files={["06_boom_overlay", "07_dotcom_peak"]} className="mx-auto mt-40 max-w-[1200px]" />
        </section>

        <Chapter id="buildout" kicker="03 · The build-out" title={<>Spending like it&apos;s <span className="marker">already paid off.</span></>}
          intro={<>Microsoft, Alphabet, Amazon, Meta and Oracle spent {usd(lastCapex.capex)} on data centres and equipment in {lastCapex.year},{" "}
            {pct(lastCapex.intensity)} of everything they earned in revenue. Until 2021 that share never passed {pct(Math.max(...preBoom.map((r) => r.intensity)))}.
            The bet only pays if AI revenue grows into it.</>}>
          <Window title="Capex · five hyperscalers · from SEC filings">
            <Columns label="Hyperscaler capital spending by year" height={260}
              rows={sp.rows.map((r) => ({ label: String(r.year), value: r.capex, display: usd(r.capex), hi: r.year >= 2024, sub: pct(r.intensity) }))} />
            <p className="mt-16 text-[13px] text-[#6b6b6b]">Bars: capital spending. Below each year: as a share of the five companies&apos; revenue.</p>
          </Window>
          <SqlPanel files={["08_buildout", "11_buildout_by_company"]} className="mt-40" />
        </Chapter>

        <Chapter id="leaders" kicker="04 · The leaders" title={<>Seven companies, <span className="marker">{pct(mv.pct_gdp)} of GDP.</span></>}
          intro={<>Together the AI leaders are worth {usd(mv.total)}. Unlike most dot-coms they make real profits, but the prices assume those
            profits keep compounding: Nvidia trades at {Math.round(nv.pe!)}× its earnings and {Math.round(nv.ps)}× its sales.</>}>
          <Pills pills={pills} label={`AI leaders by market value: ${mv.companies.map((c) => `${NAMES[c.symbol]} ${usd(c.mcap)}`).join(", ")}`} />
          <SqlPanel files={["09_market_value", "10_market_value_series"]} className="mt-40" />
        </Chapter>

        <Chapter id="leverage" kicker="05 · Leverage" title={<>More borrowed money than <span className="marker">ever.</span></>}
          intro={<>Margin debt is money investors borrow to buy shares. It stands at {usd(lv.margin_now.usd_bn * 1e9)}, {pct(lv.margin_now.pct_gdp, 1)} of GDP,
            a record. At the dot-com peak it was {pct(lv.margin_peak_2000_pct_gdp, 1)}. Borrowed money is what turns a fall into a rout.</>}>
          <Window title="Margin debt · % of US GDP · FINRA">
            <LineChart label="Margin debt as a share of US GDP since 1997" x={lv.margin.map((p) => p.d.slice(0, 4))} fmt="pct1" height={300}
              series={[{ name: "Margin debt", color: INK, values: lv.margin.map((p) => p.pct_gdp) }]}
              notes={[
                { i: lv.margin.findIndex((p) => p.pct_gdp === Math.max(...lv.margin.filter((q) => q.d < "2002").map((q) => q.pct_gdp))), s: 0, label: "2000 peak" },
                { i: lv.margin.length - 1, s: 0, label: `Now ${pct(lv.margin_now.pct_gdp, 1)}` },
              ]} />
          </Window>
          <SqlPanel files={["12_leverage", "13_rates"]} className="mt-40" />
        </Chapter>

        <Opener id="different" tone="ember" kicker="06 · What's different" title="Not 2000 yet."
          sub="The bubbles of 1929, 2000 and 2007 all ran into rising interest rates and an inverted yield curve. This one hasn't, and its leaders are hugely profitable."
          inCircle={<div className="grid w-full grid-cols-2 gap-16 text-center">
            {[["Short rates", `${lv.rates_2000.y3m.toFixed(1)}%`, `${lv.rates_now.y3m.toFixed(1)}%`], ["Yield curve", lv.rates_2000.curve_10y_2y.toFixed(2), `+${lv.rates_now.curve_10y_2y.toFixed(2)}`]].map(([k, a, b]) => (
              <div key={k}><p className="mono text-[10px] text-paper/60">{k}</p><p className="display num mt-8 text-[24px] leading-none sm:text-[36px]">{b}</p><p className="mono mt-4 text-[10px] text-paper/60">Mar 2000: {a}</p></div>
            ))}
          </div>} />

        <Chapter id="history" kicker="07 · What history says" title={<>Expensive markets don&apos;t crash on cue. <span className="marker">They just return less.</span></>}
          intro={<>Every month since 1881, grouped by its CAPE. Valuation is a poor timer: periods above 30 ended in a 30%+ fall in {hi.episodes_crashed} of {hi.episodes} cases,
            but cheaper markets crashed at similar rates. It is a strong guide to the long run: from CAPE above 30, the typical next decade returned{" "}
            {pct(hi.real_return_10y!, 1)} a year after inflation; from below 10, {pct(low.real_return_10y!, 0, true)}.</>}>
          <div className="grid gap-24 lg:grid-cols-2">
            <Window title="Next 10 years · real return per year">
              <Columns label="Median 10-year real return by starting CAPE" height={220} max={Math.max(...o.bands.map((b) => b.real_return_10y ?? 0))}
                rows={o.bands.map((b) => ({ label: `CAPE ${b.band}`, value: b.real_return_10y ?? 0, display: pct(b.real_return_10y ?? 0, 1), hi: b.band === hi.band }))} />
              <p className="mt-16 text-[13px] text-[#6b6b6b]">Median across all starting months in each band. Above 30 it turns negative.</p>
            </Window>
            <Window title={`Fell 30%+ within ${o.horizon_months / 12} years`}>
              <Columns label="Share of months followed by a 30% fall within 3 years, by CAPE" height={220} max={0.5}
                rows={o.bands.map((b) => ({ label: `CAPE ${b.band}`, value: b.p_crash30, display: pct(b.p_crash30), hi: b.band === hi.band, sub: `${b.episodes_crashed}/${b.episodes} episodes` }))} />
              <p className="mt-16 text-[13px] text-[#6b6b6b]">Share of months followed by a 30% fall; below, episodes that saw one. Monthly averages smooth short crashes like March 2020.</p>
            </Window>
          </div>
          <SqlPanel files={["03_crash_odds_by_month", "04_crash_odds_by_band", "05_high_cape_episodes"]} className="mt-40" />
        </Chapter>

        <Chapter id="gauge" kicker="08 · The gauge" title={<>One number: <span className="marker">{g.now.gauge.toFixed(2)}.</span></>}
          intro={<>Four readings, each ranked against its own history since {g.start.slice(0, 4)}: valuation, how fast prices rose, borrowed money, and how far
            prices sit above their ten-year trend. Averaged, they read {g.now.gauge.toFixed(2)} today. The highest reading on record is {g.max.g.toFixed(2)}, in {month(g.max.d)}.</>}>
          <Window title="Bubble gauge · 0 to 1">
            <LineChart label="Bubble gauge by month since 1997" x={g.series.map((p) => p.d.slice(0, 4))} fmt="num1" height={300} yMin={0} yMax={1}
              series={[{ name: "Gauge", color: EMBER_LINE, values: g.series.map((p) => p.g) }]}
              notes={[
                { i: g.series.findIndex((p) => p.d === g.max.d), s: 0, label: `${month(g.max.d)}: ${g.max.g.toFixed(2)}` },
                { i: g.series.length - 1, s: 0, label: `Now: ${g.now.gauge.toFixed(2)}`, below: true },
              ]} />
          </Window>
          <SqlPanel files={["14_bubble_gauge"]} className="mt-40" />
        </Chapter>

        <Opener id="forecast" tone="green" kicker="09 · The projection" title={`${month(pj.central)}.`}
          sub={`If everything keeps going exactly as it is, four separate clocks put the top of the boom between ${month(pj.window[0])} and ${month(pj.window[1])}. Their middle is ${month(pj.central)}, ${pj.months_ahead} months from now.`}
          inCircle={<div className="text-center"><p className="display num text-[64px] leading-none sm:text-[96px]">{pj.months_ahead}</p><p className="mono mt-12 text-[11px] text-paper/70">Months to the projected top</p></div>} />
        <section aria-label="The four clocks" className="px-16 py-100 sm:px-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="max-w-[680px] text-[18px] leading-[1.5] text-[#2a2a2a]">
              Two clocks assume this boom runs at 1999&apos;s pace. Two extend today&apos;s pace, the last two years&apos; trend, until prices and valuations
              reach where the dot-com boom topped out. Bars show how each pace clock moves if it is fitted to the last one or three years instead.
            </p>
            <Window title="When each clock reaches the 2000 top" className="mt-40">
              <Clocks asOf={pj.as_of} clocks={pj.clocks} central={pj.central} window={pj.window} />
            </Window>
            <div className="mt-40 grid gap-24 sm:grid-cols-2 lg:grid-cols-4">
              {pj.clocks.map((c) => (
                <div key={c.id} className="rounded-2xl border border-hairline bg-paper p-20">
                  <p className="mono text-[11px] text-[#6b6b6b]">At {c.pace === "1999" ? "1999's" : "today's"} pace</p>
                  <h3 className="mt-8 text-[16px] font-bold">{c.name}</h3>
                  <p className="display num mt-12 text-[36px] leading-none">{month(c.date)}</p>
                  <p className="mt-12 text-[14px] leading-[1.45] text-[#3a3a3a]">{c.how}</p>
                  {c.range && <p className="mono mt-12 text-[11px] text-[#6b6b6b]">Range {month(c.range[0])} to {month(c.range[1])}</p>}
                </div>
              ))}
            </div>
            <p className="mt-52 max-w-[760px] text-[21px] leading-[1.45]">
              &ldquo;Burst&rdquo; here means the month the boom tops out; in 2000 the Nasdaq then lost <strong>{pct(-pj.dotcom_fall)}</strong> over the next two and a half years.
              This is arithmetic on trends, not a forecast. Rate hikes or a profit miss would bring the date forward; profits that keep catching up with prices would push it out,
              and chapter 07 shows valuation alone has never timed a crash.
            </p>
            <SqlPanel files={["15_projection"]} className="mt-40" />
          </div>
        </section>

        <Chapter id="soft-landing" kicker="10 · What could stop it" title={<>It could <span className="marker">deflate</span> instead of burst.</>}
          intro={<>Companies can&apos;t stop a bubble: share prices are set by millions of investors, not by a firm&apos;s own analysts. Cisco, Intel and Oracle
            had plenty of experts in 2000 and still lost {pct(-sl.dotcom_leaders[1].fall)} to {pct(-sl.dotcom_leaders[0].fall)}. What can happen is a slow
            deflation: prices stall while profits catch up. That takes four things to hold.</>}>
          <div className="grid gap-24 md:grid-cols-2">
            {[
              { id: "profits", name: "Profits outrun prices", value: `${sl.catch_up.pe_now.toFixed(0)}× earnings`,
                body: `The six leaders' profits grew ${pct(sl.catch_up.growth)} a year from 2023 to 2025. If their prices went nowhere, that would bring them down to ${sl.catch_up.target.toFixed(0)}× earnings, the S&P 500's norm since 1990, in ${sl.catch_up.years.today.toFixed(1)} years. At half that growth, ${sl.catch_up.years.half.toFixed(1)}; at 10% a year, ${sl.catch_up.years.slow.toFixed(1)}.`,
                watch: "Quarterly profit growth at the leaders." },
              { id: "funding", name: "The build-out is paid from profits", value: `${pct(sl.capex_to_profit.now)} of profits`,
                body: `In ${sl.capex_to_profit.year} the five hyperscalers spent ${usd(lastCapex.capex)}, more than they earned. Until 2021 spending never passed ${pct(sl.capex_to_profit.before)} of profits. Beyond 100%, the rest is borrowed or comes out of savings.`,
                chart: <MiniBars values={sl.capex_to_profit.series.map((r) => r.ratio)} color={EMBER} highlight={sl.capex_to_profit.series.length - 1} />,
                watch: "Bond issuance by the hyperscalers." },
              { id: "rates", name: "Money stays cheap", value: `+${lv.rates_now.curve_10y_2y.toFixed(2)} yield curve`,
                body: `The bubbles of 1929, 2000 and 2007 all ran into rate rises and an inverted yield curve. Today short rates are ${lv.rates_now.y3m.toFixed(1)}%, against ${lv.rates_2000.y3m.toFixed(1)}% in March 2000, and the curve isn't inverted.`,
                watch: "A Fed hike, or the curve dipping below zero." },
              { id: "leverage", name: "Borrowing stays in check", value: `${pct(lv.margin_now.pct_gdp, 1)} of GDP`,
                body: `Margin debt, money borrowed to buy shares, is at a record. At the 2000 peak it was ${pct(lv.margin_peak_2000_pct_gdp, 1)}. Borrowed money forces selling when prices fall, which is what turns a dip into a crash.`,
                watch: "Margin debt falling while prices hold." },
            ].map((c) => {
              const ok = sl.conditions.find((x) => x.id === c.id)!.ok;
              return (
                <div key={c.id} className="flex flex-col rounded-2xl border border-hairline bg-paper p-24">
                  <div className="flex items-center justify-between gap-12">
                    <h3 className="text-[17px] font-bold">{c.name}</h3>
                    <span className="mono flex shrink-0 items-center gap-8 rounded-full border border-hairline px-12 py-4 text-[11px]">
                      <span aria-hidden className="text-[13px] leading-none" style={{ color: ok ? "#21935b" : "#c96500" }}>{ok ? "✓" : "✕"}</span>{ok ? "Holding" : "Not holding"}
                    </span>
                  </div>
                  <p className="display num mt-16 text-[36px] leading-none">{c.value}</p>
                  {c.chart && <div className="mt-16">{c.chart}</div>}
                  <p className="mt-16 text-[15px] leading-[1.5] text-[#2a2a2a]">{c.body}</p>
                  <p className="mono mt-auto pt-16 text-[11px] text-[#6b6b6b]">Watch: {c.watch}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-52 grid gap-40 md:grid-cols-[1fr_1.4fr] md:items-end">
            <p className="display text-[56px] leading-[0.95] sm:text-[80px]">{sl.conditions.filter((c) => c.ok).length} of {sl.conditions.length} <span className="text-[#6b6b6b]">holding.</span></p>
            <p className="max-w-[620px] text-[18px] leading-[1.5] text-[#2a2a2a]">
              <strong>It has happened before.</strong> From {month(sl.precedent.start)}, CAPE sat above 30 for six years and peaked at {sl.precedent.peak_cape}. The Nasdaq
              fell {pct(-sl.precedent.nasdaq_fall)} from {month(sl.precedent.nasdaq_peak)}, then profits caught up and it was back at its high by {month(sl.precedent.nasdaq_back)}.
              A deflation, not a burst. If all four hold, the clocks in chapter 09 point to a stall rather than a 2000-style collapse.
            </p>
          </div>
          <SqlPanel files={["16_soft_landing", "17_falls"]} className="mt-40" />
        </Chapter>

        <section id="verdict" aria-label="Verdict" className="px-16 py-180 sm:px-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="mono text-[12px]">The verdict</p>
            <h2 className="display mt-16 text-[56px] leading-[1.02] sm:text-[110px]">
              Probably a bubble.<br /><span className="marker">Best guess: {month(pj.central)}.</span>
            </h2>
            <div className="mt-64 grid gap-40 md:grid-cols-3">
              {[
                ["It looks like 1999", `Valuations second only to 2000, a boom tracking the dot-com run month for month, record borrowing, and ${usd(lastCapex.capex)} a year of spending ahead of revenue.`],
                ["It isn't 2000 yet", `Rates are lower, the yield curve isn't inverted, and the leaders earn real profits. If nothing changes, the clocks put the top between ${month(pj.window[0])} and ${month(pj.window[1])}.`],
                ["What history says", `High valuations predict poor long-run returns (${pct(hi.real_return_10y!, 1)} a year over the next decade from here, historically), not the date of a crash.`],
              ].map(([h, t]) => (
                <div key={h} className="border-t border-ink pt-20">
                  <h3 className="display text-[27px] leading-[1.05]">{h}</h3>
                  <p className="mt-12 text-[16px] leading-[1.5] text-[#2a2a2a]">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="method" aria-label="Method and sources" className="border-t border-hairline bg-canvas px-16 py-80 sm:px-24">
          <div className="mx-auto grid max-w-[1200px] gap-40 text-[14px] leading-[1.6] text-[#2a2a2a] md:grid-cols-3">
            <div><p className="mono text-[12px] text-ink">Sources</p><p className="mt-12">Robert Shiller&apos;s market data (shillerdata.com), Yahoo Finance monthly prices, SEC EDGAR company filings, Federal Reserve H.15 Treasury yields, FINRA margin statistics, World Bank GDP. Every file is listed with its URL and checksum in the project repository.</p></div>
            <div><p className="mono text-[12px] text-ink">Checks</p><p className="mt-12">The pipeline fails unless it reproduces known values: CAPE in 1929 and 1999, Nvidia&apos;s 2024 revenue, the Nasdaq in 2000, and market values for Nvidia and Alphabet. Share counts are adjusted for stock splits from the date they were filed. Every number is then computed in SQL (DuckDB), one question per file; open &ldquo;Show the SQL&rdquo; under any chart to read it.</p></div>
            <div><p className="mono text-[12px] text-ink">Limits</p><p className="mt-12">History is a small sample: only three periods have had CAPE above 30. Monthly averages smooth short crashes. The gauge ranks months against the whole period, so it describes, it does not forecast. The projection extends recent trends in straight lines; real booms speed up and stall.</p></div>
          </div>
        </section>
      </main>

      <footer aria-label="AI Bubble?" className="overflow-hidden px-16 pb-100 pt-40 sm:px-24">
        <div className="mono flex flex-wrap items-center gap-x-24 gap-y-8 text-[12px]">
          <p>Made by Bobby Anthene · Data to {month(v.as_of)}</p>
          <a className="underline underline-offset-4" href="https://github.com/noturbob" target="_blank" rel="noreferrer">GitHub</a>
          <a className="underline underline-offset-4" href="mailto:bobbyanthene@gmail.com">bobbyanthene@gmail.com</a>
          <a className="underline underline-offset-4" href="https://github.com/noturbob/ai-bubble-vs-dotcom" target="_blank" rel="noreferrer">Source code and data</a>
        </div>
        <p className="display mt-24 whitespace-nowrap text-center text-[22vw] leading-[0.8]" aria-hidden>Bubble?</p>
      </footer>
      <GaugePill now={g.now.gauge} peak={g.max.g} peakDate={month(g.max.d)} />
    </>
  );
}
