-- Migration: Replace inline cnor/cnee fields with FK references to ssm_business_partner
-- Run this against the sss schema PostgreSQL database

BEGIN;

-- 1. Add new FK columns
ALTER TABLE sss.sst_docket
    ADD COLUMN IF NOT EXISTS cnor_id INTEGER,
    ADD COLUMN IF NOT EXISTS cnee_id INTEGER;

-- 2. (Optional) Add FK constraints referencing ssm_business_partner.record_id
-- Uncomment if you want DB-level enforcement:
-- ALTER TABLE sss.sst_docket
--     ADD CONSTRAINT fk_docket_cnor FOREIGN KEY (cnor_id) REFERENCES sss.ssm_business_partner(record_id),
--     ADD CONSTRAINT fk_docket_cnee FOREIGN KEY (cnee_id) REFERENCES sss.ssm_business_partner(record_id);

-- 3. Drop old inline columns
ALTER TABLE sss.sst_docket
    DROP COLUMN IF EXISTS docket_cnor_name,
    DROP COLUMN IF EXISTS cnor_address,
    DROP COLUMN IF EXISTS cnor_city,
    DROP COLUMN IF EXISTS cnor_state,
    DROP COLUMN IF EXISTS cnor_pincode,
    DROP COLUMN IF EXISTS cnor_gstin,
    DROP COLUMN IF EXISTS docket_cnee_name,
    DROP COLUMN IF EXISTS cnee_address,
    DROP COLUMN IF EXISTS cnee_city,
    DROP COLUMN IF EXISTS cnee_state,
    DROP COLUMN IF EXISTS cnee_pincode,
    DROP COLUMN IF EXISTS cnee_gstin;

COMMIT;
