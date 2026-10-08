"""Measure today's AI boom against the dot-com bubble, and estimate crash odds from history.

In:  data/processed/*.csv
Out: data/analysis/*.csv and app/data/story.json (the only file the story app reads)
Run: uv run python analysis/indicators.py
"""
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
P, A = ROOT / "data/processed", ROOT / "data/analysis"
APP = ROOT / "app/data/story.json"

AI = ["NVDA", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "ORCL"]
DOTCOM = ["CSCO", "MSFT", "INTC", "ORCL", "QCOM"]
HYPERSCALERS = ["MSFT", "GOOGL", "AMZN", "META", "ORCL"]
# The moment the public met each technology: Netscape's IPO and ChatGPT's launch.
STARTS = {"dotcom": "1995-08-01", "ai": "2022-11-01"}
HORIZON = 36  # months ahead for "did a crash follow?"


def load(name, **kw):
    return pd.read_csv(P / f"{name}.csv", **kw)


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def valuation(sh: pd.DataFrame) -> dict:
    s = sh.dropna(subset=["cape"]).set_index("date")
    now = s.iloc[-1]
    peaks = {label: float(s.loc[a:b, "cape"].max()) for label, a, b in
             [("1929", "1929-01-01", "1929-12-01"), ("2000", "1999-01-01", "2000-12-01"), ("2021", "2021-01-01", "2021-12-01")]}
    return {
        "as_of": now.name.strftime("%Y-%m"), "cape": float(now.cape),
        "percentile": float((s.cape < now.cape).mean()), "median": float(s.cape.median()),
        "months_higher": int((s.cape > now.cape).sum()), "months": int(len(s)),
        "higher_periods": sorted({d.year for d in s.index[s.cape > now.cape]}),
        "peaks": peaks,
        "series": [{"d": d.strftime("%Y-%m"), "v": round(float(v), 2)} for d, v in s.cape.resample("QS").last().items()],
    }


def crash_odds(sh: pd.DataFrame) -> dict:
    """For every month: the worst fall in the next 36 months, and the next 10 years' real return.

    Overlapping windows mean neighbouring months are not independent, so each CAPE band also reports
    how many separate episodes it contains (runs of months at least 3 years apart)."""
    s = sh.dropna(subset=["price", "cpi"]).set_index("date")
    real = s.price / s.cpi
    # Real total return: reinvest dividends monthly.
    tr = (real * (1 + (s.dividend / s.price).fillna(0) / 12).cumprod())
    rows = []
    for i, (d, row) in enumerate(s.iterrows()):
        if pd.isna(row.cape) or i + HORIZON >= len(s):
            continue
        future = s.price.iloc[i + 1:i + 1 + HORIZON]
        dd = float(future.min() / row.price - 1)
        ten = (tr.iloc[i + 120] / tr.iloc[i]) ** (1 / 10) - 1 if i + 120 < len(s) else None
        rows.append({"date": d, "cape": float(row.cape), "drawdown_36m": dd, "real_return_10y": ten})
    df = pd.DataFrame(rows)
    df.assign(date=df.date.dt.strftime("%Y-%m")).to_csv(A / "crash_odds_by_month.csv", index=False)

    bands = [(0, 10), (10, 15), (15, 20), (20, 25), (25, 30), (30, 99)]
    out = []
    for lo, hi in bands:
        g = df[(df.cape >= lo) & (df.cape < hi)].copy()
        crash = g.drawdown_36m <= -0.30
        # An episode = a run of months in the band with no gap longer than 3 years. Episodes, not
        # months, are the independent observations; an episode "crashed" if any month in it was
        # followed by a 30% fall within 3 years.
        g["episode"] = (g.date.diff().dt.days.fillna(9999) > 3 * 365).cumsum()
        ep = g.groupby("episode").drawdown_36m.min() <= -0.30
        ten = g.real_return_10y.dropna()
        out.append({
            "band": f"{lo}–{hi}" if hi < 99 else f"{lo}+", "months": int(len(g)), "episodes": int(len(ep)),
            "episodes_crashed": int(ep.sum()), "ci_episodes": wilson(int(ep.sum()), int(len(ep))),
            "p_crash30": float(crash.mean()), "ci_months": wilson(int(crash.sum()), int(len(g))),
            "p_fall20": float((g.drawdown_36m <= -0.20).mean()),
            "median_drawdown": float(g.drawdown_36m.median()),
            "real_return_10y": float(ten.median()) if len(ten) else None,
            "neg_10y": float((ten < 0).mean()) if len(ten) else None,
        })
    high = df[df.cape >= 30].copy()
    high["episode"] = (high.date.diff().dt.days.fillna(9999) > 3 * 365).cumsum()
    episodes = [{"start": g.date.min().strftime("%Y-%m"), "end": g.date.max().strftime("%Y-%m"),
                 "peak_cape": round(float(g.cape.max()), 1), "worst_fall_36m": round(float(g.drawdown_36m.min()), 3)}
                for _, g in high.groupby("episode")]
    return {"bands": out, "high_cape_episodes": episodes, "horizon_months": HORIZON}


