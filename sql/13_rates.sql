-- Interest rates since 1990: the 3-month Treasury yield and the yield curve (10-year minus 2-year).
-- Every big bubble so far ran into rising short rates and an inverted curve (below zero).
SELECT strftime(date, '%Y-%m') AS d, y3m, y10y, curve_10y_2y
FROM rates
WHERE date >= '1990-01-01' AND y3m IS NOT NULL AND y10y IS NOT NULL
ORDER BY date;
