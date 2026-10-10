-- VAHAN RC Details Table
-- Upsert key: rc_regn_no (vehicle registration number)
-- Run once on your PostgreSQL database

CREATE TABLE IF NOT EXISTS sss.sst_vahan_rc_details (
    rec_id              BIGSERIAL PRIMARY KEY,
    rc_regn_no          VARCHAR(20)  NOT NULL,          -- Registration number (upsert key)
    rc_regn_dt          VARCHAR(30),                    -- Registration date
    rc_regn_upto        VARCHAR(30),                    -- Registration valid upto
    rc_purchase_dt      VARCHAR(30),                    -- Purchase date
    rc_owner_sr         VARCHAR(10),                    -- Owner serial number
    rc_owner_name       VARCHAR(255),                   -- Owner name (masked by ULIP)
    state_cd            VARCHAR(10),                    -- State code
    rto_cd              VARCHAR(20),                    -- RTO code
    rc_registered_at    VARCHAR(255),                   -- RTO office name
    rc_present_address  TEXT,                           -- Present address (masked)
    rc_permanent_address TEXT,                          -- Permanent address (masked)
    rc_vch_catg         VARCHAR(20),                    -- Vehicle category code
    rc_vch_catg_desc    VARCHAR(100),                   -- Vehicle category description
    rc_vh_class         VARCHAR(10),                    -- Vehicle class code
    rc_vh_class_desc    VARCHAR(100),                   -- Vehicle class description
    rc_vh_type          VARCHAR(10),                    -- Vehicle type
    rc_chasi_no         VARCHAR(50),                    -- Chassis number (masked)
    rc_eng_no           VARCHAR(50),                    -- Engine number (masked)
    rc_maker_desc       VARCHAR(255),                   -- Manufacturer name
    rc_maker_model      VARCHAR(255),                   -- Model name
    rc_maker_cd         VARCHAR(20),                    -- Manufacturer code
    rc_model_cd         VARCHAR(100),                   -- Model code
    rc_body_type_desc   VARCHAR(100),                   -- Body type
    rc_fuel_desc        VARCHAR(50),                    -- Fuel type
    rc_fuel_cd          VARCHAR(10),                    -- Fuel code
    rc_color            VARCHAR(100),                   -- Color
    rc_norms_desc       VARCHAR(100),                   -- Emission norms
    rc_norms_cd         VARCHAR(20),                    -- Emission norms code
    rc_fit_upto         VARCHAR(30),                    -- Fitness valid upto
    rc_tax_upto         VARCHAR(30),                    -- Tax valid upto
    rc_tax_mode         VARCHAR(10),                    -- Tax mode
    rc_passenger_tax    VARCHAR(50),                    -- Passenger tax
    rc_goods_tax        VARCHAR(50),                    -- Goods tax
    rc_financer         VARCHAR(255),                   -- Financer name
    rc_insurance_comp   VARCHAR(255),                   -- Insurance company
    rc_insurance_policy_no VARCHAR(100),                -- Insurance policy number
    rc_insurance_upto   VARCHAR(30),                    -- Insurance valid upto
    rc_manu_month_yr    VARCHAR(20),                    -- Manufacture month/year
    rc_unld_wt          VARCHAR(20),                    -- Unladen weight (kg)
    rc_gvw              VARCHAR(20),                    -- Gross vehicle weight
    rc_no_cyl           VARCHAR(10),                    -- Number of cylinders
    rc_cubic_cap        VARCHAR(20),                    -- Cubic capacity (cc)
    rc_seat_cap         VARCHAR(10),                    -- Seating capacity
    rc_sleeper_cap      VARCHAR(10),                    -- Sleeper capacity
    rc_stand_cap        VARCHAR(10),                    -- Standing capacity
    rc_wheelbase        VARCHAR(20),                    -- Wheelbase (mm)
    rc_sale_amt         VARCHAR(50),                    -- Sale amount
    rc_own_catg_desc    VARCHAR(100),                   -- Ownership category
    rc_owner_cd_desc    VARCHAR(100),                   -- Owner code description
    rc_pucc_upto        VARCHAR(30),                    -- PUCC valid upto
    rc_pucc_no          VARCHAR(50),                    -- PUCC number
    rc_blacklist_status VARCHAR(100),                   -- Blacklist status
    rc_noc_details      TEXT,                           -- NOC details
    rc_noc_dt           VARCHAR(30),                    -- NOC date
    rc_status           VARCHAR(50),                    -- RC status (ACTIVE/INACTIVE)
    rc_status_as_on     VARCHAR(50),                    -- Status as on date
    rc_owner_history    JSONB,                          -- Owner history array
    raw_response        JSONB,                          -- Full raw API response
    fetched_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vahan_regn_no UNIQUE (rc_regn_no)
);

CREATE INDEX IF NOT EXISTS idx_vahan_regn_no  ON sss.sst_vahan_rc_details (rc_regn_no);
CREATE INDEX IF NOT EXISTS idx_vahan_status   ON sss.sst_vahan_rc_details (rc_status);
CREATE INDEX IF NOT EXISTS idx_vahan_updated  ON sss.sst_vahan_rc_details (updated_at);