def overlay(prices: pd.DataFrame) -> dict:
    """Index each boom to 100 at its start; compare month by month."""
    px = prices.pivot(index="date", columns="symbol", values="adjclose")
    px.index = pd.to_datetime(px.index)
    out = {}
    for era, start in STARTS.items():
        t0 = pd.Timestamp(start)
        window = px.loc[t0:t0 + pd.DateOffset(months=96)]
        basket = (window[AI if era == "ai" else DOTCOM] / window[AI if era == "ai" else DOTCOM].iloc[0]).mean(axis=1) * 100
        nasdaq = window["^IXIC"] / window["^IXIC"].iloc[0] * 100
        out[era] = {"start": start, "months": [{"m": i, "d": d.strftime("%Y-%m"), "nasdaq": round(float(n), 1), "leaders": round(float(b), 1)}
                                               for i, (d, n, b) in enumerate(zip(window.index, nasdaq, basket))]}
    dc = pd.DataFrame(out["dotcom"]["months"])
    peak = dc.loc[dc.nasdaq.idxmax()]
    out["dotcom_peak"] = {"month": int(peak.m), "date": peak.d, "nasdaq": float(peak.nasdaq),
                          "trough": float(dc[dc.m > peak.m].nasdaq.min()), "fall": float(dc[dc.m > peak.m].nasdaq.min() / peak.nasdaq - 1)}
    ai_now = out["ai"]["months"][-1]
    out["ai_now"] = ai_now
    out["dotcom_same_month"] = dc[dc.m == ai_now["m"]].iloc[0].to_dict()
    pd.concat([pd.DataFrame(v["months"]).assign(era=k) for k, v in out.items() if k in STARTS]).to_csv(A / "boom_overlay.csv", index=False)
    return out


def spending(fin: pd.DataFrame) -> dict:
    """The build-out: hyperscalers' capital spending against their revenue, and Nvidia's sales."""
    f = fin[fin.year >= 2015]
    hs = f[f.symbol.isin(HYPERSCALERS)].groupby("year")[["capex", "revenue", "net_income"]].sum(min_count=len(HYPERSCALERS))
    nv = f[f.symbol == "NVDA"].set_index("year")[["revenue", "net_income"]]
    years = sorted(set(hs.dropna().index))
    rows = [{"year": int(y), "capex": float(hs.loc[y, "capex"]), "revenue": float(hs.loc[y, "revenue"]), "net_income": float(hs.loc[y, "net_income"]),
             "intensity": float(hs.loc[y, "capex"] / hs.loc[y, "revenue"]),
             "nvidia_revenue": float(nv.loc[y, "revenue"]) if y in nv.index else None} for y in years]
    pd.DataFrame(rows).to_csv(A / "hyperscaler_capex.csv", index=False)
    per = f[f.symbol.isin(HYPERSCALERS)].pivot(index="year", columns="symbol", values="capex").loc[years]
    return {"rows": rows, "by_company": {s: [None if pd.isna(v) else float(v) for v in per[s]] for s in per.columns}, "years": years}


