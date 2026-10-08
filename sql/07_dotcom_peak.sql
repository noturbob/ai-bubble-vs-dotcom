-- Where the dot-com run topped out, and how far the Nasdaq fell from there.
WITH dc AS (SELECT * FROM boom_overlay WHERE era = 'dotcom'),
peak AS (SELECT arg_max(m, nasdaq) AS month FROM dc)       -- first month at the high
SELECT p.month, d.d AS date, d.nasdaq,
       (SELECT min(nasdaq) FROM dc WHERE m > p.month)                AS trough,
       (SELECT min(nasdaq) FROM dc WHERE m > p.month) / d.nasdaq - 1 AS fall
FROM peak p JOIN dc d ON d.m = p.month;
