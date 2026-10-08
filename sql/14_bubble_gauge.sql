-- The bubble gauge: four readings, each ranked against its own history, then averaged.
--   valuation  CAPE
--   speed      the Nasdaq's real gain over the last 3 years
--   leverage   margin debt as a share of GDP
--   trend      how far the real Nasdaq sits above its 10-year average
-- A rank of 0.9 means higher than 90% of months. Ranks use the whole sample, so the gauge says
-- where a month sits in history; on its own it is not a forecast.
CREATE OR REPLACE TABLE gauge AS
WITH cpi AS (SELECT date, cpi FROM shiller WHERE cpi IS NOT NULL),
nas AS (
    SELECT p.date, p.close / c.cpi AS real, row_number() OVER (ORDER BY p.date) AS i
    FROM prices p ASOF JOIN cpi c ON p.date >= c.date
    WHERE p.symbol = '^IXIC'
),
nas_measures AS (
    SELECT date,
           real / lag(real, 36) OVER (ORDER BY date) - 1                                          AS speed,
           CASE WHEN i >= 120 THEN real / avg(real) OVER (ORDER BY date ROWS 119 PRECEDING) - 1 END AS trend
    FROM nas
),
readings AS (
    SELECT s.date, s.cape, n.speed, l.pct_gdp AS leverage, n.trend
    FROM shiller s JOIN nas_measures n USING (date) JOIN leverage l USING (date)
    WHERE s.cape IS NOT NULL AND n.speed IS NOT NULL AND n.trend IS NOT NULL
),
ranked AS (    -- percentile rank, ties sharing their average rank
    SELECT date,
           (rank() OVER (ORDER BY cape)     + (count(*) OVER (PARTITION BY cape) - 1) / 2)     / count(*) OVER () AS cape,
           (rank() OVER (ORDER BY speed)    + (count(*) OVER (PARTITION BY speed) - 1) / 2)    / count(*) OVER () AS speed,
           (rank() OVER (ORDER BY leverage) + (count(*) OVER (PARTITION BY leverage) - 1) / 2) / count(*) OVER () AS leverage,
           (rank() OVER (ORDER BY trend)    + (count(*) OVER (PARTITION BY trend) - 1) / 2)    / count(*) OVER () AS trend
    FROM readings
)
SELECT *, (cape + speed + leverage + trend) / 4 AS gauge FROM ranked ORDER BY date;

COPY (SELECT strftime(date, '%Y-%m-%d') AS date, cape, speed, leverage, trend, gauge FROM gauge) TO 'data/analysis/bubble_gauge.csv' (HEADER);

SELECT strftime(date, '%Y-%m') AS d, gauge AS g FROM gauge ORDER BY date;
