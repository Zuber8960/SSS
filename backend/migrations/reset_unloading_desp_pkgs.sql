-- Zero desp_pkgs/desp_wt on unloading stock that was wrongly filled at unload time.
-- Skip a docket if a further challan (manifest) already exists from the unloading location.

UPDATE sss.sst_unloading_dtl u
SET desp_pkgs = 0,
    desp_wt = 0
WHERE COALESCE(u.desp_pkgs, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM sss.sst_mnf_dtl d
    INNER JOIN sss.sst_mnf_hdr h
      ON h.mnf_no = d.mnf_no
     AND h.mnf_loc = d.mnf_loc
     AND h.mnf_date = d.mnf_date
    WHERE d.dwb_no = u.docket_no
      AND UPPER(TRIM(COALESCE(h.mnf_loc, ''))) = UPPER(TRIM(COALESCE(u.unld_loc_code, '')))
      AND COALESCE(h.record_status, 0) = 0
      AND (u.mnf_no IS NULL OR CAST(d.mnf_no AS text) <> CAST(u.mnf_no AS text))
  );
