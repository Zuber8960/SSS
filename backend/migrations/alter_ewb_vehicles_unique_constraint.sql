-- Change ewb_vehicles unique constraint from (docket_no, ewb_no)
-- to (docket_no, ewb_no, entered_date) so all vehicle update history rows are stored.

ALTER TABLE sss.ewb_vehicles
  DROP CONSTRAINT IF EXISTS ewb_vehicles_docket_no_ewb_no_key;

ALTER TABLE sss.ewb_vehicles
  ADD CONSTRAINT ewb_vehicles_docket_no_ewb_no_entered_date_key
  UNIQUE (docket_no, ewb_no, entered_date);
