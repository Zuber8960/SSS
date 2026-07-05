-- Generic config store: one row per config key, value is JSONB
CREATE TABLE sss.ssm_config (
  rec_id        SERIAL PRIMARY KEY,
  config_key    VARCHAR(100)  UNIQUE NOT NULL,  -- e.g. 'CARGO_YAAN_BRANDING'
  config_group  VARCHAR(100)  NOT NULL,          -- e.g. 'TENANT', 'APP', 'FEATURE'
  config_value  JSONB         NOT NULL,          -- full config as JSON
  description   VARCHAR(300),
  record_status INT4          DEFAULT 0,         -- 0=active, 1=inactive
  created_by    INT8,
  created_on    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_by    INT8,
  updated_on    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast group lookups
CREATE INDEX idx_ssm_config_group ON sss.ssm_config (config_group, record_status);


INSERT INTO sss.ssm_config
(config_key, config_group, config_value, description, record_status, created_by, created_on, updated_by, updated_on)
VALUES
(
    'CARGO_YAAN',
    'TENANT',
    '{
        "brand": {
            "gradient": "linear-gradient(180deg, #8e2de2, #c850c0, #a4508b)",
            "button_color": "#0052cc",
            "primary_color": "#8e2de2"
        },
        "tagline": "Enterprise Logistics ERP",
        "logo_url": "/images/Cargo Yaan Logo.jpeg",
        "login_url": "/cargo-yaan/login",
        "promo_cards": [
            {
                "body": "Enterprise-grade security for your logistics operations",
                "title": "Secure & Reliable"
            },
            {
                "body": "Track and optimize your business performance",
                "title": "Real-Time Analytics"
            },
            {
                "body": "Streamline operations across all departments",
                "title": "Unified Platform"
            }
        ],
        "tenant_name": "Cargo Yaan",
        "tenant_slug": "cargo-yaan",
        "dashboard_url": "/dashboard",
        "footer_image_url": "/images/Cargo Yaan Footer.png"
    }'::jsonb,
    'Cargo Yaan tenant branding and settings',
    0,
    1,
    NOW(),
    1,
    NOW()
);

INSERT INTO sss.ssm_config
(config_key, config_group, config_value, description, record_status, created_by, created_on, updated_by, updated_on)
VALUES
(
    'DEMO_COMPANY',
    'TENANT',
    '{
        "brand": {
            "gradient": "linear-gradient(160deg, #0052cc 0%, #4d94ff 50%, #ffffff 100%)",
            "button_color": "#0052cc",
            "primary_color": "#0052cc"
        },
        "tagline": "Demo ERP Platform",
        "logo_url": "/images/demo-logo.png",
        "login_url": "/demo-co/login",
        "promo_cards": [
            {
                "body": "Get started in minutes",
                "title": "Fast Onboarding"
            },
            {
                "body": "All modules included in demo",
                "title": "Full Featured"
            },
            {
                "body": "Access from anywhere, anytime",
                "title": "Cloud Ready"
            }
        ],
        "tenant_name": "Demo Company",
        "tenant_slug": "demo-co",
        "dashboard_url": "/dashboard",
        "footer_image_url": "/images/Demo Footer.png"
    }'::jsonb,
    'Demo Company tenant branding and settings',
    0,
    1,
    NOW(),
    1,
    NOW()
);

INSERT INTO sss.ssm_config
(config_key, config_group, config_value, description, record_status, created_by, created_on, updated_by, updated_on)
VALUES
(
    'SARAL_SAMADHAN',
    'TENANT',
    '{
        "brand": {
            "gradient": "linear-gradient(160deg, #064e3b 0%, #059669 45%, #d1fae5 85%, #ffffff 100%)",
            "button_color": "#7e22ce",
            "primary_color": "#8e2de2"
        },
        "tagline": "Efficient Technical Solutions. Simplified.",
        "logo_url": "/images/saral-samadhan-logo.png",
        "login_url": "/saral-samadhan/login",
        "promo_cards": [
            {
                "body": "Enterprise-grade security for your operations",
                "title": "Secure & Reliable"
            },
            {
                "body": "Track and optimize your business performance",
                "title": "Real-Time Analytics"
            },
            {
                "body": "Streamline operations across all departments",
                "title": "Unified Platform"
            }
        ],
        "tenant_name": "Saral Samadhan",
        "tenant_slug": "saral-samadhan",
        "dashboard_url": "/dashboard",
        "footer_image_url": "/images/saral samadhan footer.png"
    }'::jsonb,
    'Saral Samadhan tenant branding and settings',
    0,
    1,
    NOW(),
    1,
    NOW()
);

