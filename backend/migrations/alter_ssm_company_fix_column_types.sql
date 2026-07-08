ALTER TABLE sss.ssm_company
  ALTER COLUMN company_code        TYPE varchar(20),
  ALTER COLUMN company_name        TYPE varchar(255),
  ALTER COLUMN regoff_address      TYPE varchar(500),
  ALTER COLUMN regoff_state_code   TYPE varchar(50),
  ALTER COLUMN regoff_city_code    TYPE varchar(50),
  ALTER COLUMN regoff_pincode_code TYPE varchar(50),
  ALTER COLUMN mobile_no           TYPE varchar(20),
  ALTER COLUMN email_id            TYPE varchar(100),
  ALTER COLUMN website             TYPE varchar(255),
  ALTER COLUMN pan_no              TYPE varchar(20),
  ALTER COLUMN gstin_no            TYPE varchar(20),
  ALTER COLUMN tan_no              TYPE varchar(20),
  ALTER COLUMN status              TYPE varchar(20);
