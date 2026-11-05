-- Factory charge of 500 when both consignor and consignee have factory_charge_yn = 'Y'.
-- Fuel surcharge of 50 when the consignor factory_charge_yn is 'Y'.
-- ODA charge of 1000 when the consignor factory_charge_yn is Y and the to-town oda_flag is Y.
-- Minimum rate is returned for FREIGHT only. Other rate types return 0.
DROP FUNCTION IF EXISTS sss.get_cust_rate(
    character varying, character varying, character varying, character varying,
    character varying, character varying, character varying, numeric,
    character varying, date
);

CREATE OR REPLACE FUNCTION sss.get_cust_rate(
    p_ccode character varying,
    p_loccode character varying,
    p_styp character varying,
    p_floc character varying,
    p_ftown character varying,
    p_tloc character varying,
    p_ttown character varying,
    p_cwt numeric,
    p_vtyp character varying,
    p_cnsdt date,
    p_cnor_id bigint DEFAULT NULL,
    p_cnee_id bigint DEFAULT NULL
)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    xno VARCHAR(2000);
    yno VARCHAR(10);
    v_fac VARCHAR(1) := 'N';
    v_cnor_fac VARCHAR(1) := 'N';
    v_oda VARCHAR(1) := 'N';
    j   RECORD;
BEGIN

    --------------------------------------------------
    -- CHECK CUSTOMER FLAG
    --------------------------------------------------
    BEGIN
        SELECT COALESCE(cmf_flag, 'N')
        INTO STRICT yno
        FROM sss.ssm_business_partner
        WHERE loc_code = p_loccode
          AND bp_grp_code = p_ccode;

    EXCEPTION
        WHEN OTHERS THEN
            yno := 'N';
    END;

    xno := NULL;

    IF COALESCE(yno, 'N') = 'N' THEN
        xno := 'RNA';
    ELSIF p_styp IN ('LTL', 'SUNDRY') THEN

        --------------------------------------------------
        -- C1: FREIGHT RATE FOR DESTINATION ZONE
        --------------------------------------------------
        FOR j IN
            SELECT DISTINCT
                   rate_type,
                   uom,
                   rate,
                   min_rate
            FROM sss.ssm_cust_rate
            WHERE p_cnsdt BETWEEN effect_from_date
                              AND effect_to_date
              AND status = 'VL'
              AND service_type ='PTL'
              AND loc_code = p_loccode
              AND bp_code::NUMERIC = p_ccode::NUMERIC
              AND from_loc = p_floc || '_' || p_ftown
              AND to_loc = (
                    SELECT zone_name
                    FROM sss.ssm_town_zone
                    WHERE cust_code::NUMERIC = p_ccode::NUMERIC
                      AND cust_loc_code = p_loccode
                      AND loc_code = p_tloc
                      AND town_name = p_ttown
              )
              AND rate_type = 'FREIGHT'
              AND p_cwt BETWEEN from_weight AND to_weight
        LOOP
            xno := COALESCE(xno, '')
                || '://' || j.rate_type::VARCHAR
                || '//' || j.uom::VARCHAR
                || '//' || j.rate::VARCHAR
                || '//' || CASE
                              WHEN UPPER(BTRIM(j.rate_type)) = 'FREIGHT'
                              THEN COALESCE(j.min_rate, 0)::VARCHAR
                              ELSE '0'
                           END;
        END LOOP;

        --------------------------------------------------
        -- C3: NON-FREIGHT RATE FOR DESTINATION ZONE
        --------------------------------------------------
        FOR j IN
            SELECT DISTINCT
                   rate_type,
                   uom,
                   rate,
                   min_rate
            FROM sss.ssm_cust_rate
            WHERE p_cnsdt BETWEEN effect_from_date
                              AND effect_to_date
              AND status = 'VL'
              AND service_type = 'PTL'
              AND loc_code = p_loccode
              AND bp_code::NUMERIC = p_ccode::NUMERIC
              AND from_loc = p_floc || '_' || p_ftown
              AND to_loc = (
                    SELECT zone_name
                    FROM sss.ssm_town_zone
                    WHERE cust_code = p_ccode
                      AND cust_loc_code = p_loccode
                      AND loc_code = p_tloc
                      AND town_name = p_ttown
              )
              AND rate_type <> 'FREIGHT'
              AND p_cwt BETWEEN from_weight AND to_weight
        LOOP
            xno := COALESCE(xno, '')
                || '://' || j.rate_type::VARCHAR
                || '//' || j.uom::VARCHAR
                || '//' || j.rate::VARCHAR
                || '//' || CASE
                              WHEN UPPER(BTRIM(j.rate_type)) = 'FREIGHT'
                              THEN COALESCE(j.min_rate, 0)::VARCHAR
                              ELSE '0'
                           END;
        END LOOP;

    ELSIF p_styp = 'FTL' THEN

        --------------------------------------------------
        -- C2: FREIGHT RATE FOR DESTINATION LOCATION/TOWN
        --------------------------------------------------
        FOR j IN
            SELECT DISTINCT
                   rate_type,
                   uom,
                   rate,
                   min_rate
            FROM sss.ssm_cust_rate
            WHERE p_cnsdt BETWEEN effect_from_date
                              AND effect_to_date
              AND status = 'VL'
              AND service_type = p_styp
              AND loc_code = p_loccode
              AND bp_code::NUMERIC = p_ccode::NUMERIC
              AND from_loc = p_floc || '_' || p_ftown
              AND to_loc = p_tloc || '_' || p_ttown
              AND rate_type = 'FREIGHT'
              AND p_cwt BETWEEN from_weight AND to_weight
        LOOP
            xno := COALESCE(xno, '')
                || '://' || j.rate_type::VARCHAR
                || '//' || j.uom::VARCHAR
                || '//' || j.rate::VARCHAR
                || '//' || CASE
                              WHEN UPPER(BTRIM(j.rate_type)) = 'FREIGHT'
                              THEN COALESCE(j.min_rate, 0)::VARCHAR
                              ELSE '0'
                           END;
        END LOOP;

        --------------------------------------------------
        -- C4: NON-FREIGHT RATE FOR DESTINATION LOCATION/TOWN
        --------------------------------------------------
        FOR j IN
            SELECT DISTINCT
                   rate_type,
                   uom,
                   rate,
                   min_rate
            FROM sss.ssm_cust_rate
            WHERE p_cnsdt BETWEEN effect_from_date
                              AND effect_to_date
              AND status = 'VL'
              AND service_type = p_styp
              AND loc_code = p_loccode
              AND bp_code::NUMERIC = p_ccode::NUMERIC
              AND from_loc = p_floc || '_' || p_ftown
              AND to_loc = p_tloc || '_' || p_ttown
              AND rate_type <> 'FREIGHT'
              AND p_cwt BETWEEN from_weight AND to_weight
        LOOP
            xno := COALESCE(xno, '')
                || '://' || j.rate_type::VARCHAR
                || '//' || j.uom::VARCHAR
                || '//' || j.rate::VARCHAR
                || '//' || CASE
                              WHEN UPPER(BTRIM(j.rate_type)) = 'FREIGHT'
                              THEN COALESCE(j.min_rate, 0)::VARCHAR
                              ELSE '0'
                           END;
        END LOOP;

    END IF;

    --------------------------------------------------
    -- FUEL SURCHARGE: consignor factory charge flag is Y
    --------------------------------------------------
    IF p_cnor_id IS NOT NULL THEN
        SELECT UPPER(TRIM(COALESCE(factory_charge_yn, 'N')))
          INTO v_cnor_fac
          FROM sss.ssm_business_partner
         WHERE record_id = p_cnor_id;

        IF COALESCE(v_cnor_fac, 'N') = 'Y' THEN
            IF xno IS NULL OR xno IN ('RNA', 'RNF') THEN
                xno := '://FUEL SURCHARGE//FIXED//50//0';
            ELSE
                xno := xno || '://FUEL SURCHARGE//FIXED//50//0';
            END IF;
        END IF;
    END IF;

    --------------------------------------------------
    -- ODA CHARGE: consignor factory_charge_yn is Y and to-town ODA flag is Y
    --------------------------------------------------
    IF COALESCE(v_cnor_fac, 'N') = 'Y'
       AND BTRIM(COALESCE(p_tloc, '')) <> ''
       AND BTRIM(COALESCE(p_ttown, '')) <> '' THEN
        SELECT COALESCE(MAX(UPPER(TRIM(COALESCE(oda_flag, 'N')))), 'N')
          INTO v_oda
          FROM sss.ssm_location_town
         WHERE UPPER(BTRIM(loc_code)) = UPPER(BTRIM(p_tloc))
           AND UPPER(REGEXP_REPLACE(BTRIM(town_name), '[^A-Z0-9]', '', 'g'))
             = UPPER(REGEXP_REPLACE(BTRIM(p_ttown), '[^A-Z0-9]', '', 'g'));

        IF COALESCE(v_oda, 'N') = 'Y' THEN
            IF xno IS NULL OR xno IN ('RNA', 'RNF') THEN
                xno := '://ODA CHARGE//FIXED//1000//0';
            ELSE
                xno := xno || '://ODA CHARGE//FIXED//1000//0';
            END IF;
        END IF;
    END IF;

    --------------------------------------------------
    -- FACTORY CHARGE: both consignor and consignee flagged Y
    --------------------------------------------------
    IF p_cnor_id IS NOT NULL AND p_cnee_id IS NOT NULL THEN
        SELECT CASE
                 WHEN UPPER(TRIM(COALESCE(cn.factory_charge_yn, 'N'))) = 'Y'
                  AND UPPER(TRIM(COALESCE(ce.factory_charge_yn, 'N'))) = 'Y'
                 THEN 'Y'
                 ELSE 'N'
               END
          INTO v_fac
          FROM sss.ssm_business_partner cn
          JOIN sss.ssm_business_partner ce
            ON ce.record_id = p_cnee_id
         WHERE cn.record_id = p_cnor_id;

        IF COALESCE(v_fac, 'N') = 'Y' THEN
            IF xno IS NULL OR xno IN ('RNA', 'RNF') THEN
                xno := '://FACTORY CHARGE//FIXED//500//0';
            ELSE
                xno := xno || '://FACTORY CHARGE//FIXED//500//0';
            END IF;
        END IF;
    END IF;

    --------------------------------------------------
    -- RETURN RESULT
    --------------------------------------------------
    IF xno IS NULL THEN
        xno := 'RNF';
    END IF;

    RETURN xno;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error message: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE;
END;
$function$;
