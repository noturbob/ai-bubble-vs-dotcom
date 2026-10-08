-- What followed each valuation level? Months grouped by CAPE band: how often a 30%+ fall came
-- within three years, and the typical next-decade return.
-- Neighbouring months share most of their 36-month window, so they aren't independent. Each band is
-- also split into episodes, runs of months with no gap over three years; an episode "crashed" if
-- any of its months was followed by a 30% fall. Confidence intervals use episodes, not months.
WITH bands(lo, hi, band) AS (
    VALUES (0, 10, '0–10'), (10, 15, '10–15'), (15, 20, '15–20'), (20, 25, '20–25'), (25, 30, '25–30'), (30, 99, '30+')
), banded AS (
    SELECT b.lo, b.band, m.*,
           CASE WHEN date_diff('day', lag(m.date) OVER (PARTITION BY b.band ORDER BY m.date), m.date) <= 3 * 365
                THEN 0 ELSE 1 END AS new_episode
    FROM crash_by_month m JOIN bands b ON m.cape >= b.lo AND m.cape < b.hi
), episodes AS (
    SELECT *, sum(new_episode) OVER (PARTITION BY band ORDER BY date) AS episode FROM banded
), per_episode AS (
    SELECT band, episode, min(drawdown_36m) <= -0.30 AS crashed FROM episodes GROUP BY band, episode
), per_band AS (
    SELECT band, count(*) AS episodes, count(*) FILTER (WHERE crashed) AS episodes_crashed FROM per_episode GROUP BY band
)
SELECT e.band,
       count(*)                                                        AS months,
       p.episodes,
       p.episodes_crashed,
       [wilson_lo(p.episodes_crashed, p.episodes), wilson_hi(p.episodes_crashed, p.episodes)]                AS ci_episodes,
       avg(CASE WHEN drawdown_36m <= -0.30 THEN 1 ELSE 0 END)          AS p_crash30,
       [wilson_lo(count(*) FILTER (WHERE drawdown_36m <= -0.30), count(*)),
        wilson_hi(count(*) FILTER (WHERE drawdown_36m <= -0.30), count(*))]                                   AS ci_months,
       avg(CASE WHEN drawdown_36m <= -0.20 THEN 1 ELSE 0 END)          AS p_fall20,
       median(drawdown_36m)                                            AS median_drawdown,
       median(real_return_10y)                                         AS real_return_10y,
       avg(CASE WHEN real_return_10y < 0 THEN 1 ELSE 0 END) FILTER (WHERE real_return_10y IS NOT NULL) AS neg_10y
FROM episodes e JOIN per_band p USING (band)
GROUP BY e.lo, e.band, p.episodes, p.episodes_crashed
ORDER BY e.lo;
