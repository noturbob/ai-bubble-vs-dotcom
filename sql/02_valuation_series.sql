-- CAPE by quarter for the long chart: the last reading of each quarter.
SELECT strftime(date_trunc('quarter', date), '%Y-%m') AS d,
       round(arg_max(cape, date), 2)                  AS v
FROM shiller
WHERE cape IS NOT NULL
GROUP BY date_trunc('quarter', date)
ORDER BY date_trunc('quarter', date);
