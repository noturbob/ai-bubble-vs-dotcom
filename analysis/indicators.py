"""Measure today's AI boom against the dot-com bubble, and what history says comes next.

In:  data/processed/*.csv
Out: data/analysis/*.csv and app/data/story.json (the only file the story app reads)
Run: uv run python analysis/indicators.py

Every number is computed in SQL (DuckDB), one question per file in sql/. Python runs the files in
order, shapes the results into the nested JSON the app reads, writes the sentences that explain the
projection, and checks the results against well-known history. The SQL text is copied into
story.json so the site can show the query behind each chart.
"""
import csv
import json
import os
from datetime import date
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
SQL = ROOT / "sql"
A = ROOT / "data/analysis"
APP = ROOT / "app/data/story.json"
STARTS = {"dotcom": "1995-08-01", "ai": "2022-11-01"}
HORIZON = 36  # months ahead for "did a crash follow?"

con = duckdb.connect()


def sql(name: str) -> list[dict]:
    """Run sql/<name>.sql (every statement in it) and return the last statement's rows as dicts."""
    con.execute((SQL / f"{name}.sql").read_text())
    cols = [d[0] for d in con.description] if con.description else []
    return [dict(zip(cols, r)) for r in con.fetchall()] if cols else []


def ym(d: date) -> str:
    return d.strftime("%Y-%m")


def mon(d: date) -> str:
    return d.strftime("%b %Y")


def valuation() -> dict:
    v = sql("01_valuation")[0]
    return {**{k: v[k] for k in ("as_of", "cape", "percentile", "median", "months_higher", "months", "higher_periods")},
            "peaks": {"1929": v["peak_1929"], "2000": v["peak_2000"], "2021": v["peak_2021"]},
            "series": sql("02_valuation_series")}


def crash_odds() -> dict:
    sql("03_crash_odds_by_month")
    return {"bands": sql("04_crash_odds_by_band"), "high_cape_episodes": sql("05_high_cape_episodes"), "horizon_months": HORIZON}


def overlay() -> dict:
    sql("06_boom_overlay")
    rows = con.execute("SELECT era, m, d, nasdaq, leaders FROM boom_overlay ORDER BY era DESC, m").fetchall()
    out = {era: {"start": start, "months": [{"m": m, "d": d, "nasdaq": n, "leaders": b} for e, m, d, n, b in rows if e == era]}
           for era, start in STARTS.items()}
    out["dotcom_peak"] = sql("07_dotcom_peak")[0]
    out["ai_now"] = out["ai"]["months"][-1]
    out["dotcom_same_month"] = next(x for x in out["dotcom"]["months"] if x["m"] == out["ai_now"]["m"])
    return out


def spending() -> dict:
    rows = sql("08_buildout")
    years = [r["year"] for r in rows]
    by: dict[str, dict] = {}
    for r in sql("11_buildout_by_company"):
        by.setdefault(r["symbol"], {})[r["year"]] = r["capex"]
    return {"rows": rows, "by_company": {s: [v.get(y) for y in years] for s, v in sorted(by.items())}, "years": years}


def market_value() -> dict:
    companies = sql("09_market_value")
    as_of, total, pct_gdp, gdp_year = con.execute("""SELECT strftime(max(date), '%Y-%m'), arg_max(total, date), arg_max(pct_gdp, date),
                                                     (SELECT max(year) FROM gdp) FROM leaders_total""").fetchone()
    return {"as_of": as_of, "series": sql("10_market_value_series"), "companies": companies,
            "total": total, "pct_gdp": pct_gdp, "gdp_year": gdp_year}


def leverage_and_rates() -> dict:
    margin = sql("12_leverage")
    now = con.execute("SELECT strftime(max(date), '%Y-%m'), arg_max(margin_debt_musd, date) / 1e3, arg_max(pct_gdp, date) FROM leverage").fetchone()
    peak = con.execute("SELECT max(pct_gdp) FROM leverage WHERE date BETWEEN '1999-01-01' AND '2001-12-01'").fetchone()[0]
    rates = sql("13_rates")
    pick = lambda r: {"y3m": r["y3m"], "y10y": r["y10y"], "curve_10y_2y": r["curve_10y_2y"]}  # noqa: E731
    return {"margin": margin, "margin_now": {"d": now[0], "usd_bn": now[1], "pct_gdp": now[2]}, "margin_peak_2000_pct_gdp": peak,
            # Display rounding happens here: Python and DuckDB break rounding ties differently.
            "rates": [{"d": r["d"], "y3m": round(r["y3m"], 2), "curve": None if r["curve_10y_2y"] is None else round(r["curve_10y_2y"], 2)}
                      for r in rates],
            "rates_now": pick(rates[-1]), "rates_2000": pick(next(r for r in rates if r["d"] == "2000-03"))}


