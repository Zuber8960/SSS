-- Supplier type on business partner (Lorry Owner, Lorry Broker, Spare Parts, etc.)
ALTER TABLE sss.ssm_business_partner
    ADD COLUMN IF NOT EXISTS bp_supplier_type VARCHAR(50);