def market_value(prices: pd.DataFrame, shares: pd.DataFrame, gdp: pd.DataFrame, fin: pd.DataFrame) -> dict:
    px = prices[prices.symbol.isin(AI)].copy()
    px["date"] = pd.to_datetime(px.date)
    shares["end"] = pd.to_datetime(shares.end)
    rows = []
    for sym in AI:
        q = shares[shares.symbol == sym].set_index("end")["diluted_shares"].sort_index()
        for d, c in px[px.symbol == sym].set_index("date")["close"].items():
            known = q[q.index <= d + pd.offsets.MonthEnd(0)]
            if len(known):
                rows.append({"date": d, "symbol": sym, "mcap": c * known.iloc[-1]})
    mc = pd.DataFrame(rows)
    total = mc.pivot(index="date", columns="symbol", values="mcap").dropna()
    g = gdp.set_index("year").gdp_usd
    last_gdp_year = int(g.index.max())
    def gdp_at(d):  # annual GDP; years after the latest published use the latest
        return g.get(min(d.year, last_gdp_year))
    series = [{"d": d.strftime("%Y-%m"), "total": float(r.sum()), "pct_gdp": float(r.sum() / gdp_at(d))} for d, r in total.iterrows()]
    latest = total.iloc[-1]
    ni = fin[fin.year == fin[fin.symbol.isin(AI)].dropna(subset=["net_income"]).year.max()].set_index("symbol")
    rev = fin.dropna(subset=["revenue"]).sort_values("year").groupby("symbol").last()
    inc = fin.dropna(subset=["net_income"]).sort_values("year").groupby("symbol").last()
    newest = total.index[-1].year - 1  # a full-year profit from last year or later counts as current
    # A P/E from an older year's profit isn't today's P/E; leave it out rather than mislead.
    companies = [{"symbol": s, "mcap": float(latest[s]),
                  "pe": float(latest[s] / inc.loc[s, "net_income"]) if inc.loc[s, "year"] >= newest else None,
                  "ps": float(latest[s] / rev.loc[s, "revenue"]), "fy": int(inc.loc[s, "year"]), "rev_year": int(rev.loc[s, "year"])} for s in AI]
    pd.DataFrame(series).to_csv(A / "ai_leaders_market_value.csv", index=False)
    return {"as_of": total.index[-1].strftime("%Y-%m"), "series": series[::3] + [series[-1]], "companies": companies,
            "total": float(latest.sum()), "pct_gdp": float(latest.sum() / gdp_at(total.index[-1])), "gdp_year": last_gdp_year}


def leverage_and_rates(margin: pd.DataFrame, rates: pd.DataFrame, gdp: pd.DataFrame, sh: pd.DataFrame) -> dict:
    m = margin.copy()
    m["date"] = pd.to_datetime(m.date)
    g = gdp.set_index("year").gdp_usd
    m["pct_gdp"] = [v * 1e6 / g.get(min(d.year, g.index.max())) for d, v in zip(m.date, m.margin_debt_musd)]
    cpi = sh.set_index(pd.to_datetime(sh.date)).cpi.dropna()
    m["real_bn_today"] = [v / 1e3 * cpi.iloc[-1] / cpi.asof(d) for d, v in zip(m.date, m.margin_debt_musd)]
    r = rates.copy()
    r["date"] = pd.to_datetime(r.date)
    r = r[r.date >= "1990-01-01"].dropna(subset=["y3m", "y10y"])
    peak2000 = m[(m.date >= "1999-01-01") & (m.date <= "2001-12-01")].pct_gdp.max()
    return {
        "margin": [{"d": d.strftime("%Y-%m"), "pct_gdp": round(p, 5), "real_bn": round(rb, 1)} for d, p, rb in zip(m.date, m.pct_gdp, m.real_bn_today)],
        "margin_now": {"d": m.date.iloc[-1].strftime("%Y-%m"), "usd_bn": float(m.margin_debt_musd.iloc[-1] / 1e3), "pct_gdp": float(m.pct_gdp.iloc[-1])},
        "margin_peak_2000_pct_gdp": float(peak2000),
        "rates": [{"d": d.strftime("%Y-%m"), "y3m": round(a, 2), "curve": round(c, 2) if pd.notna(c) else None}
                  for d, a, c in zip(r.date, r.y3m, r.curve_10y_2y)],
        "rates_now": {k: float(v) for k, v in r.iloc[-1][["y3m", "y10y", "curve_10y_2y"]].items()},
        "rates_2000": {k: float(v) for k, v in r.set_index("date").loc["2000-03-01", ["y3m", "y10y", "curve_10y_2y"]].items()},
    }


