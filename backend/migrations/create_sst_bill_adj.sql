CREATE TABLE IF NOT EXISTS sss.sst_bill_adj_hdr (
  record_id bigserial PRIMARY KEY,
  company_code varchar(20),
  tenant_id integer,
  division_code varchar(20),
  loc_code varchar(20) NOT NULL,
  adj_no varchar(30) NOT NULL,
  adj_date date NOT NULL,
  bp_code numeric,
  bp_name varchar(200),
  adj_amt numeric(18,2) NOT NULL DEFAULT 0,
  remarks varchar(500),
  created_by varchar(50),
  created_on timestamp without time zone DEFAULT now(),
  modified_by varchar(50),
  modified_on timestamp without time zone,
  CONSTRAINT sst_bill_adj_hdr_uk UNIQUE (adj_no, adj_date, loc_code)
);

CREATE TABLE IF NOT EXISTS sss.sst_bill_adj_dtl (
  record_id bigserial PRIMARY KEY,
  company_code varchar(20),
  loc_code varchar(20) NOT NULL,
  adj_no varchar(30) NOT NULL,
  adj_date date NOT NULL,
  sr_no numeric NOT NULL,
  mr_no varchar(30),
  mr_date date,
  mr_loc varchar(20),
  invoice_no varchar(30),
  invoice_date date,
  invoice_loc varchar(20),
  mr_amt numeric(18,2) NOT NULL DEFAULT 0,
  bill_amt numeric(18,2) NOT NULL DEFAULT 0,
  adj_amt numeric(18,2) NOT NULL DEFAULT 0,
  created_by varchar(50),
  created_on timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sst_bill_adj_dtl_mr_idx
  ON sss.sst_bill_adj_dtl (mr_no, mr_date, mr_loc);

CREATE INDEX IF NOT EXISTS sst_bill_adj_dtl_bill_idx
  ON sss.sst_bill_adj_dtl (invoice_no, invoice_date, invoice_loc);
