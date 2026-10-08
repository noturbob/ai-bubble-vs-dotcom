-- How expensive is the S&P 500? CAPE (price over ten years of inflation-adjusted earnings) today,
-- against every month since 1881, and against the peaks of 1929, 2000 and 2021.
WITH cape AS (
    SELECT date, cape FROM shiller WHERE cape IS NOT NULL
), now AS (
    SELECT arg_max(cape, date) AS cape, max(date) AS date FROM cape
)
SELECT strftime(now.date, '%Y-%m')                                            AS as_of,
       now.cape                                                               AS cape,
       avg(CASE WHEN c.cape < now.cape THEN 1 ELSE 0 END)                     AS percentile,   -- share of months cheaper than today
       median(c.cape)                                                         AS median,
       count(*) FILTER (WHERE c.cape > now.cape)                              AS months_higher,
       count(*)                                                               AS months,
       list(DISTINCT year(c.date) ORDER BY year(c.date)) FILTER (WHERE c.cape > now.cape) AS higher_periods,
       max(c.cape) FILTER (WHERE c.date BETWEEN '1929-01-01' AND '1929-12-01') AS peak_1929,
       max(c.cape) FILTER (WHERE c.date BETWEEN '1999-01-01' AND '2000-12-01') AS peak_2000,
       max(c.cape) FILTER (WHERE c.date BETWEEN '2021-01-01' AND '2021-12-01') AS peak_2021
FROM cape c, now
GROUP BY now.date, now.cape;
