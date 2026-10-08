-- Same script? Each boom indexed to 100 at the moment the public met the technology:
-- Netscape's IPO (Aug 1995) and ChatGPT's launch (Nov 2022). Month by month for eight years:
-- the Nasdaq, and an equal-weight basket of each era's leaders.
CREATE OR REPLACE TABLE boom_overlay AS
WITH eras(era, start, leaders) AS (
    VALUES ('dotcom', DATE '1995-08-01', ['CSCO', 'MSFT', 'INTC', 'ORCL', 'QCOM']),
           ('ai',     DATE '2022-11-01', ['NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'ORCL'])
), months AS (                 -- every month any series has a price, inside each era's 8-year window
    SELECT DISTINCT e.era, p.date
    FROM eras e JOIN prices p ON p.date BETWEEN e.start AND e.start + INTERVAL 96 MONTH
), indexed AS (                -- each series relative to its own first month in the window
    SELECT e.era, p.symbol, p.date,
           p.adjclose / first_value(p.adjclose) OVER (PARTITION BY e.era, p.symbol ORDER BY p.date) * 100 AS idx,
           p.date = min(p.date) OVER (PARTITION BY e.era, p.symbol) AS is_first, e.leaders, e.start
    FROM eras e JOIN prices p ON p.date BETWEEN e.start AND e.start + INTERVAL 96 MONTH
    WHERE p.symbol = '^IXIC' OR list_contains(e.leaders, p.symbol)
)
SELECT m.era,
       (row_number() OVER (PARTITION BY m.era ORDER BY m.date) - 1)::INT AS m,
       strftime(m.date, '%Y-%m')                                        AS d,
       round(max(i.idx) FILTER (WHERE i.symbol = '^IXIC'), 1)             AS nasdaq,
       round(avg(i.idx) FILTER (WHERE i.symbol <> '^IXIC'), 1)            AS leaders
FROM months m LEFT JOIN indexed i ON i.era = m.era AND i.date = m.date
GROUP BY m.era, m.date
ORDER BY m.era DESC, m.date;

COPY (SELECT m, d, nasdaq, leaders, era FROM boom_overlay ORDER BY era DESC, m) TO 'data/analysis/boom_overlay.csv' (HEADER);
