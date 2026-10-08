-- Each hyperscaler's capex, year by year, for the stacked chart.
SELECT symbol, year, capex
FROM financials
WHERE symbol IN ('MSFT', 'GOOGL', 'AMZN', 'META', 'ORCL') AND year >= 2015
ORDER BY symbol, year;
