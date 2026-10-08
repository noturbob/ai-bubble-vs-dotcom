-- The tables every query reads, straight from the CSVs the pipeline wrote, plus two small helpers.
-- Run by analysis/indicators.py from the project root.

CREATE OR REPLACE VIEW shiller    AS SELECT * FROM read_csv('data/processed/shiller_monthly.csv', header = true);   -- S&P since 1871
CREATE OR REPLACE VIEW prices     AS SELECT * FROM read_csv('data/processed/prices_monthly.csv', header = true);    -- Yahoo, monthly
CREATE OR REPLACE VIEW financials AS SELECT * FROM read_csv('data/processed/financials.csv', header = true);        -- SEC filings
CREATE OR REPLACE VIEW shares     AS SELECT * FROM read_csv('data/processed/shares_quarterly.csv', header = true);  -- SEC share counts
CREATE OR REPLACE VIEW rates      AS SELECT * FROM read_csv('data/processed/rates_monthly.csv', header = true);     -- Fed H.15
CREATE OR REPLACE VIEW margin     AS SELECT * FROM read_csv('data/processed/margin_monthly.csv', header = true);    -- FINRA
CREATE OR REPLACE VIEW gdp        AS SELECT * FROM read_csv('data/processed/gdp_annual.csv', header = true);        -- World Bank

-- US GDP for a date's year; years after the latest published one use the latest.
CREATE OR REPLACE MACRO gdp_at(d) AS
    (SELECT gdp_usd FROM gdp WHERE year = least(year(d), (SELECT max(year) FROM gdp)));

-- Wilson score interval for k successes in n trials (95%): honest bounds for small samples.
CREATE OR REPLACE MACRO wilson_lo(k, n) AS
    greatest(0, ((k / n + 1.96 ^ 2 / (2 * n)) - 1.96 * sqrt(k / n * (1 - k / n) / n + 1.96 ^ 2 / (4 * n * n))) / (1 + 1.96 ^ 2 / n));
CREATE OR REPLACE MACRO wilson_hi(k, n) AS
    least(1, ((k / n + 1.96 ^ 2 / (2 * n)) + 1.96 * sqrt(k / n * (1 - k / n) / n + 1.96 ^ 2 / (4 * n * n))) / (1 + 1.96 ^ 2 / n));
