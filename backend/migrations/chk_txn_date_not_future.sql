-- Prevent transaction dates after today on SSS tables.
-- Skips validity/expiry columns (insurance, tax, fitness, PUC, expiry, *_upto).
-- Null dates are allowed. Existing future rows get NOT VALID (new rows still blocked).

DO $$
DECLARE
  r RECORD;
  cons_name text;
  viol bigint;
  stmt text;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'sss'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone')
      AND (
            c.column_name ~* '(date|_dt$|_on$)'
         OR c.column_name IN ('job_start')
      )
      AND c.column_name !~* '(expir|upto|puc_exp|valid_to|insur_to|tax_upto|fitness_upto|opened_on|closed_on)'
  LOOP
    cons_name := left('chk_' || r.table_name || '_' || r.column_name || '_not_future', 63);

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = cons_name
        AND conrelid = ('sss.' || quote_ident(r.table_name))::regclass
    ) THEN
      RAISE NOTICE 'skip existing %', cons_name;
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM sss.%I WHERE %I IS NOT NULL AND %I::date > CURRENT_DATE',
      r.table_name, r.column_name, r.column_name
    ) INTO viol;

    stmt := format(
      'ALTER TABLE sss.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I::date <= CURRENT_DATE)%s',
      r.table_name,
      cons_name,
      r.column_name,
      r.column_name,
      CASE WHEN viol > 0 THEN ' NOT VALID' ELSE '' END
    );
    EXECUTE stmt;
    RAISE NOTICE '% on sss.%.% (violations=%)',
      CASE WHEN viol > 0 THEN 'NOT VALID' ELSE 'OK' END,
      r.table_name, r.column_name, viol;
  END LOOP;
END $$;