def gauge(sh: pd.DataFrame, prices: pd.DataFrame, margin: pd.DataFrame, gdp: pd.DataFrame) -> dict:
    """Bubble gauge: average of four percentiles, each against its own full history.

    Valuation (CAPE), speed (Nasdaq's 3-year real gain), leverage (margin debt / GDP), and how far
    prices sit above their 10-year trend. Percentiles use the whole sample, so the gauge describes
    where a month sits in history; it is not a forecast on its own."""
    s = sh.set_index(pd.to_datetime(sh.date))
    cpi = s.cpi.dropna()
    nas = prices[prices.symbol == "^IXIC"].set_index(pd.to_datetime(prices[prices.symbol == "^IXIC"].date)).close
    nas_real = nas / cpi.reindex(nas.index, method="ffill")
    speed = nas_real.pct_change(36)
    trend = nas_real / nas_real.rolling(120).mean() - 1
    m = margin.set_index(pd.to_datetime(margin.date)).margin_debt_musd
    g = gdp.set_index("year").gdp_usd
    lev = pd.Series([v * 1e6 / g.get(min(d.year, g.index.max())) for d, v in m.items()], index=m.index)
    df = pd.DataFrame({"cape": s.cape, "speed": speed, "leverage": lev, "trend": trend}).dropna()
    pct = df.rank(pct=True)
    pct["gauge"] = pct.mean(axis=1)
    pct.to_csv(A / "bubble_gauge.csv")
    top = pct.gauge.nlargest(1)
    return {"series": [{"d": d.strftime("%Y-%m"), "g": round(float(v), 3)} for d, v in pct.gauge.items()],
            "now": {"d": pct.index[-1].strftime("%Y-%m"), **{k: round(float(v), 3) for k, v in pct.iloc[-1].items()}},
            "mar2000": {k: round(float(v), 3) for k, v in pct.loc["2000-03-01"].items()},
            "max": {"d": top.index[0].strftime("%Y-%m"), "g": round(float(top.iloc[0]), 3)},
            "start": pct.index[0].strftime("%Y-%m")}


def months_to(values: pd.Series, target: float, window: int, log: bool = True) -> float | None:
    """Months until a straight-line fit of the last `window` months reaches `target` (None if it's heading away)."""
    y = np.log(values.iloc[-window:].to_numpy()) if log else values.iloc[-window:].to_numpy()
    t = math.log(target) if log else target
    slope, icept = np.polyfit(np.arange(window), y, 1)
    now = icept + slope * (window - 1)
    if now >= t:
        return 0.0
    return (t - now) / slope if slope > 0 else None


