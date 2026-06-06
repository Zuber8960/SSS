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
const menuFields = [
  { label: "Menu ID", name: "menuId" },
  { label: "Parent Menu ID", name: "parentMenuId" },
  { label: "Menu Name", name: "menuName" },
  { label: "Menu Path", name: "menuPath" },
  { label: "Display Sequence", name: "sequence" },
  { label: "Status", name: "status", options: statusOptions },
];
const menuColumns = [
  { key: "menuId", label: "Menu ID" },
  { key: "parentMenuId", label: "Parent ID" },
  { key: "menuName", label: "Menu Name" },
  { key: "menuPath", label: "Menu Path" },
  { key: "sequence", label: "Sequence" },
  { key: "status", label: "Status" },
];

export default function MenuPage() {
  const [menus, setMenus] = useState([
    {
      menuId: 1,
      parentMenuId: "",
      menuName: "Dashboard",
      menuPath: "/dashboard",
      sequence: 1,
      status: "Active",
    },
    {
      menuId: 100,
      parentMenuId: "",
      menuName: "Administration",
      menuPath: "",
      sequence: 2,
      status: "Active",
    },
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    menuId: "",
    parentMenuId: "",
    menuName: "",
    menuPath: "",
    sequence: "",
    status: "Active",
  });

  const clearForm = () => {
    setForm({
      menuId: "",
      parentMenuId: "",
      menuName: "",
      menuPath: "",
      sequence: "",
      status: "Active",
    });
  };

  const saveMenu = () => {
    if (!form.menuId || !form.menuName) {
      alert("Menu ID and Menu Name are mandatory");
      return;
    }

    setMenus([...menus, form]);
    clearForm();
  };

  const editMenu = (row) => {
    setForm(row);
  };

  const deleteMenu = (menuId) => {
    if (!window.confirm("Delete Menu ?")) return;

    setMenus(menus.filter((x) => x.menuId !== menuId));
  };

  const filteredMenus = menus.filter(
    (x) =>
      x.menuName.toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.menuId).includes(searchText)
  );

  return (
    <MainLayout>
      <PageBody title="Menu Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveMenu },
            { label: "Export" },
          ]}
        />
        <SearchBox placeholder="Search Menu..." value={searchText} onChange={setSearchText} />
        <FormPanel>
          {menuFields.map((field) => (
            <FormField key={field.name} {...field} form={form} setForm={setForm} />
          ))}
        </FormPanel>
        <DataTable
          columns={menuColumns}
          rows={filteredMenus}
          getKey={(row) => row.menuId}
          actions={[
            { label: "Edit", onClick: editMenu },
            { label: "Delete", onClick: (row) => deleteMenu(row.menuId) },
          ]}
        />
      </PageBody>
    </MainLayout>
  );
}
