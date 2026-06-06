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
const userFields = [
  { label: "User ID", name: "userId" },
  { label: "User Name", name: "userName" },
  { label: "Email", name: "email" },
  { label: "Mobile", name: "mobile" },
  { label: "Status", name: "status", options: statusOptions },
];
const userColumns = [
  { key: "userId", label: "User ID" },
  { key: "userName", label: "User Name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "status", label: "Status" },
];

export default function UserPage() {
  const [searchText, setSearchText] = useState("");

  const [users, setUsers] = useState([
    {
      userId: "ADMIN",
      userName: "Administrator",
      email: "admin@erp.com",
      mobile: "9999999999",
      status: "Active",
    },
  ]);

  const [form, setForm] = useState({
    userId: "",
    userName: "",
    email: "",
    mobile: "",
    status: "Active",
  });

  const clearForm = () => {
    setForm({
      userId: "",
      userName: "",
      email: "",
      mobile: "",
      status: "Active",
    });
  };

  const saveUser = () => {
    if (!form.userId || !form.userName) {
      alert("User ID and User Name are mandatory");
      return;
    }

    setUsers([...users, form]);
    clearForm();
  };

  const editUser = (row) => {
    setForm(row);
  };

  const deleteUser = (userId) => {
    if (!window.confirm("Delete User ?")) return;

    setUsers(users.filter((x) => x.userId !== userId));
  };

  const filteredUsers = users.filter(
    (x) =>
      x.userId.toLowerCase().includes(searchText.toLowerCase()) ||
      x.userName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <PageBody title="User Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveUser },
            { label: "Export" },
          ]}
        />
        <SearchBox placeholder="Search User..." value={searchText} onChange={setSearchText} />
        <FormPanel>
          {userFields.map((field) => (
            <FormField key={field.name} {...field} form={form} setForm={setForm} />
          ))}
        </FormPanel>
        <DataTable
          columns={userColumns}
          rows={filteredUsers}
          getKey={(row) => row.userId}
          actions={[
            { label: "Edit", onClick: editUser },
            { label: "Delete", onClick: (row) => deleteUser(row.userId) },
          ]}
        />
      </PageBody>
    </MainLayout>
  );
}
