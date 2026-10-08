-- If nothing changes, when does the boom top out? Four clocks; each is a scenario, not a forecast.
--   1999's pace: the dot-com calendar (the Nasdaq topped in month 54 after Netscape's IPO), and
--                the 40 line (months from CAPE first passing 40 to the Nasdaq's top).
--   today's pace: CAPE and the Nasdaq extended on a straight-line fit of their last 24 months (in
--                logs, so a steady growth rate) until they reach their dot-com highs. Fits over 12
--                and 36 months give each a range.
CREATE OR REPLACE TABLE projection_clocks AS
WITH today AS (SELECT max(date) AS d FROM shiller WHERE cape IS NOT NULL),
top AS (SELECT month, strptime(d, '%Y-%m')::DATE AS date FROM (SELECT * FROM boom_overlay WHERE era = 'dotcom') b
        JOIN (SELECT arg_max(m, nasdaq) AS month FROM boom_overlay WHERE era = 'dotcom') p ON b.m = p.month),
crossed AS (
    SELECT min(date) FILTER (WHERE date < '2002-01-01') AS then_, min(date) FILTER (WHERE date > '2002-01-01') AS now_
    FROM shiller WHERE cape >= 40
),
series AS (           -- newest point has back = 1
    SELECT 'cape' AS id, cape AS v, row_number() OVER (ORDER BY date DESC) AS back FROM shiller WHERE cape IS NOT NULL
    UNION ALL
    SELECT 'nasdaq', nasdaq, row_number() OVER (ORDER BY m DESC) FROM boom_overlay WHERE era = 'ai'
),
targets(id, target) AS (
    SELECT 'cape', max(cape) FROM shiller WHERE date BETWEEN '1999-01-01' AND '2000-12-01'
    UNION ALL
    SELECT 'nasdaq', nasdaq FROM boom_overlay WHERE era = 'dotcom' AND m = (SELECT month FROM top)
),
fits AS (
    SELECT s.id, w.w,
           regr_slope(ln(s.v), w.w - s.back)     AS slope,       -- x runs 0 .. w-1, oldest to newest
           regr_intercept(ln(s.v), w.w - s.back) AS intercept
    FROM series s, (VALUES (12), (24), (36)) w(w)
    WHERE s.back <= w.w
    GROUP BY s.id, w.w
),
months_to AS (
    SELECT f.id, f.w, f.slope,
           CASE WHEN f.intercept + f.slope * (f.w - 1) >= ln(t.target) THEN 0
                WHEN f.slope > 0 THEN (ln(t.target) - (f.intercept + f.slope * (f.w - 1))) / f.slope END AS months
    FROM fits f JOIN targets t USING (id)
),
pace AS (
    SELECT id,
           (SELECT d FROM today) + to_months(round_even(max(months) FILTER (WHERE w = 24), 0)::INT) AS date,
           (SELECT d FROM today) + to_months(round_even(min(months), 0)::INT)                       AS range_lo,
           (SELECT d FROM today) + to_months(round_even(max(months), 0)::INT)                       AS range_hi,
           exp(max(slope) FILTER (WHERE w = 24) * 12) - 1                                          AS rate
    FROM months_to GROUP BY id
)
SELECT 'calendar' AS id, '1999' AS pace, (DATE '2022-11-01' + to_months((SELECT month FROM top)))::DATE AS date,
       NULL::DATE AS range_lo, NULL::DATE AS range_hi, NULL::DOUBLE AS rate
UNION ALL
SELECT 'cape40', '1999', (c.now_ + to_months(date_diff('month', c.then_, t.date)))::DATE, NULL, NULL, NULL
FROM crossed c, top t
UNION ALL
SELECT id, 'today', date::DATE, range_lo::DATE, range_hi::DATE, rate FROM pace WHERE id = 'cape'
UNION ALL
SELECT id, 'today', date::DATE, range_lo::DATE, range_hi::DATE, rate FROM pace WHERE id = 'nasdaq';

-- The middle of the four (halfway between the second and third, by month) and the full window.
WITH ranked AS (
    SELECT date, year(date) * 12 + month(date) - 1 AS mi, row_number() OVER (ORDER BY date) AS r FROM projection_clocks
), mid AS (
    SELECT round_even(avg(mi) FILTER (WHERE r IN (2, 3)), 0)::INT AS mi, min(date) AS lo, max(date) AS hi FROM ranked
)
SELECT make_date(mi // 12, mi % 12 + 1, 1) AS central, lo, hi,
       date_diff('month', (SELECT max(date) FROM shiller WHERE cape IS NOT NULL), make_date(mi // 12, mi % 12 + 1, 1)) AS months_ahead,
       (SELECT min(date) FROM shiller WHERE cape >= 40 AND date < '2002-01-01') AS crossed_then,
       (SELECT min(date) FROM shiller WHERE cape >= 40 AND date > '2002-01-01') AS crossed_now
FROM mid;
