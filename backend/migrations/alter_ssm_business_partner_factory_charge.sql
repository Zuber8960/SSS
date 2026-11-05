-- Factory charge flag on business partner header. Y/N, default N.
ALTER TABLE sss.ssm_business_partner
    ADD COLUMN IF NOT EXISTS factory_charge_yn VARCHAR(1);

UPDATE sss.ssm_business_partner
   SET factory_charge_yn = 'N'
 WHERE factory_charge_yn IS NULL
    OR BTRIM(factory_charge_yn) = '';

ALTER TABLE sss.ssm_business_partner
    ALTER COLUMN factory_charge_yn SET DEFAULT 'N';

ALTER TABLE sss.ssm_business_partner
    ALTER COLUMN factory_charge_yn SET NOT NULL;
