import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, DeleteIcon, RefreshIcon, EditIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllMenus } from "../../utils/menuMaster";
import { fetchAllRoles } from "../../utils/roleMaster";
import { fetchAllRoleMenus, createRoleMenu, updateRoleMenu, deleteRoleMenu } from "../../utils/roleMenu";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/UseAlert";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormGroup, TextField } from "@mui/material";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options, multiple = false }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        size="small"
        multiple={multiple}
        value={multiple ? (value ?? []) : (value ?? "")}
        onChange={(e) => onChange(name, e.target.value)}
        sx={{ fontSize: 13, "& .MuiSelect-select": { paddingTop: "4px", paddingBottom: "4px" } }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 260,
              "& .MuiMenuItem-root": {
                fontSize: 13,
                minHeight: 28,
                paddingTop: "2px",
                paddingBottom: "2px",
                gap: 0.5,
              },
              "& .MuiList-root": { padding: 0 },
              "& .MuiCheckbox-root": { padding: 0, mr: 1 },
            },
          },
        }}
        {...(multiple
          ? {
              renderValue: (selected) =>
                options
                  .filter((opt) => selected.includes(opt.value))
                  .map((opt) => (typeof opt === "object" ? opt.label : opt))
                  .join(", "),
            }
          : {})}
      >
        {options.map((opt) => (
          <MenuItem
            key={typeof opt === "object" ? opt.value : opt}
            value={typeof opt === "object" ? opt.value : opt}
            sx={{ fontSize: 13, minHeight: 28, py: "2px" }}
            disableGutters={false}
          >
            {multiple && (
              <Checkbox
                size="small"
                checked={multiple ? (value ?? []).includes(typeof opt === "object" ? opt.value : opt) : false}
                sx={{ p: 0, mr: 1, "&.Mui-checked": { color: "#7e22ce" } }}
              />
            )}
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const ynToBool = (v) => v === "Y" || v === true;
const boolToYn = (v) => (v ? "Y" : "N");

const toFormModel = (row) => ({
  recId: row.rec_id,
  roleCode: row.role_code,
  menuId: row.menu_id,
  viewYn: ynToBool(row.view_yn),
  addYn: ynToBool(row.add_yn),
  editYn: ynToBool(row.edit_yn),
  deleteYn: ynToBool(row.delete_yn),
});

const emptyForm = { recId: null, roleCode: "", menuIds: [], viewYn: true, addYn: false, editYn: false, deleteYn: false };

export default function RoleMenuPage() {
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError("");
      const [roleData, menuData] = await Promise.all([fetchAllRoles(), fetchAllMenus()]);
      setRoles(roleData);
      setMenus(menuData);
    } catch (err) {
      setError(err.message || "Failed to load roles/menus");
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllRoleMenus();
      setMappings(data.map(toFormModel));
    } catch (err) {
      setError(err.message || "Failed to load role menu mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [roleData, menuData, mappingData] = await Promise.all([fetchAllRoles(), fetchAllMenus(), fetchAllRoleMenus()]);
        if (!ignore) {
          setRoles(roleData);
          setMenus(menuData);
          setMappings(mappingData.map(toFormModel));
        }
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load data");
      }
    })();
    return () => { ignore = true; };
  }, []);

  const roleColumns = [
    { key: "roleCode", label: "Role" },
    { key: "menuId", label: "Menu", render: (row) => menus.find((x) => String(x.menu_id) === String(row.menuId))?.menu_name || "" },
    { key: "viewYn", label: "View", render: (row) => (row.viewYn ? "Y" : "N") },
    { key: "addYn", label: "Add", render: (row) => (row.addYn ? "Y" : "N") },
    { key: "editYn", label: "Edit", render: (row) => (row.editYn ? "Y" : "N") },
    { key: "deleteYn", label: "Delete", render: (row) => (row.deleteYn ? "Y" : "N") },
  ];

  const clearForm = () => setForm(emptyForm);

  const saveMapping = async () => {
    if (!form.roleCode) { showError("Select Role"); return; }
    if (!form.menuIds.length) { showError("Select at least one Menu"); return; }

    try {
      setLoading(true);

      // Duplicate check against the latest server data (guards against stale client state)
      const freshMappings = await fetchAllRoleMenus();
      const normRole = (v) => String(v ?? "").trim().toUpperCase();
      const normMenu = (v) => String(v ?? "").trim();
      const duplicate = freshMappings.find(
        (m) =>
          normRole(m.role_code) === normRole(form.roleCode) &&
          (!form.recId || m.rec_id !== form.recId) &&
          form.menuIds.some((menuId) => normMenu(m.menu_id) === normMenu(menuId))
      );
      if (duplicate) {
        showError(`Mapping already exists for role '${form.roleCode}' with the selected menu`);
        return;
      }

      const flags = {
        view_yn: boolToYn(form.viewYn),
        add_yn: boolToYn(form.addYn),
        edit_yn: boolToYn(form.editYn),
        delete_yn: boolToYn(form.deleteYn),
      };

      if (form.recId) {
        // PUT — update existing mapping
        const updated = await updateRoleMenu(form.recId, {
          role_code: form.roleCode,
          menu_id: form.menuIds[0],
          ...flags,
        });
        setMappings((prev) => prev.map((m) => (m.recId === form.recId ? toFormModel(updated[0]) : m)));
        showSuccess("Role menu mapping updated successfully");
      } else {
        // POST — create one mapping per selected menu
        const created = [];
        for (const menuId of form.menuIds) {
          const res = await createRoleMenu({ role_code: form.roleCode, menu_id: menuId, ...flags });
          created.push(toFormModel(res[0]));
        }
        setMappings((prev) => [...prev, ...created]);
        showSuccess("Role menu mapping(s) created successfully");
      }
      clearForm();
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  const editMapping = (row) => {
    setForm({
      recId: row.recId,
      roleCode: row.roleCode,
      menuIds: [row.menuId],
      viewYn: row.viewYn,
      addYn: row.addYn,
      editYn: row.editYn,
      deleteYn: row.deleteYn,
    });
  };

  const deleteMapping = (row) => {
    showWarning("Confirm Delete", `Delete mapping for role '${row.roleCode}'?`, async () => {
      try {
        setLoading(true);
        await deleteRoleMenu(row.recId);
        setMappings((prev) => prev.filter((m) => m.recId !== row.recId));
        showSuccess("Mapping deleted successfully");
      } catch (err) {
        showError(err.response?.data?.message || err.message || "Failed to delete mapping");
      } finally {
        setLoading(false);
      }
    });
  };

  const roleOptions = roles.map((r) => ({ label: r.role_name ? `${r.role_name} (${r.role_code})` : r.role_code, value: r.role_code }));
  const menuOptions = menus.map((m) => ({ label: m.menu_name, value: m.menu_id }));

  // Filter mappings by role code / role name (case-insensitive)
  const filteredMappings = mappings.filter((row) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    const roleName = roles.find((r) => String(r.role_code) === String(row.roleCode))?.role_name || "";
    return row.roleCode?.toLowerCase().includes(q) || roleName.toLowerCase().includes(q);
  });

  return (
    <MainLayout>
      <PageBody title="Role Menu Mapping">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveMapping },
            { label: "Refresh", icon: <RefreshIcon />, onClick: () => { loadMasterData(); loadMappings(); } },
          ]}
        />
        {loading && <div className="alertBox info">Loading...</div>}
        {error && <div className="alertBox error">{error}</div>}

        <FormPanel>
          <MuiSelect label="Role" name="roleCode" value={form.roleCode} onChange={setField} options={roleOptions} />
          <MuiSelect label="Menu" name="menuIds" value={form.menuIds} onChange={setField} options={menuOptions} multiple />
        </FormPanel>

        <div style={{ padding: "8px 0 12px 4px" }}>
          <FormGroup row>
            {[
              { key: "viewYn", label: "View" },
              { key: "addYn", label: "Add" },
              { key: "editYn", label: "Edit" },
              { key: "deleteYn", label: "Delete" },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    size="small"
                    checked={form[key]}
                    onChange={(e) => setField(key, e.target.checked)}
                    sx={{ "&.Mui-checked": { color: "#7e22ce" } }}
                  />
                }
                label={<span style={{ fontSize: 13 }}>{label}</span>}
              />
            ))}
            <TextField
              size="small"
              placeholder="Search Role..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ ...fieldSx, ml: 2, width: 220 }}
            />
          </FormGroup>
        </div>

        <DataTable
          columns={roleColumns}
          rows={filteredMappings}
          getKey={(row) => row.recId}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editMapping },
            { label: "Delete", icon: <DeleteIcon />, onClick: deleteMapping },
          ]}
          isHeight={420}
        />
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
