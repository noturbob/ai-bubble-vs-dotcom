-- How far the dot-com leaders fell, and the Nasdaq in 2022: from each one's peak in a window, the
-- lowest price in the three years after it. And when the Nasdaq got back to its 2021 high.
WITH windows(symbol, a, b) AS (
    VALUES ('CSCO', DATE '1999-01-01', DATE '2000-12-01'), ('INTC', DATE '1999-01-01', DATE '2000-12-01'),
           ('ORCL', DATE '1999-01-01', DATE '2000-12-01'), ('MSFT', DATE '1999-01-01', DATE '2000-12-01'),
           ('^IXIC', DATE '2021-01-01', DATE '2021-12-01')
), peaks AS (
    SELECT w.symbol, arg_max(p.date, p.adjclose) AS peak, max(p.adjclose) AS high
    FROM windows w JOIN prices p ON p.symbol = w.symbol AND p.date BETWEEN w.a AND w.b
    GROUP BY w.symbol
)
SELECT k.symbol, strftime(k.peak, '%Y-%m') AS peak,
       (SELECT min(adjclose) FROM prices p WHERE p.symbol = k.symbol AND p.date BETWEEN k.peak AND k.peak + INTERVAL 3 YEAR) / k.high - 1 AS fall,
       CASE WHEN k.symbol = '^IXIC' THEN
           (SELECT strftime(min(p.date), '%Y-%m') FROM prices p WHERE p.symbol = '^IXIC' AND p.date > k.peak
              AND p.close >= (SELECT close FROM prices WHERE symbol = '^IXIC' AND date = k.peak)) END AS back
FROM peaks k
ORDER BY list_position(['CSCO', 'INTC', 'ORCL', 'MSFT', '^IXIC'], k.symbol);
