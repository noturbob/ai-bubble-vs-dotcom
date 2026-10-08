-- The leaders' combined value for the chart: every third month, plus the latest.
WITH t AS (SELECT *, row_number() OVER (ORDER BY date) - 1 AS i, count(*) OVER () AS n FROM leaders_total)
SELECT d, total, pct_gdp FROM (
    SELECT i, strftime(date, '%Y-%m') AS d, total, pct_gdp FROM t WHERE i % 3 = 0
    UNION ALL
    SELECT i + 0.5, strftime(date, '%Y-%m'), total, pct_gdp FROM t WHERE i = n - 1
) ORDER BY i;
