-- Backup of sss.sst_invoice_hdr generated 2026-10-26T10:17:20
-- Restore: run this file after CREATE SCHEMA IF NOT EXISTS sss;

CREATE TABLE IF NOT EXISTS sss.sst_invoice_hdr (
  record_id BIGINT NOT NULL,
  company_code VARCHAR(20),
  division_code VARCHAR(20) NOT NULL,
  loc_code VARCHAR(4) NOT NULL,
  bp_code NUMERIC(5,0) NOT NULL,
  bp_name VARCHAR(200),
  invoice_type VARCHAR(10) NOT NULL,
  invoice_no NUMERIC(10,0) NOT NULL,
  invoice_date DATE NOT NULL,
  write_off_flag VARCHAR(3),
  write_off_date DATE,
  loc_gstin VARCHAR(15),
  bp_gstin VARCHAR(15),
  sac_code VARCHAR(10),
  irn_status VARCHAR(10),
  irn_ackno NUMERIC(16,0),
  irn_ackdt TIMESTAMP,
  irn_no VARCHAR(65),
  irn_qrcode TEXT,
  inv_sub_date DATE,
  cancel_flag VARCHAR(2),
  total_inv_amt NUMERIC(12,2),
  created_by VARCHAR(30),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by VARCHAR(30),
  modified_on TIMESTAMP,
  tenant_id INTEGER
);

-- 7 rows
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (14, NULL, '1', 'GGRN', 0, 'ROGYAM"S ALLERGY RAKSHAK PVT LTD', 'R', 2, '2026-07-10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4413.20, 'CY_ADMIN', '2026-10-01 10:48:44.354', 'CY_ADMIN', NULL, NULL);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (13, NULL, '1', 'GGRN', 1060, 'PROTERIAL (INDIA) PRIVATE LIMITED', 'R', 1, '2026-03-26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-26', NULL, 41300.00, 'CY_ADMIN', '2026-09-30 13:35:05.897', 'SATYA PAL SHEORAN', '2026-10-05 12:19:51.461', NULL);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (15, NULL, '1', 'GGRN', 0, 'ROGYAM"S ALLERGY RAKSHAK PVT LTD', 'R', 3, '2026-10-03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-24', NULL, 4413.20, '10001', '2026-10-01 11:01:12.667', 'SATYA PAL SHEORAN', '2026-10-24 15:38:36.561', NULL);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (17, '1', '1', 'GGRN', 0, 'ARABIAN PETROLEUM LIMITED', 'R', 4, '2026-07-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-24', NULL, 3127.00, '10001', '2026-10-08 12:21:45.115', 'SATYA PAL SHEORAN', '2026-10-24 15:50:53.481', 1);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (18, '1', '1', 'GGRN', 0, 'ARABIAN PETROLEUM LIMITED', 'R', 5, '2026-08-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-24', NULL, 11918.00, '10001', '2026-10-08 13:20:33.553', 'SATYA PAL SHEORAN', '2026-10-24 15:50:53.497', 1);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (20, '1', '1', 'GGRN', 0, 'ARABIAN PETROLEUM LIMITED', 'R', 7, '2026-09-07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-24', NULL, 29854.00, '10001', '2026-10-08 13:35:08.272', 'SATYA PAL SHEORAN', '2026-10-24 15:50:53.497', 1);
INSERT INTO sss.sst_invoice_hdr (record_id, company_code, division_code, loc_code, bp_code, bp_name, invoice_type, invoice_no, invoice_date, write_off_flag, write_off_date, loc_gstin, bp_gstin, sac_code, irn_status, irn_ackno, irn_ackdt, irn_no, irn_qrcode, inv_sub_date, cancel_flag, total_inv_amt, created_by, created_on, modified_by, modified_on, tenant_id) VALUES (19, '1', '1', 'GGRN', 0, 'ARUSH SWITCHGEARS LLP', 'R', 6, '2026-09-03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-24', NULL, 2006.00, '10001', '2026-10-08 13:22:59.131', 'SATYA PAL SHEORAN', '2026-10-24 15:53:16.451', 1);
