-- Master tenant registry
CREATE TABLE sss.ssm_tenant_master (
  rec_id        SERIAL PRIMARY KEY,
  user_id     INT8         UNIQUE NOT NULL,  -- unique tenant identifier
  tenant_password VARCHAR(100) NOT NULL,  -- hashed password for tenant login
  tenant_code   VARCHAR(50)  UNIQUE NOT NULL,  -- 'CARGO_YAAN', 'DEMO_CO'
  record_status INT4         DEFAULT 0,         -- 0=active, 1=deleted
  created_by    INT8,
  updated_by    INT8,
  created_on    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_on    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO sss.ssm_tenant_master (user_id, tenant_code, tenant_password, created_by, updated_by, created_on, updated_on)
VALUES
  (1234, 'CARGO_YAAN', '1234', 1, 1, NOW(), NOW()),
  (5678, 'DEMO_COMPONY', '5678', 1, 1, NOW(), NOW()),
  (9999, 'SARAL_SAMADHAN', '9999', 1, 1, NOW(), NOW()),