"""Every external file this project uses: where it comes from and what it is for.

01_download.py fetches these into data/raw/ and records checksums in data/raw/MANIFEST.csv.
Nothing in data/raw/ is ever edited by hand.
"""

# --- Robert Shiller's long-run US stock market data (shillerdata.com) ---------------------------
# Monthly S&P Composite price, dividends, earnings, CPI and the cyclically adjusted P/E (CAPE)
# from 1871. Used for: valuation vs 150 years of history, and how often each valuation level was
# followed by a crash. The old Yale copy stopped updating in 2023; this is the link published on
# shillerdata.com (its path changes when he uploads a new version).
SHILLER = ("shiller/ie_data.xls",
           "https://img1.wsimg.com/blobby/go/e5e77e0b-59d1-44d9-ab25-4763ac982e53/downloads/"
           "1449043e-a1ed-4e2e-8e9c-7b9a2a064493/ie_data.xls?ver=1791297298731")

# --- Monthly prices (Yahoo Finance chart API, dividends/splits adjusted) ---------------------------
# Indexes plus the leaders of each boom. Used for: overlaying the dot-com run on the AI run, and
# market values (price x shares outstanding from SEC filings).
# Explicit period1/period2: with range=max Yahoo silently drops to quarterly points.
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1=0&period2=9999999999&interval=1mo&events=div%2Csplit"
TICKERS = {
    "^GSPC": "S&P 500 index",
    "^IXIC": "Nasdaq Composite index",
    # AI boom leaders
    "NVDA": "Nvidia", "MSFT": "Microsoft", "GOOGL": "Alphabet", "AMZN": "Amazon",
    "META": "Meta", "AVGO": "Broadcom", "ORCL": "Oracle",
    # dot-com boom leaders
    "CSCO": "Cisco", "INTC": "Intel", "QCOM": "Qualcomm",
}

# --- Company financials from SEC filings (XBRL "company facts", 2009 onward) --------------------
# Revenue, capital expenditure, net income and shares outstanding as filed in 10-K/10-Q reports.
# Used for: how much the AI builders spend vs what they earn, and their valuations.
SEC = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
CIKS = {"NVDA": 1045810, "MSFT": 789019, "GOOGL": 1652044, "AMZN": 1018724,
        "META": 1326801, "ORCL": 1341439, "AVGO": 1730168}

# --- Federal Reserve H.15: Treasury yields, daily, all maturities ---------------------------------
# Used for: the yield curve (10-year minus 2-year) and the 3-month yield, which tracks the Fed's
# policy rate. Bubbles in 1929, 2000 and 2007 all ran into rising rates.
FED_H15 = ("fed/h15_treasury_yields.csv",
           "https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=bf17364827e38702b42a58cf8eaa3f78"
           "&lastobs=&from=&to=&filetype=csv&label=include&layout=seriescolumn")

# --- FINRA margin statistics: money borrowed against stocks, monthly since 1997 -----------------
FINRA = ("finra/margin-statistics.xlsx", "https://www.finra.org/sites/default/files/2021-03/margin-statistics.xlsx")

# --- World Bank: US GDP in current dollars, annual. Used to scale market values and margin debt. --
WORLD_BANK_GDP = ("worldbank/us_gdp.json",
                  "https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json&per_page=100")


def all_sources():
    """(local path under data/raw, url, purpose) for every file."""
    yield (*SHILLER, "S&P 500 price, earnings and CAPE since 1871")
    for sym, name in TICKERS.items():
        yield f"yahoo/{sym.lstrip('^')}.json", YAHOO.format(sym=sym.replace("^", "%5E")), f"Monthly prices: {name}"
    for sym, cik in CIKS.items():
        yield f"sec/{sym}.json", SEC.format(cik=cik), f"Filed financials: {TICKERS[sym]}"
    yield (*FED_H15, "Treasury yield curve, daily")
    yield (*FINRA, "Margin debt, monthly since 1997")
    yield (*WORLD_BANK_GDP, "US GDP, annual")
