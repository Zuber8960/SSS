-- MR No format: {LOC}MR######  e.g. GGRNMR000001
ALTER TABLE sss.sst_mr_hdr
  ALTER COLUMN mr_no TYPE varchar(30) USING TRIM(mr_no::text);

ALTER TABLE sss.sst_mr_dtl
  ALTER COLUMN mr_no TYPE varchar(30) USING TRIM(mr_no::text);

UPDATE sss.sst_mr_hdr
SET mr_no = UPPER(TRIM(loc_code::text)) || 'MR' || LPAD(
  RIGHT(REGEXP_REPLACE(TRIM(mr_no::text), '[^0-9]', '', 'g'), 6),
  6, '0'
)
WHERE mr_no !~* '^[A-Z0-9]+MR[0-9]+$';

UPDATE sss.sst_mr_dtl d
SET mr_no = h.mr_no
FROM sss.sst_mr_hdr h
WHERE UPPER(TRIM(d.loc_code::text)) = UPPER(TRIM(h.loc_code::text))
  AND CAST(d.mr_date AS DATE) = CAST(h.mr_date AS DATE)
  AND d.mr_no !~* '^[A-Z0-9]+MR[0-9]+$';
