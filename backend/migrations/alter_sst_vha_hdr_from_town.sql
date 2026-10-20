-- From town on hire voucher (to town already exists as vha_to_loc_town)
ALTER TABLE sss.sst_vha_hdr
    ADD COLUMN IF NOT EXISTS vha_from_town VARCHAR(100);
