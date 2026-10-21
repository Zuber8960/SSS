UPDATE sss.ssm_menu SET display_seq = '5', updated_on = NOW() WHERE menu_id = '704' AND parent_menu_id = '700';
UPDATE sss.ssm_menu SET display_seq = '6', updated_on = NOW() WHERE menu_id = '705' AND parent_menu_id = '700';

INSERT INTO sss.ssm_menu (
  menu_id, parent_menu_id, menu_name, menu_path, menu_icon, display_seq, active_yn, record_status, created_by, created_on, updated_by, updated_on
)
SELECT
  '706', '700', 'Hire Voucher Report', '/reports/hire-voucher-report', NULL, '4', 'Y', 0, '1', NOW(), '1', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM sss.ssm_menu WHERE menu_path = '/reports/hire-voucher-report'
);

INSERT INTO sss.ssm_role_menu (role_code, menu_id, view_yn, add_yn, edit_yn, delete_yn, created_by, created_on, updated_by, updated_on)
SELECT g.role_code, '706', g.view_yn, g.add_yn, g.edit_yn, g.delete_yn, g.created_by, NOW(), g.updated_by, NOW()
FROM (
  SELECT DISTINCT ON (role_code) role_code, view_yn, add_yn, edit_yn, delete_yn, created_by, updated_by
  FROM sss.ssm_role_menu
  WHERE menu_id = '703'
  ORDER BY role_code, rec_id
) g
WHERE NOT EXISTS (
  SELECT 1 FROM sss.ssm_role_menu rm WHERE rm.role_code = g.role_code AND rm.menu_id = '706'
);
