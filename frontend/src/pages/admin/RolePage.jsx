import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
  SearchBox,
} from "../../components/common/MasterPage";

const statusOptions = ["Active", "Inactive"];
const roleFields = [
  { label: "Role Code", name: "roleCode" },
  { label: "Role Name", name: "roleName" },
  { label: "Status", name: "status", options: statusOptions },
];
const roleColumns = [
  { key: "roleCode", label: "Role Code" },
  { key: "roleName", label: "Role Name" },
  { key: "status", label: "Status" },
];

export default function RolePage() {
  const [searchText, setSearchText] = useState("");

  const [roles, setRoles] = useState([
    {
      roleCode: "ADMIN",
      roleName: "System Administrator",
      status: "Active",
    },
    {
      roleCode: "BRANCH",
      roleName: "Branch User",
      status: "Active",
    },
  ]);

  const [form, setForm] = useState({
    roleCode: "",
    roleName: "",
    status: "Active",
  });

  const clearForm = () => {
    setForm({
      roleCode: "",
      roleName: "",
      status: "Active",
    });
  };

  const saveRole = () => {
    if (!form.roleCode || !form.roleName) {
      alert("Role Code and Role Name are mandatory");
      return;
    }

    setRoles([...roles, form]);
    clearForm();
  };

  const editRole = (row) => {
    setForm(row);
  };

  const deleteRole = (roleCode) => {
    if (!window.confirm("Delete Role ?")) return;

    setRoles(roles.filter((x) => x.roleCode !== roleCode));
  };

  const filteredRoles = roles.filter(
    (x) =>
      x.roleCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.roleName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <PageBody title="Role Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveRole },
            { label: "Export" },
          ]}
        />
        <SearchBox placeholder="Search Role..." value={searchText} onChange={setSearchText} />
        <FormPanel columns="150px 300px">
          {roleFields.map((field) => (
            <FormField key={field.name} {...field} form={form} setForm={setForm} />
          ))}
        </FormPanel>
        <DataTable
          columns={roleColumns}
          rows={filteredRoles}
          getKey={(row) => row.roleCode}
          actions={[
            { label: "Edit", onClick: editRole },
            { label: "Delete", onClick: (row) => deleteRole(row.roleCode) },
          ]}
        />
      </PageBody>
    </MainLayout>
  );
}
