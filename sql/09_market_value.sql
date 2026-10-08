-- What the seven AI leaders are worth, month by month: price times shares outstanding. Each month's
-- price is matched to the latest share count filed by the end of that month (an ASOF join).
CREATE OR REPLACE TABLE leader_mcap AS
SELECT p.date, p.symbol, p.close * s.diluted_shares AS mcap
FROM prices p
ASOF JOIN shares s ON s.symbol = p.symbol AND last_day(p.date) >= s."end"
WHERE p.symbol IN ('NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'ORCL') AND s.diluted_shares IS NOT NULL;

CREATE OR REPLACE TABLE leaders_total AS          -- only months when all seven have a value
SELECT date, sum(mcap) AS total, sum(mcap) / gdp_at(date) AS pct_gdp
FROM leader_mcap GROUP BY date HAVING count(*) = 7;

COPY (SELECT strftime(date, '%Y-%m') AS d, total, pct_gdp FROM leaders_total ORDER BY date)
TO 'data/analysis/ai_leaders_market_value.csv' (HEADER);

-- Today's value, P/E and price-to-sales for each. A P/E from a profit year older than last year
-- isn't today's P/E, so it's left out.
CREATE OR REPLACE TABLE leader_now AS
WITH latest AS (SELECT max(date) AS date FROM leaders_total),
profit AS (SELECT symbol, arg_max(net_income, year) AS net_income, max(year) AS fy FROM financials WHERE net_income IS NOT NULL GROUP BY symbol),
sales  AS (SELECT symbol, arg_max(revenue, year) AS revenue, max(year) AS rev_year FROM financials WHERE revenue IS NOT NULL GROUP BY symbol)
SELECT m.symbol, m.mcap,
       CASE WHEN p.fy >= year(l.date) - 1 THEN m.mcap / p.net_income END AS pe,
       m.mcap / s.revenue AS ps, p.fy, s.rev_year
FROM leader_mcap m JOIN latest l ON m.date = l.date JOIN profit p USING (symbol) JOIN sales s USING (symbol)
ORDER BY list_position(['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'ORCL'], m.symbol);

SELECT * FROM leader_now ORDER BY list_position(['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'ORCL'], symbol);
