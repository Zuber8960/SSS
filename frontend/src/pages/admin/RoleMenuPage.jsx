import { useState } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon, RefreshIcon, AddRowIcon, ResetIcon, ViewIcon, AddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";

export default function RoleMenuPage() {

  const roles = [
    "ADMIN",
    "BRANCH",
    "FLEET",
    "ACCOUNTS"
  ];

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
    { menuId: 401, menuName: "Docket Entry" }
  ];

  const [mappings, setMappings] = useState([]);

  const [form, setForm] = useState({
    roleCode: "",
    menuId: "",
    viewYn: true,
    addYn: false,
    editYn: false,
    deleteYn: false,
  });

  const clearForm = () => {
    setForm({
      roleCode: "",
      menuId: "",
      viewYn: true,
      addYn: false,
      editYn: false,
      deleteYn: false,
    });
  };

  const saveMapping = () => {
    if (!form.roleCode) {
      alert("Select Role");
      return;
    }

    if (!form.menuId) {
      alert("Select Menu");
      return;
    }

    setMappings([
      ...mappings,
      {
        roleCode: form.roleCode,
        ...form,
      },
    ]);

    clearForm();
  };

  const deleteMapping = (index) => {
    if (!window.confirm("Delete Mapping ?")) return;
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const roleColumns = [
    { key: "roleCode", label: "Role" },
    {
      key: "menuName",
      label: "Menu",
      render: (row) =>
        menus.find((x) => String(x.menuId) === String(row.menuId))?.menuName || "",
    },
    { key: "viewYn", label: "View", render: (row) => (row.viewYn ? "Y" : "N") },
    { key: "addYn", label: "Add", render: (row) => (row.addYn ? "Y" : "N") },
    { key: "editYn", label: "Edit", render: (row) => (row.editYn ? "Y" : "N") },
    { key: "deleteYn", label: "Delete", render: (row) => (row.deleteYn ? "Y" : "N") },
  ];

  const roleActions = [{ label: "Delete", icon: <DeleteIcon />, onClick: (_, index) => deleteMapping(index) }];

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
          <FormField label="Role" name="roleCode" form={form} setForm={setForm} options={roles} />
          <FormField
            label="Menu"
            name="menuId"
            form={form}
            setForm={setForm}
            options={menus.map((menu) => ({ value: menu.menuId, label: menu.menuName }))}
          />
        </FormPanel>

        <div className="formPanel">
          <div className="permissionGrid">
            <label className="permissionItem">
              <input
                type="checkbox"
                checked={form.viewYn}
                onChange={(e) => setForm({ ...form, viewYn: e.target.checked })}
              />
              View
            </label>
            <label className="permissionItem">
              <input
                type="checkbox"
                checked={form.addYn}
                onChange={(e) => setForm({ ...form, addYn: e.target.checked })}
              />
              Add
            </label>
            <label className="permissionItem">
              <input
                type="checkbox"
                checked={form.editYn}
                onChange={(e) => setForm({ ...form, editYn: e.target.checked })}
              />
              Edit
            </label>
            <label className="permissionItem">
              <input
                type="checkbox"
                checked={form.deleteYn}
                onChange={(e) => setForm({ ...form, deleteYn: e.target.checked })}
              />
              Delete
            </label>
          </div>
        </div>

        <DataTable columns={roleColumns} rows={mappings} getKey={(_, index) => index} actions={roleActions} />

      </PageBody>
    </MainLayout>
  );
}