def gauge() -> dict:
    series = [{"d": r["d"], "g": round(r["g"], 3)} for r in sql("14_bubble_gauge")]
    cols = "cape, speed, leverage, trend, gauge"
    r3 = lambda row: {k: round(v, 3) for k, v in zip(cols.split(", "), row)}  # noqa: E731
    now = con.execute(f"SELECT strftime(max(date), '%Y-%m'), {', '.join(f'arg_max({c}, date)' for c in cols.split(', '))} FROM gauge").fetchone()
    mar = con.execute(f"SELECT {cols} FROM gauge WHERE date = '2000-03-01'").fetchone()
    top = max(series, key=lambda x: x["g"])
    return {"series": series, "now": {"d": now[0], **r3(now[1:])}, "mar2000": r3(mar),
            "max": {"d": top["d"], "g": top["g"]}, "start": series[0]["d"]}


def projection(ov: dict) -> dict:
    """The four clocks come from sql/15_projection.sql; here they get their names and explanations."""
    summary = sql("15_projection")[0]
    clocks = {r[0]: dict(zip(["id", "pace", "date", "range_lo", "range_hi", "rate"], r))
              for r in con.execute("SELECT * FROM projection_clocks").fetchall()}
    top = ov["dotcom_peak"]
    lag = (int(top["date"][:4]) - summary["crossed_then"].year) * 12 + int(top["date"][5:]) - summary["crossed_then"].month
    cape_target = valuation_peak_2000()
    text = {
        "calendar": ("The dot-com calendar", f"The dot-com run topped in month {top['month']} after Netscape's IPO. Month {top['month']} after ChatGPT."),
        "cape40": ("The 40 line", f"CAPE first passed 40 in {mon(summary['crossed_then'])}; the Nasdaq topped {lag} months later. "
                                  f"This time it passed 40 in {mon(summary['crossed_now'])}."),
        "cape": ("Valuation at today's pace", f"CAPE has risen {clocks['cape']['rate']:.0%} a year over the last two years. "
                                              f"At that pace it reaches its 2000 peak of {cape_target:.1f}."),
        "nasdaq": ("Prices at today's pace", f"The Nasdaq has risen {clocks['nasdaq']['rate']:.0%} a year over the last two years. "
                                             f"At that pace it reaches the dot-com top: ×{top['nasdaq'] / 100:.1f} from the start."),
    }
    out_clocks = []
    for cid in ("calendar", "cape40", "cape", "nasdaq"):
        c = clocks[cid]
        row = {"id": cid, "pace": c["pace"], "name": text[cid][0], "how": text[cid][1], "date": ym(c["date"])}
        if c["pace"] == "today":
            row = {"id": cid, "pace": c["pace"], "name": text[cid][0], "rate": c["rate"], "how": text[cid][1],
                   "date": ym(c["date"]), "range": [ym(c["range_lo"]), ym(c["range_hi"])]}
        out_clocks.append(row)
    as_of = con.execute("SELECT max(date) FROM shiller WHERE cape IS NOT NULL").fetchone()[0]
    # Self-checks: the clocks are anchored to known dot-com dates and must land after today.
    assert top["date"] == "2000-02" and ym(summary["crossed_then"]) == "1999-01", (top, summary)
    assert all(c["date"] >= as_of for c in clocks.values()), clocks
    with open(A / "projection_clocks.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "pace", "name", "how", "date", "rate", "range"])
        w.writeheader()
        w.writerows(out_clocks)
    return {"as_of": ym(as_of), "clocks": out_clocks, "central": ym(summary["central"]),
            "window": [ym(summary["lo"]), ym(summary["hi"])], "months_ahead": summary["months_ahead"], "dotcom_fall": top["fall"]}


def valuation_peak_2000() -> float:
    return con.execute("SELECT max(cape) FROM shiller WHERE date BETWEEN '1999-01-01' AND '2000-12-01'").fetchone()[0]


def backtest() -> dict:
    """The valuation clock run in the months before 1929, 2000 and 2021's tops (sql/18_backtest.sql)."""
    rows = sql("18_backtest")
    tops = []
    for top in dict.fromkeys(r["top"] for r in rows):
        own = [r for r in rows if r["top"] == top]
        tops.append({"top": top, "previous_record": own[0]["previous_record"],
                     "checks": [{"months_before": r["months_before_top"], "as_of": r["as_of"], "cape": r["cape"],
                                 "predicted": r["predicted_top"], "error": r["error_months"]} for r in own if r["months_before_top"] in (12, 6, 3)]})
    # Known history: in 1999 CAPE was already past the 1929 record, so the clock said "now" two years early.
    assert all(c["error"] == -c["months_before"] for c in tops[1]["checks"]), tops[1]
    return {"tops": tops}


def soft_landing(story: dict) -> dict:
    """Four conditions for the boom to deflate instead of burst, each read from numbers already computed in SQL."""
    falls = {r["symbol"]: r for r in sql("17_falls")}
    c = sql("16_soft_landing")[0]
    lv, rows = story["leverage"], story["spending"]["rows"]
    ratios = [{"year": r["year"], "ratio": r["capex"] / r["net_income"]} for r in rows]
    calm, nas = story["odds"]["high_cape_episodes"][-1], falls["^IXIC"]
    out = {
        "dotcom_leaders": [{"symbol": s, "peak": falls[s]["peak"], "fall": falls[s]["fall"]} for s in ("CSCO", "INTC", "ORCL", "MSFT")],
        "catch_up": {"pe_now": c["pe_now"], "target": c["target"], "growth": c["growth"], "symbols": c["symbols"],
                     "years": {"today": c["years_today"], "half": c["years_half"], "slow": c["years_slow"]}},
        "capex_to_profit": {"series": ratios, "now": ratios[-1]["ratio"], "year": rows[-1]["year"],
                            "before": max(r["ratio"] for r in ratios if r["year"] <= 2021)},
        "precedent": {"start": calm["start"], "peak_cape": calm["peak_cape"], "worst_fall": calm["worst_fall_36m"],
                      "nasdaq_peak": nas["peak"], "nasdaq_fall": nas["fall"], "nasdaq_back": nas["back"]},
        "conditions": [
            {"id": "profits", "ok": c["years_half"] <= 3},
            {"id": "funding", "ok": ratios[-1]["ratio"] < 1},
            {"id": "rates", "ok": lv["rates_now"]["curve_10y_2y"] > 0 and lv["rates_now"]["y3m"] < lv["rates_2000"]["y3m"]},
            {"id": "leverage", "ok": lv["margin_now"]["pct_gdp"] < lv["margin_peak_2000_pct_gdp"]},
        ],
    }
    # Self-checks against well-known history: Cisco lost ~86% after March 2000; the 2022 Nasdaq fall was ~1/3.
    assert out["dotcom_leaders"][0]["peak"] == "2000-03" and -0.9 < out["dotcom_leaders"][0]["fall"] < -0.8, out["dotcom_leaders"]
    assert -0.4 < nas["fall"] < -0.25, nas
    assert 18 < c["target"] < 26, c
    return out


if __name__ == "__main__":
    os.chdir(ROOT)  # the SQL files use paths relative to the project root
    A.mkdir(parents=True, exist_ok=True)
    sql("00_sources")
    story = {"valuation": valuation(), "odds": crash_odds(), "overlay": overlay(), "spending": spending(),
             "market_value": market_value(), "leverage": leverage_and_rates(), "gauge": gauge()}
    story["projection"] = projection(story["overlay"])
    story["soft_landing"] = soft_landing(story)
    story["backtest"] = backtest()
    story["sql"] = {f.stem: f.read_text() for f in sorted(SQL.glob("*.sql"))}
    APP.parent.mkdir(parents=True, exist_ok=True)
    APP.write_text(json.dumps(story, indent=1, default=str))
    v, ov, pj, gg = story["valuation"], story["overlay"], story["projection"], story["gauge"]
    print(f"wrote {APP.relative_to(ROOT)} ({APP.stat().st_size // 1024} KB)")
    print(f"CAPE {v['as_of']}: {v['cape']:.1f}, higher than {v['percentile']:.1%} of months")
    print(f"overlay: AI month {ov['ai_now']['m']} nasdaq {ov['ai_now']['nasdaq']} | dot-com peak {ov['dotcom_peak']}")
    print(f"projection: central {pj['central']} ({pj['months_ahead']} months), window {pj['window']}")
    print(f"gauge now {gg['now']['gauge']} | Mar 2000 {gg['mar2000']['gauge']}")
