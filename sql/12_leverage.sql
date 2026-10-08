-- Borrowed money in the market: FINRA margin debt as a share of US GDP, and in today's dollars
-- (each month's figure matched to that month's CPI with an ASOF join).
CREATE OR REPLACE TABLE leverage AS
WITH cpi AS (SELECT date, cpi FROM shiller WHERE cpi IS NOT NULL)
SELECT m.date, m.margin_debt_musd,
       m.margin_debt_musd * 1e6 / gdp_at(m.date)                                       AS pct_gdp,
       m.margin_debt_musd / 1e3 * (SELECT arg_max(cpi, date) FROM cpi) / c.cpi         AS real_bn_today
FROM margin m ASOF JOIN cpi c ON m.date >= c.date
ORDER BY m.date;

SELECT strftime(date, '%Y-%m') AS d, round(pct_gdp, 5) AS pct_gdp, round(real_bn_today, 1) AS real_bn
FROM leverage ORDER BY date;
