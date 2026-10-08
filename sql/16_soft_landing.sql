-- What would let the boom deflate instead of burst?
-- The catch-up maths: if prices go nowhere, how many years of profit growth bring the leaders'
-- combined P/E down to the S&P 500's median since 1990? Growth is their combined net income,
-- 2023 to 2025, as a yearly rate; it is also shown at half that pace and at 10% a year.
WITH priced AS (                         -- leaders with a current P/E (see 09_market_value.sql)
    SELECT symbol, mcap, pe FROM leader_now WHERE pe IS NOT NULL
), pe_now AS (
    SELECT sum(mcap) / sum(mcap / pe) AS pe FROM priced
), growth AS (
    SELECT (sum(net_income) FILTER (WHERE year = 2025) / sum(net_income) FILTER (WHERE year = 2023)) ^ 0.5 - 1 AS g
    FROM financials WHERE symbol IN (SELECT symbol FROM priced)
), norm AS (
    SELECT median(price / earnings) AS pe FROM shiller WHERE date >= '1990-01-01' AND earnings IS NOT NULL AND price IS NOT NULL
)
SELECT p.pe AS pe_now, n.pe AS target, g.g AS growth,
       ln(p.pe / n.pe) / ln(1 + g.g)     AS years_today,
       ln(p.pe / n.pe) / ln(1 + g.g / 2) AS years_half,
       ln(p.pe / n.pe) / ln(1.10)        AS years_slow,
       (SELECT list(symbol ORDER BY list_position(['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'ORCL'], symbol)) FROM priced) AS symbols
FROM pe_now p, norm n, growth g;
