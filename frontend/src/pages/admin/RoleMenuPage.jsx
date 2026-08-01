import { useState } from "react";
import { NoteAddIcon, SaveIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormGroup } from "@mui/material";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt} sx={{ fontSize: 13 }}>
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const roles = ["ADMIN", "BRANCH", "FLEET", "ACCOUNTS"];

const menus = [
  { menuId: 1, menuName: "Dashboard" },
  { menuId: 101, menuName: "User Master" },
  { menuId: 102, menuName: "Role Master" },
  { menuId: 103, menuName: "Menu Master" },
  { menuId: 104, menuName: "User Role Mapping" },
  { menuId: 105, menuName: "Role Menu Mapping" },
  { menuId: 201, menuName: "Company Master" },
  { menuId: 202, menuName: "Division Master" },
  { menuId: 203, menuName: "Location Master" },
  { menuId: 301, menuName: "Vehicle Master" },
  { menuId: 401, menuName: "Docket Entry" },
];

const roleColumns = [
  { key: "roleCode", label: "Role" },
  { key: "menuName", label: "Menu", render: (row) => menus.find((x) => String(x.menuId) === String(row.menuId))?.menuName || "" },
  { key: "viewYn", label: "View", render: (row) => (row.viewYn ? "Y" : "N") },
  { key: "addYn", label: "Add", render: (row) => (row.addYn ? "Y" : "N") },
  { key: "editYn", label: "Edit", render: (row) => (row.editYn ? "Y" : "N") },
  { key: "deleteYn", label: "Delete", render: (row) => (row.deleteYn ? "Y" : "N") },
];

const emptyForm = { roleCode: "", menuId: "", viewYn: true, addYn: false, editYn: false, deleteYn: false };

export default function RoleMenuPage() {
  const [mappings, setMappings] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const clearForm = () => setForm(emptyForm);

  const saveMapping = () => {
    if (!form.roleCode) { alert("Select Role"); return; }
    if (!form.menuId) { alert("Select Menu"); return; }
    setMappings([...mappings, { ...form }]);
    clearForm();
  };

  const deleteMapping = (index) => {
    if (!window.confirm("Delete Mapping ?")) return;
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const roleOptions = roles.map((r) => ({ label: r, value: r }));
  const menuOptions = menus.map((m) => ({ label: m.menuName, value: m.menuId }));

  return (
    <MainLayout>
      <PageBody title="Role Menu Mapping">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveMapping },
          ]}
        />

        <FormPanel>
          <MuiSelect label="Role" name="roleCode" value={form.roleCode} onChange={setField} options={roleOptions} />
          <MuiSelect label="Menu" name="menuId" value={form.menuId} onChange={setField} options={menuOptions} />
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
          </FormGroup>
        </div>

        <DataTable
          columns={roleColumns}
          rows={mappings}
          getKey={(_, index) => index}
          actions={[{ label: "Delete", icon: <DeleteIcon />, onClick: (_, index) => deleteMapping(index) }]}
        />
      </PageBody>
    </MainLayout>
  );
}
