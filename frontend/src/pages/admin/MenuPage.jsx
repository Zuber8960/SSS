import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon, RefreshIcon, AddRowIcon, ResetIcon, ViewIcon, AddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllMenus, createMenu, updateMenu, deleteMenu } from "../../utils/menuMaster";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/UseAlert";

const statusOptions = [
  { label: "Active", value: "Y" },
  { label: "Inactive", value: "N" },
];

const menuFields = [
  { label: "Menu ID", name: "menu_id", type: "number" },
  { label: "Parent ID", name: "parent_menu_id", type: "number" },
  { label: "Menu Name", name: "menu_name" },
  { label: "Menu Path", name: "menu_path" },
  { label: "Menu Icon", name: "menu_icon" },
  { label: "Sequence", name: "display_seq", type: "number" },
  { label: "Status", name: "active_yn", options: statusOptions },
];

const menuColumns = [
  { key: "menu_id", label: "Menu ID" },
  { key: "parent_menu_id", label: "Parent ID" },
  { key: "menu_name", label: "Menu Name" },
  { key: "menu_path", label: "Menu Path" },
  { key: "display_seq", label: "Sequence" },
  { key: "active_yn", label: "Status" },
];

const emptyForm = {
  rec_id: null,
  menu_id: "",
  parent_menu_id: "",
  menu_name: "",
  menu_path: "",
  menu_icon: "",
  display_seq: "",
  active_yn: "Y",
};

export default function MenuPage() {
  const [menus, setMenus] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const loadMenus = async () => {
    try {
      setLoading(true);
      const data = await fetchAllMenus();
      setMenus(data);
    } catch (err) {
      showError(err.message || "Failed to load menus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMenus()
      .then(setMenus)
      .catch((err) => showError(err.message || "Failed to load menus"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const saveMenu = async () => {
    if (!form.menu_id || !form.menu_name) {
      showError("Menu ID and Menu Name are required");
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await updateMenu(form.rec_id, {
          parent_menu_id: form.parent_menu_id || null,
          menu_name:      form.menu_name,
          menu_path:      form.menu_path || null,
          menu_icon:      form.menu_icon || null,
          display_seq:    form.display_seq || null,
          active_yn:      form.active_yn,
        });
        setMenus((prev) =>
          prev.map((m) => (m.rec_id === form.rec_id ? { ...m, ...form } : m))
        );
        showSuccess("Menu updated successfully");
      } else {
        const created = await createMenu({
          menu_id:        form.menu_id,
          parent_menu_id: form.parent_menu_id || null,
          menu_name:      form.menu_name,
          menu_path:      form.menu_path || null,
          menu_icon:      form.menu_icon || null,
          display_seq:    form.display_seq || null,
          active_yn:      form.active_yn,
        });
        setMenus((prev) => [...prev, created[0]]);
        showSuccess("Menu created successfully");
      }
      clearForm();
    } catch (err) {
      showError(err.message || "Failed to save menu");
    } finally {
      setLoading(false);
    }
  };

  const editMenu = (row) => {
    setForm({
      rec_id:         row.rec_id,
      menu_id:        row.menu_id,
      parent_menu_id: row.parent_menu_id ?? "",
      menu_name:      row.menu_name ?? "",
      menu_path:      row.menu_path ?? "",
      menu_icon:      row.menu_icon ?? "",
      display_seq:    row.display_seq ?? "",
      active_yn:      row.active_yn ?? "Y",
    });
    setIsEditing(true);
  };

  const handleDelete = (row) => {
    showWarning(
      "Confirm Delete",
      `Delete menu '${row.menu_name}'?`,
      async () => {
        try {
          setLoading(true);
          await deleteMenu(row.rec_id);
          setMenus((prev) => prev.filter((m) => m.rec_id !== row.rec_id));
          showSuccess("Menu deleted successfully");
        } catch (err) {
          showError(err.message || "Failed to delete menu");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const filteredMenus = menus.filter(
    (x) =>
      x.menu_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.menu_id ?? "").includes(searchText)
  );

  return (
    <MainLayout>
      <PageBody title="Menu Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveMenu },
            { label: "Refresh", icon: <RefreshIcon />, onClick: loadMenus },
          ]}
          search={{ placeholder: "Search Menu...", value: searchText, onChange: setSearchText }}
        />
        {loading && <div className="alertBox info">Loading...</div>}
        <FormPanel columns={4}>
          {menuFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
              disabled={isEditing && field.name === "menu_id"}
            />
          ))}
        </FormPanel>
        <DataTable
          columns={menuColumns}
          rows={filteredMenus}
          getKey={(row) => row.rec_id}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editMenu },
            { label: "Delete", icon: <DeleteIcon />, onClick: handleDelete },
          ]}
        />
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
