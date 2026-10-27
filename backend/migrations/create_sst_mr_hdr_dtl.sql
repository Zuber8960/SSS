-- Money Receipt header + allocation lines
CREATE TABLE IF NOT EXISTS sss.sst_mr_hdr (
  record_id bigserial PRIMARY KEY,
  company_code varchar(20),
  tenant_id integer,
  division_code varchar(20),
  loc_code varchar(20) NOT NULL,
  mr_no varchar(30) NOT NULL,
  mr_date date NOT NULL,
  bp_code numeric,
  bp_name varchar(200),
  pay_mode varchar(20) NOT NULL DEFAULT 'CASH',
  instr_no varchar(50),
  instr_date date,
  bank_name varchar(120),
  received_amt numeric(18,2) NOT NULL DEFAULT 0,
  tds_amt numeric(18,2) NOT NULL DEFAULT 0,
  deduction_amt numeric(18,2) NOT NULL DEFAULT 0,
  remarks varchar(500),
  created_by varchar(50),
  created_on timestamp without time zone DEFAULT now(),
  modified_by varchar(50),
  modified_on timestamp without time zone,
  CONSTRAINT sst_mr_hdr_uk UNIQUE (mr_no, mr_date, loc_code)
);

CREATE TABLE IF NOT EXISTS sss.sst_mr_dtl (
  record_id bigserial PRIMARY KEY,
  company_code varchar(20),
  loc_code varchar(20) NOT NULL,
  mr_no varchar(30) NOT NULL,
  mr_date date NOT NULL,
  sr_no numeric NOT NULL,
  invoice_no numeric,
  invoice_date date,
  invoice_loc varchar(20),
  bill_amt numeric(18,2) NOT NULL DEFAULT 0,
  received_amt numeric(18,2) NOT NULL DEFAULT 0,
  tds_amt numeric(18,2) NOT NULL DEFAULT 0,
  deduction_amt numeric(18,2) NOT NULL DEFAULT 0,
  created_by varchar(50),
  created_on timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sst_mr_dtl_bill_idx
  ON sss.sst_mr_dtl (invoice_no, invoice_date, invoice_loc);
