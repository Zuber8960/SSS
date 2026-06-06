import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";

const mappingColumns = [
  { key: "userId", label: "User ID" },
  { key: "roleCode", label: "Role Code" },
];

export default function UserRolePage() {

  const [mappings, setMappings] = useState([
    {
      userId: "ADMIN",
      roleCode: "ADMIN"
    }
  ]);

  const [form, setForm] = useState({
    userId: "",
    roleCode: ""
  });

  const users = [
    "ADMIN",
    "OPER01",
    "OPER02",
    "FLEET01",
    "ACC01"
  ];

  const roles = [
    "ADMIN",
    "BRANCH",
    "FLEET",
    "ACCOUNTS"
  ];

  const clearForm = () => {
    setForm({
      userId: "",
      roleCode: ""
    });
  };

  const saveMapping = () => {

    if (!form.userId || !form.roleCode) {
      alert("Please select User and Role");
      return;
    }

    setMappings([...mappings, form]);
    clearForm();
  };

  const editMapping = (row) => {
    setForm(row);
  };

  const deleteMapping = (userId, roleCode) => {

    if (!window.confirm("Delete Mapping ?"))
      return;

    setMappings(
      mappings.filter(
        x =>
          !(x.userId === userId &&
            x.roleCode === roleCode)
      )
    );
  };

  return (
    <MainLayout>
      <PageBody title="User Role Mapping">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveMapping },
          ]}
        />
        <FormPanel columns="150px 300px">
          <FormField
            label="User"
            name="userId"
            form={form}
            setForm={setForm}
            options={[{ label: "Select User", value: "" }, ...users]}
          />
          <FormField
            label="Role"
            name="roleCode"
            form={form}
            setForm={setForm}
            options={[{ label: "Select Role", value: "" }, ...roles]}
          />
        </FormPanel>
        <DataTable
          columns={mappingColumns}
          rows={mappings}
          getKey={(_, index) => index}
          actions={[
            { label: "Edit", onClick: editMapping },
            {
              label: "Delete",
              onClick: (row) => deleteMapping(row.userId, row.roleCode),
            },
          ]}
        />
      </PageBody>
    </MainLayout>
  );
}
