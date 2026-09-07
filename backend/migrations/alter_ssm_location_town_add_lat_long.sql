ALTER TABLE sss.ssm_location_town
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