def projection(sh: pd.DataFrame, ov: dict) -> dict:
    """When would the top come if everything keeps going as it is? Four clocks, each a scenario, not a forecast.

    Two run at 1999's pace (the dot-com calendar; time from CAPE first crossing 40 to the Nasdaq's top),
    two at today's pace (CAPE and the Nasdaq extended on their last 24 months' trend until they reach
    the dot-com highs). 12- and 36-month fits give each pace clock its range."""
    s = sh.dropna(subset=["cape"]).set_index("date").cape
    asof = s.index[-1]
    start, top = pd.Timestamp(STARTS["ai"]), ov["dotcom_peak"]
    nas = pd.Series([m["nasdaq"] for m in ov["ai"]["months"]], index=pd.to_datetime([m["d"] for m in ov["ai"]["months"]]))
    ahead = lambda m: (asof + pd.DateOffset(months=round(m))).strftime("%Y-%m")
    crossed_then = s[(s >= 40) & (s.index < "2002-01-01")].index[0]
    crossed_now = s[(s >= 40) & (s.index > "2002-01-01")].index[0]
    lag = (pd.Timestamp(top["date"]).year - crossed_then.year) * 12 + pd.Timestamp(top["date"]).month - crossed_then.month
    clocks = [
        {"id": "calendar", "pace": "1999", "name": "The dot-com calendar",
         "how": f"The dot-com run topped in month {top['month']} after Netscape's IPO. Month {top['month']} after ChatGPT.",
         "date": (start + pd.DateOffset(months=top["month"])).strftime("%Y-%m")},
        {"id": "cape40", "pace": "1999", "name": "The 40 line",
         "how": f"CAPE first passed 40 in {crossed_then:%b %Y}; the Nasdaq topped {lag} months later. This time it passed 40 in {crossed_now:%b %Y}.",
         "date": (crossed_now + pd.DateOffset(months=lag)).strftime("%Y-%m")},
    ]
    for cid, name, series, target in [
        ("cape", "Valuation at today's pace", s, float(s["1999-01-01":"2000-12-01"].max())),
        ("nasdaq", "Prices at today's pace", nas, top["nasdaq"]),
    ]:
        m = {w: months_to(series, target, w) for w in (12, 24, 36)}
        rate = math.exp(np.polyfit(np.arange(24), np.log(series.iloc[-24:].to_numpy()), 1)[0] * 12) - 1
        clocks.append({"id": cid, "pace": "today", "name": name, "rate": rate,
                       "how": (f"CAPE has risen {rate:.0%} a year over the last two years. At that pace it reaches its 2000 peak of {target:.1f}."
                               if cid == "cape" else
                               f"The Nasdaq has risen {rate:.0%} a year over the last two years. At that pace it reaches the dot-com top: ×{target / 100:.1f} from the start."),
                       "date": ahead(m[24]), "range": [ahead(min(v for v in m.values() if v is not None)), ahead(max(v for v in m.values() if v is not None))]})
    ds = sorted(pd.Timestamp(c["date"]) for c in clocks)
    mid = round(sum(d.year * 12 + d.month - 1 for d in ds[1:3]) / 2)  # median of four: halfway between the middle two
    central = pd.Timestamp(mid // 12, mid % 12 + 1, 1)
    out = {"as_of": asof.strftime("%Y-%m"), "clocks": clocks, "central": central.strftime("%Y-%m"),
           "window": [ds[0].strftime("%Y-%m"), ds[-1].strftime("%Y-%m")],
           "months_ahead": (central.year - asof.year) * 12 + central.month - asof.month, "dotcom_fall": top["fall"]}
    # Self-checks: the clocks are anchored to known dot-com dates and must land after today.
    assert top["date"] == "2000-02" and crossed_then.strftime("%Y-%m") == "1999-01", (top, crossed_then)
    assert all(pd.Timestamp(c["date"]) >= asof for c in clocks), clocks
    pd.DataFrame(clocks).to_csv(A / "projection_clocks.csv", index=False)
    return out


def soft_landing(sh: pd.DataFrame, prices: pd.DataFrame, fin: pd.DataFrame, story: dict) -> dict:
    """What would let the boom deflate instead of burst: four conditions, each read from data already in the story.

    The catch-up maths: if prices go nowhere, how many years of earnings growth bring the leaders' combined
    P/E down to the S&P 500's median since 1990? Growth is the leaders' combined net income, 2023 to 2025."""
    mv, lv, sp, odds = story["market_value"], story["leverage"], story["spending"], story["odds"]
    px = prices.assign(date=pd.to_datetime(prices.date))
    def fall(sym, a, b):  # peak inside [a, b], then the lowest point in the three years after it
        c = px[px.symbol == sym].set_index("date").adjclose
        pk = c[a:b].idxmax()
        return pk.strftime("%Y-%m"), float(c[pk:pk + pd.DateOffset(years=3)].min() / c[pk] - 1)
    priced = [c for c in mv["companies"] if c["pe"]]
    pe_now = sum(c["mcap"] for c in priced) / sum(c["mcap"] / c["pe"] for c in priced)
    syms = [c["symbol"] for c in priced]
    ni = fin[fin.symbol.isin(syms)].pivot(index="year", columns="symbol", values="net_income")
    growth = float((ni.loc[2025].sum() / ni.loc[2023].sum()) ** 0.5 - 1)
    pe_sh = (sh.set_index("date").price / sh.set_index("date").earnings).dropna()
    target = float(pe_sh["1990":].median())
    years = lambda g: math.log(pe_now / target) / math.log(1 + g)
    last = sp["rows"][-1]
    capex_ni = [{"year": r["year"], "ratio": r["capex"] / r["net_income"]} for r in sp["rows"]]
    nas_pk, nas_fall = fall("^IXIC", "2021-01-01", "2021-12-01")
    nas = px[px.symbol == "^IXIC"].set_index("date").close
    pk = pd.Timestamp(nas_pk)
    back = nas[(nas.index > pk) & (nas >= nas[pk])].index[0].strftime("%Y-%m")  # first month back at the old high
    calm = odds["high_cape_episodes"][-1]
    out = {
        "dotcom_leaders": [{"symbol": s, "peak": d, "fall": f} for s in ["CSCO", "INTC", "ORCL", "MSFT"] for d, f in [fall(s, "1999-01-01", "2000-12-01")]],
        "catch_up": {"pe_now": pe_now, "target": target, "growth": growth, "symbols": syms,
                     "years": {"today": years(growth), "half": years(growth / 2), "slow": years(0.10)}},
        "capex_to_profit": {"series": capex_ni, "now": last["capex"] / last["net_income"], "year": last["year"],
                            "before": max(r["ratio"] for r in capex_ni if r["year"] <= 2021)},
        "precedent": {"start": calm["start"], "peak_cape": calm["peak_cape"], "worst_fall": calm["worst_fall_36m"],
                      "nasdaq_peak": nas_pk, "nasdaq_fall": nas_fall, "nasdaq_back": back},
        "conditions": [
            {"id": "profits", "ok": years(growth / 2) <= 3},
            {"id": "funding", "ok": last["capex"] / last["net_income"] < 1},
            {"id": "rates", "ok": lv["rates_now"]["curve_10y_2y"] > 0 and lv["rates_now"]["y3m"] < lv["rates_2000"]["y3m"]},
            {"id": "leverage", "ok": lv["margin_now"]["pct_gdp"] < lv["margin_peak_2000_pct_gdp"]},
        ],
    }
    # Self-checks against well-known history: Cisco lost ~86% after March 2000; the 2022 Nasdaq fall was ~1/3.
    assert out["dotcom_leaders"][0]["peak"] == "2000-03" and -0.9 < out["dotcom_leaders"][0]["fall"] < -0.8, out["dotcom_leaders"]
    assert -0.4 < nas_fall < -0.25, nas_fall
    assert 18 < target < 26, target
    return out


if __name__ == "__main__":
    A.mkdir(parents=True, exist_ok=True)
    sh = load("shiller_monthly", parse_dates=["date"])
    prices, fin, shares = load("prices_monthly"), load("financials"), load("shares_quarterly")
    rates, margin, gdp = load("rates_monthly"), load("margin_monthly"), load("gdp_annual")
    story = {
        "valuation": valuation(sh), "odds": crash_odds(sh), "overlay": overlay(prices), "spending": spending(fin),
        "market_value": market_value(prices, shares, gdp, fin),
        "leverage": leverage_and_rates(margin, rates, gdp, sh), "gauge": gauge(sh, prices, margin, gdp),
    }
    story["projection"] = projection(sh, story["overlay"])
    story["soft_landing"] = soft_landing(sh, prices, fin, story)
    APP.parent.mkdir(parents=True, exist_ok=True)
    APP.write_text(json.dumps(story, indent=1, default=str))
    v, o, sp, mv, lv, gg = story["valuation"], story["odds"], story["spending"], story["market_value"], story["leverage"], story["gauge"]
    print(f"wrote {APP.relative_to(ROOT)} ({APP.stat().st_size // 1024} KB)")
    print(f"CAPE {v['as_of']}: {v['cape']:.1f}, higher than {v['percentile']:.1%} of months; higher only in {v['higher_periods']}; peaks {v['peaks']}")
    for b in o["bands"]:
        print(f"  CAPE {b['band']:>6}: months {b['months']:4} episodes {b['episodes']:2} P(fall>=30% in 3y) {b['p_crash30']:.0%} "
              f"P(fall>=20%) {b['p_fall20']:.0%} median 10y real return {b['real_return_10y'] if b['real_return_10y'] is None else round(b['real_return_10y']*100,1)}%")
    print("  high-CAPE episodes:", o["high_cape_episodes"])
    print("  episodes crashed:", [(b["band"], b["episodes_crashed"], b["episodes"], [round(x, 2) for x in b["ci_episodes"]]) for b in o["bands"]])
    ov = story["overlay"]
    print(f"overlay: AI month {ov['ai_now']['m']} nasdaq {ov['ai_now']['nasdaq']} leaders {ov['ai_now']['leaders']} | dot-com same month {ov['dotcom_same_month']} | dot-com peak {ov['dotcom_peak']}")
    print("capex:", [(r['year'], round(r['capex']/1e9), f"{r['intensity']:.0%}") for r in sp["rows"]])
    print(f"AI-7 market value {mv['as_of']}: ${mv['total']/1e12:.1f}tn = {mv['pct_gdp']:.0%} of US GDP;",
          [(c['symbol'], round(c['mcap']/1e12, 2), c['pe'] and round(c['pe']), round(c['ps'], 1), c['fy'], c['rev_year']) for c in mv["companies"]])
    print(f"margin {lv['margin_now']}, 2000 peak {lv['margin_peak_2000_pct_gdp']:.2%}; rates now {lv['rates_now']} vs Mar 2000 {lv['rates_2000']}")
    pj = story["projection"]
    print(f"projection: central {pj['central']} ({pj['months_ahead']} months), window {pj['window']}:", [(c["id"], c["date"], c.get("range")) for c in pj["clocks"]])
    sl = story["soft_landing"]
    print("soft landing:", {k: v for k, v in sl.items() if k != "capex_to_profit"}, "capex/profit now", round(sl["capex_to_profit"]["now"], 2))
    print(f"gauge now {gg['now']} | Mar 2000 {gg['mar2000']} | max {gg['max']} since {gg['start']}")
