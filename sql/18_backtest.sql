-- Would the valuation clock have worked before? For the three great valuation tops (CAPE's peak
-- in 1929, 1999 and 2021), stand in each of the 24 months before the top, using only data known by
-- then, and run the same clock: extend CAPE's last-24-month trend until it reaches the previous
-- record (the highest CAPE from more than five years before that top). Compare its answer with
-- when the top actually came.
-- The dot-com calendar and the 40 line can't be tested this way: both are built from 2000 itself.
CREATE OR REPLACE TABLE backtest AS
WITH cape AS (
    SELECT date, cape, row_number() OVER (ORDER BY date) AS i FROM shiller WHERE cape IS NOT NULL
), fit AS (            -- the 24-month log-linear trend as it looked in each month
    SELECT date, cape, i,
           regr_slope(ln(cape), i)     OVER (ORDER BY date ROWS 23 PRECEDING) AS slope,
           regr_intercept(ln(cape), i) OVER (ORDER BY date ROWS 23 PRECEDING) AS intercept
    FROM cape
), tops(top) AS (
    SELECT (SELECT arg_max(date, cape) FROM cape WHERE date BETWEEN a AND b)
    FROM (VALUES (DATE '1929-01-01', DATE '1929-12-01'), (DATE '1999-01-01', DATE '2000-12-01'), (DATE '2021-01-01', DATE '2021-12-01')) w(a, b)
), targets AS (
    SELECT top, (SELECT max(cape) FROM cape WHERE date < top - INTERVAL 5 YEAR) AS previous_record FROM tops
)
SELECT t.top, t.previous_record, f.date AS as_of, f.cape,
       date_diff('month', f.date, t.top)                                                AS months_before_top,
       CASE WHEN f.cape >= t.previous_record THEN 0
            WHEN f.slope > 0 THEN round_even((ln(t.previous_record) - (f.intercept + f.slope * f.i)) / f.slope, 0) END AS months_to_target,
       CASE WHEN f.cape >= t.previous_record THEN f.date
            WHEN f.slope > 0 THEN (f.date + to_months(round_even((ln(t.previous_record) - (f.intercept + f.slope * f.i)) / f.slope, 0)::INT))::DATE
       END                                                                              AS predicted_top
FROM targets t JOIN fit f ON f.date BETWEEN t.top - INTERVAL 24 MONTH AND t.top
ORDER BY t.top, f.date;

SELECT strftime(top, '%Y-%m') AS top, round(previous_record, 1) AS previous_record, strftime(as_of, '%Y-%m') AS as_of, months_before_top,
       round(cape, 1) AS cape, strftime(predicted_top, '%Y-%m') AS predicted_top, date_diff('month', top, predicted_top) AS error_months
FROM backtest WHERE months_before_top IN (24, 18, 12, 6, 3, 0) ORDER BY top, as_of;
