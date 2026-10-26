-- Customer Bill form heads that were missing or stored under old names.
-- New columns: consignee, act wt, from/to town, Handling, Fuel Surcharge,
-- Factory Charge, ODA Charge, FOV, Stationery.
-- Legacy amount columns are kept and backfilled into the new heads.

BEGIN;

ALTER TABLE sss.sst_invoice_dtl
  ADD COLUMN IF NOT EXISTS consignee        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS docket_actwt     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS docket_from_town VARCHAR(100),
  ADD COLUMN IF NOT EXISTS docket_to_town   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS handling         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fuel_surcharge   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS factory_charge   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS oda_charge       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fov              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS stationery       NUMERIC(12,2);

UPDATE sss.sst_invoice_dtl
SET
  handling       = COALESCE(handling, loading, 0),
  fuel_surcharge = COALESCE(fuel_surcharge, unloading, 0),
  factory_charge = COALESCE(factory_charge, detention, 0),
  oda_charge     = COALESCE(oda_charge, additional_toll, 0),
  fov            = COALESCE(fov, green_tax, 0),
  stationery     = COALESCE(stationery, other_charges, 0);

COMMIT;
