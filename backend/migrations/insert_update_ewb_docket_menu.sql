-- Places "Update EWB Docket" in the Transaction menu, immediately after Docket,
-- and copies that menu's role access so the same roles can open it.
DO $$
DECLARE
  v_parent bigint;
  v_seq numeric;
  v_src_id bigint;
  v_new_id bigint;
BEGIN
  SELECT parent_menu_id, display_seq, menu_id
    INTO v_parent, v_seq, v_src_id
  FROM sss.ssm_menu
  WHERE menu_path = '/transaction/docket'
  LIMIT 1;

  IF v_parent IS NULL OR v_src_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM sss.ssm_menu WHERE menu_path = '/transaction/update-ewb-docket') THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(menu_id), 0) + 1 INTO v_new_id FROM sss.ssm_menu;

  UPDATE sss.ssm_menu
     SET display_seq = display_seq + 1,
         updated_on = NOW()
   WHERE parent_menu_id = v_parent
     AND display_seq > v_seq;

  INSERT INTO sss.ssm_menu (
    menu_id, parent_menu_id, menu_name, menu_path, menu_icon, display_seq,
    active_yn, record_status, created_by, created_on, updated_by, updated_on
  ) VALUES (
    v_new_id, v_parent, 'Update EWB Docket', '/transaction/update-ewb-docket', NULL, COALESCE(v_seq, 0) + 1,
    'Y', 0, 1, NOW(), 1, NOW()
  );

  INSERT INTO sss.ssm_role_menu (
    role_code, menu_id, view_yn, add_yn, edit_yn, delete_yn, created_by, created_on, updated_by, updated_on
  )
  SELECT DISTINCT ON (role_code)
         role_code, v_new_id, view_yn, add_yn, edit_yn, delete_yn, created_by, NOW(), updated_by, NOW()
  FROM sss.ssm_role_menu src
  WHERE src.menu_id = v_src_id
    AND NOT EXISTS (
      SELECT 1 FROM sss.ssm_role_menu rm
      WHERE rm.role_code = src.role_code
        AND rm.menu_id = v_new_id
    )
  ORDER BY role_code;
END $$;
