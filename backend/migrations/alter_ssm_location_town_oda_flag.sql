-- ODA flag on location town. Listed ODA towns are Y; every other town is N.
ALTER TABLE sss.ssm_location_town
    ADD COLUMN IF NOT EXISTS oda_flag VARCHAR(1);

UPDATE sss.ssm_location_town
   SET oda_flag = 'N'
 WHERE oda_flag IS NULL
    OR BTRIM(oda_flag) = '';

UPDATE sss.ssm_location_town
   SET oda_flag = 'Y'
 WHERE UPPER(REGEXP_REPLACE(BTRIM(town_name), '[^A-Z0-9]', '', 'g')) IN (
        'AMRITSAR',
        'MOGA',
        'PATIALA',
        'SANGRUR',
        'MALERKOTLA',
        'AMARGARH',
        'YAMUNANAGAR',
        'PONTASAHIB',
        'PAONTASAHIB',
        'KALAAMB',
        'PHAGWARA',
        'KAPURTHALA',
        'KOTPUTLI',
        'HAPUR'
 );

ALTER TABLE sss.ssm_location_town
    ALTER COLUMN oda_flag SET DEFAULT 'N';

ALTER TABLE sss.ssm_location_town
    ALTER COLUMN oda_flag SET NOT NULL;
