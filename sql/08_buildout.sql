-- The build-out: what the five hyperscalers spend on data centres and equipment (capex), against
-- their revenue and profit, and Nvidia's sales. Years count only when all five have filed.
WITH hs AS (
    SELECT year,
           CASE WHEN count(capex) = 5 THEN sum(capex) END           AS capex,
           CASE WHEN count(revenue) = 5 THEN sum(revenue) END       AS revenue,
           CASE WHEN count(net_income) = 5 THEN sum(net_income) END AS net_income
    FROM financials
    WHERE year >= 2015 AND symbol IN ('MSFT', 'GOOGL', 'AMZN', 'META', 'ORCL')
    GROUP BY year
)
SELECT hs.year, hs.capex, hs.revenue, hs.net_income, hs.capex / hs.revenue AS intensity, nv.revenue AS nvidia_revenue
FROM hs LEFT JOIN financials nv ON nv.symbol = 'NVDA' AND nv.year = hs.year
WHERE hs.capex IS NOT NULL AND hs.revenue IS NOT NULL AND hs.net_income IS NOT NULL
ORDER BY hs.year;
