-- POD Back image on the delivery note. pod_url stays POD Front so
-- existing enquiry, billing, and submission screens keep working.
ALTER TABLE sss.sst_dly_note
  ADD COLUMN IF NOT EXISTS pod_back_url character varying(200);
