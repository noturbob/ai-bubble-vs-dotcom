-- Every stretch of history with CAPE at 30 or above, and the worst fall that followed within 3 years.
WITH high AS (
    SELECT *, CASE WHEN date_diff('day', lag(date) OVER (ORDER BY date), date) <= 3 * 365 THEN 0 ELSE 1 END AS new_episode
    FROM crash_by_month WHERE cape >= 30
), numbered AS (
    SELECT *, sum(new_episode) OVER (ORDER BY date) AS episode FROM high
)
SELECT strftime(min(date), '%Y-%m') AS start, strftime(max(date), '%Y-%m') AS "end",
       round(max(cape), 1) AS peak_cape, round(min(drawdown_36m), 3) AS worst_fall_36m
FROM numbered
GROUP BY episode
ORDER BY episode;
