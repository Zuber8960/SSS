-- Settlement fields on hire voucher (filled after delivery on the same voucher).
-- A voucher can be settled only once (vha_settled = 'Y').
ALTER TABLE sss.sst_vha_hdr
    ADD COLUMN IF NOT EXISTS vha_final_pay_date DATE,
    ADD COLUMN IF NOT EXISTS vha_settle_tds_amt NUMERIC,
    ADD COLUMN IF NOT EXISTS vha_gross_payable NUMERIC,
    ADD COLUMN IF NOT EXISTS vha_net_payable NUMERIC,
    ADD COLUMN IF NOT EXISTS vha_settled VARCHAR(1) DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS vha_settled_on TIMESTAMP;

UPDATE sss.sst_vha_hdr
   SET vha_settled = 'N'
 WHERE vha_settled IS NULL;
