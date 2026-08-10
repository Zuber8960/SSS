ALTER TABLE sss.sst_docket
  ALTER COLUMN docket_pay_type TYPE varchar(20) USING docket_pay_type::text;
