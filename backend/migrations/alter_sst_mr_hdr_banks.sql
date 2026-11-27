DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sss' AND table_name = 'sst_mr_hdr' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE sss.sst_mr_hdr RENAME COLUMN bank_name TO issuing_bank;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sss' AND table_name = 'sst_mr_hdr' AND column_name = 'receiver_bank'
  ) THEN
    ALTER TABLE sss.sst_mr_hdr ADD COLUMN receiver_bank varchar(120);
  END IF;
END $$;
