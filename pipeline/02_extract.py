"""Turn the raw files into tidy monthly/annual tables, with sanity checks against known values.

In:  data/raw/**  (see sources.py)
Out: data/processed/shiller_monthly.csv   date, price, dividend, earnings, cpi, gs10, cape
     data/processed/prices_monthly.csv    date, symbol, close (split-adjusted), adjclose (+ dividends)
     data/processed/financials.csv        symbol, year, revenue, capex, net_income, diluted_shares (SEC, calendar-year frames)
     data/processed/shares_quarterly.csv  symbol, end, diluted_shares (split-adjusted to today's share count)
     data/processed/rates_monthly.csv     date, y3m, y2y, y10y, curve_10y_2y
     data/processed/margin_monthly.csv    date, margin_debt_musd
     data/processed/gdp_annual.csv        year, gdp_usd
Run: uv run python pipeline/02_extract.py
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "data/raw", ROOT / "data/processed"
sys.path.insert(0, str(Path(__file__).parent))
from sources import CIKS, TICKERS  # noqa: E402

# First label present wins, per year. Companies switch labels over time (e.g. ASC 606 in 2018).
CONCEPTS = {
    "revenue": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
    "net_income": ["NetIncomeLoss"],
    "diluted_shares": ["WeightedAverageNumberOfDilutedSharesOutstanding"],
}


def shiller() -> pd.DataFrame:
    x = pd.read_excel(RAW / "shiller/ie_data.xls", sheet_name="Data", header=None, skiprows=8)
    x = x[pd.to_numeric(x[0], errors="coerce").notna()]
    # Dates are decimals: 2026.01 = January, 2026.1 = October (the trailing zero is lost).
    year = x[0].astype(float).floordiv(1).astype(int)
    month = ((x[0].astype(float) - year) * 100).round().astype(int)
    df = pd.DataFrame({
        "date": pd.to_datetime({"year": year, "month": month, "day": 1}),
        "price": pd.to_numeric(x[1], errors="coerce"), "dividend": pd.to_numeric(x[2], errors="coerce"),
        "earnings": pd.to_numeric(x[3], errors="coerce"), "cpi": pd.to_numeric(x[4], errors="coerce"),
        "gs10": pd.to_numeric(x[6], errors="coerce"), "cape": pd.to_numeric(x[12], errors="coerce"),
    })
    return df.reset_index(drop=True)


def prices() -> tuple[pd.DataFrame, dict]:
    frames, splits = [], {}
    for sym in TICKERS:
        r = json.load(open(RAW / f"yahoo/{sym.lstrip('^')}.json"))["chart"]["result"][0]
        q = r["indicators"]["quote"][0]
        df = pd.DataFrame({
            "date": pd.to_datetime(r["timestamp"], unit="s").to_period("M").to_timestamp(),
            "symbol": sym, "close": q["close"], "adjclose": r["indicators"]["adjclose"][0]["adjclose"],
        }).dropna(subset=["close"])
        frames.append(df.drop_duplicates("date", keep="last"))
        ev = r.get("events", {}).get("splits", {})
        splits[sym] = sorted((pd.to_datetime(v["date"], unit="s"), v["numerator"] / v["denominator"]) for v in ev.values())
    return pd.concat(frames, ignore_index=True), splits


def sec(splits: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows, quarters = [], []
    for sym in CIKS:
        g = json.load(open(RAW / f"sec/{sym}.json"))["facts"]["us-gaap"]
        years: dict[int, dict] = {}
        for field, names in CONCEPTS.items():
            unit = "shares" if field == "diluted_shares" else "USD"
            for name in names:
                for u in g.get(name, {}).get("units", {}).get(unit, []):
                    frame = u.get("frame", "")
                    if frame.startswith("CY") and len(frame) == 6:  # calendar-year value, deduplicated by SEC
                        years.setdefault(int(frame[2:]), {}).setdefault(field, (u["val"], u["filed"]))
                    elif field == "diluted_shares" and len(frame) == 8 and "Q" in frame:
                        quarters.append({"symbol": sym, "q": frame, "end": pd.Timestamp(u["end"]), "filed": u["filed"],
                                         "diluted_shares": u["val"], "rank": 0})
        # Alphabet only tags diluted shares from 2022; the point-in-time count covers the gap.
        for u in g.get("CommonStockSharesOutstanding", {}).get("units", {}).get("shares", []):
            if len(u.get("frame", "")) == 9:
                quarters.append({"symbol": sym, "q": u["frame"][:8], "end": pd.Timestamp(u["end"]), "filed": u["filed"],
                                 "diluted_shares": u["val"], "rank": 1})
        for y, v in sorted(years.items()):
            row = {"symbol": sym, "year": y, **{k: val for k, (val, _) in v.items()}}
            if "diluted_shares" in v:  # restate in today's shares: only splits after the filing count
                row["diluted_shares"] = v["diluted_shares"][0] * _later_splits(splits[sym], pd.Timestamp(v["diluted_shares"][1]))
            rows.append(row)
    fin = pd.DataFrame(rows)
    sh = (pd.DataFrame(quarters).sort_values(["symbol", "q", "rank"]).drop_duplicates(["symbol", "q"])
          .sort_values(["symbol", "end"]))
    # A share count is as of its filing: later filings already restate earlier periods for splits made
    # before they were filed, so only splits after the filing date are applied.
    sh["diluted_shares"] = [n * _later_splits(splits[s], pd.Timestamp(f)) for s, f, n in sh[["symbol", "filed", "diluted_shares"]].itertuples(index=False)]
    return fin, sh[["symbol", "end", "diluted_shares"]].reset_index(drop=True)


def _later_splits(events: list, after: pd.Timestamp) -> float:
    f = 1.0
    for when, ratio in events:
        if when > after:
            f *= ratio
    return f


def rates() -> pd.DataFrame:
    h = pd.read_csv(RAW / "fed/h15_treasury_yields.csv", skiprows=5, na_values=["ND", "NC"])
    h = h.rename(columns={"Time Period": "date"})
    h["date"] = pd.to_datetime(h["date"])
    m = h.set_index("date")[["RIFLGFCM03_N.B", "RIFLGFCY02_N.B", "RIFLGFCY10_N.B"]].resample("MS").mean()
    m.columns = ["y3m", "y2y", "y10y"]
    m["curve_10y_2y"] = m["y10y"] - m["y2y"]
    return m.reset_index()


def margin() -> pd.DataFrame:
    f = pd.read_excel(RAW / "finra/margin-statistics.xlsx")
    f = f.iloc[:, :2]
    f.columns = ["date", "margin_debt_musd"]
    f["date"] = pd.to_datetime(f["date"].astype(str), format="%Y-%m")
    return f.sort_values("date").reset_index(drop=True)


def gdp() -> pd.DataFrame:
    rows = json.load(open(RAW / "worldbank/us_gdp.json"))[1]
    return pd.DataFrame([{"year": int(r["date"]), "gdp_usd": r["value"]} for r in rows if r["value"]]).sort_values("year")


def check(cond: bool, msg: str, problems: list) -> None:
    if not cond:
        problems.append(msg)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []
    s = shiller()
    p, splits = prices()
    fin, sh = sec(splits)
    r, mg, g = rates(), margin(), gdp()

    # Known values: if any of these drift, a parser broke.
    cape = s.set_index("date")["cape"]
    check(43 < cape["1999-12-01"] < 45, f"CAPE Dec 1999 should be ~44, got {cape['1999-12-01']:.1f}", problems)
    check(30 < cape["1929-09-01"] < 33, f"CAPE Sep 1929 should be ~32, got {cape['1929-09-01']:.1f}", problems)
    nv = fin.set_index(["symbol", "year"])
    check(1.25e11 < nv.loc[("NVDA", 2024), "revenue"] < 1.35e11, "Nvidia CY2024 revenue should be ~$130bn", problems)
    check(nv.loc[("MSFT", 2024), "capex"] > 4e10, "Microsoft CY2024 capex should be > $40bn", problems)
    ix = p[p.symbol == "^IXIC"].set_index("date")["close"]
    check(4500 < ix["2000-02-01"] < 5000, f"Nasdaq Feb 2000 close should be ~4,700, got {ix['2000-02-01']:.0f}", problems)
    check(r.set_index("date").loc["2000-05-01", "y3m"] > 5.5, "3-month yield in May 2000 should be ~5.8%", problems)
    check(len(mg) > 300 and mg.margin_debt_musd.iloc[-1] > mg.margin_debt_musd.iloc[0], "margin debt series looks wrong", problems)
    mcap = {}
    for sym in CIKS:
        q = sh[sh.symbol == sym].set_index("end")["diluted_shares"]
        px = p[p.symbol == sym].set_index("date")["close"]
        mcap[sym] = {d: px[d] * q[q.index <= pd.Timestamp(d) + pd.offsets.MonthEnd(0)].iloc[-1] for d in ["2020-12-01", "2024-12-01"]}
    check(2.8e11 < mcap["NVDA"]["2020-12-01"] < 3.6e11, f"Nvidia market cap Dec 2020 should be ~$320bn, got {mcap['NVDA']['2020-12-01']:.3g}", problems)
    check(1.0e12 < mcap["GOOGL"]["2020-12-01"] < 1.4e12, f"Alphabet market cap Dec 2020 should be ~$1.2tn, got {mcap['GOOGL']['2020-12-01']:.3g}", problems)
    check(3.0e12 < mcap["NVDA"]["2024-12-01"] < 3.6e12, f"Nvidia market cap Dec 2024 should be ~$3.3tn, got {mcap['NVDA']['2024-12-01']:.3g}", problems)
    for sym in CIKS:  # every company needs a recent year of each field
        last = fin[fin.symbol == sym].dropna(subset=["revenue", "capex"]).year.max()
        check(last >= 2024, f"{sym}: latest year with revenue and capex is {last}", problems)

    for name, df in [("shiller_monthly", s), ("prices_monthly", p), ("financials", fin), ("shares_quarterly", sh),
                     ("rates_monthly", r), ("margin_monthly", mg), ("gdp_annual", g)]:
        df.to_csv(OUT / f"{name}.csv", index=False)
        print(f"wrote data/processed/{name}.csv: {len(df)} rows")
    for msg in problems:
        print("CHECK", msg)
    sys.exit(1 if problems else 0)
