-- Link lorry-owner suppliers (ssm_business_partner) to vehicles (ssm_vehicle_master).
-- A vehicle may be attached to only one owner at a time (partial unique index).
CREATE TABLE IF NOT EXISTS sss.ssm_lorry_owner_vehicle (
    rec_id            SERIAL PRIMARY KEY,
    tenant_id         INTEGER,
    owner_bp_id       BIGINT NOT NULL,
    vehicle_rec_id    BIGINT NOT NULL,
    lry_regis_no      VARCHAR(30) NOT NULL,
    status            VARCHAR(1) NOT NULL DEFAULT 'A',
    attached_on       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detached_on       TIMESTAMP,
    record_created_by VARCHAR(50),
    record_created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_updated_by VARCHAR(50),
    record_updated_on TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ssm_lorry_owner_vehicle_active
    ON sss.ssm_lorry_owner_vehicle (tenant_id, vehicle_rec_id)
    WHERE status = 'A';

CREATE INDEX IF NOT EXISTS ix_ssm_lorry_owner_vehicle_owner
    ON sss.ssm_lorry_owner_vehicle (tenant_id, owner_bp_id, status);
