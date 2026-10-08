-- For every month since 1881: the worst fall in the next 36 months, and the next ten years'
-- yearly return after inflation with dividends reinvested.
CREATE OR REPLACE TABLE crash_by_month AS
WITH s AS (
    SELECT date, price, cape, price / cpi AS real_price,
           row_number() OVER (ORDER BY date)               AS i,
           count(*) OVER ()                                AS n,
           coalesce(dividend / price, 0) / 12              AS monthly_yield
    FROM shiller
    WHERE price IS NOT NULL AND cpi IS NOT NULL
), tr AS (                    -- real total return index: compound the monthly dividend yield
    SELECT *, real_price * exp(sum(ln(1 + monthly_yield)) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) AS total_return
    FROM s
)
SELECT date, cape,
       min(price) OVER (ORDER BY date ROWS BETWEEN 1 FOLLOWING AND 36 FOLLOWING) / price - 1          AS drawdown_36m,
       CASE WHEN i + 120 <= n
            THEN (lead(total_return, 120) OVER (ORDER BY date) / total_return) ^ (1 / 10) - 1 END       AS real_return_10y
FROM tr
QUALIFY cape IS NOT NULL AND i + 36 <= n;      -- windows see every month; keep those with 36 months ahead

COPY (SELECT strftime(date, '%Y-%m') AS date, cape, drawdown_36m, real_return_10y FROM crash_by_month ORDER BY date)
TO 'data/analysis/crash_odds_by_month.csv' (HEADER);
