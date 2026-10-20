-- FTL dockets must have vehicle type and vehicle number.
-- Existing violating rows (if any) are not rewritten; constraint is NOT VALID
-- so new/updated rows are still blocked.

ALTER TABLE sss.sst_docket
  DROP CONSTRAINT IF EXISTS chk_sst_docket_ftl_vehicle;

ALTER TABLE sss.sst_docket
  ADD CONSTRAINT chk_sst_docket_ftl_vehicle
  CHECK (
    upper(btrim(coalesce(docket_load_type, ''))) <> 'FTL'
    OR (
      veh_type IS NOT NULL AND btrim(veh_type::text) <> ''
      AND veh_no IS NOT NULL AND btrim(veh_no::text) <> ''
    )
  ) NOT VALID;
