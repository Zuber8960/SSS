ALTER TABLE sss.ssm_vehicle_master
  ADD COLUMN IF NOT EXISTS lry_vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS lry_owner_name varchar(100);
