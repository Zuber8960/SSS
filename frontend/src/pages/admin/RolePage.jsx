import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon, RefreshIcon, AddRowIcon, ResetIcon, ViewIcon, AddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllRoles, createRole, updateRole, deleteRole } from "../../utils/roleMaster";
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
  { label: "Active", value: "A" },
  { label: "Inactive", value: "I" },
];

const roleFields = [
  { label: "Role Code", name: "role_code" },
  { label: "Role Name", name: "role_name" },
  { label: "Status", name: "role_status", options: statusOptions },
];

const roleColumns = [
  { key: "role_code", label: "Role Code" },
  { key: "role_name", label: "Role Name" },
  { key: "role_status", label: "Status" },
];

const emptyForm = { rec_id: null, role_code: "", role_name: "", role_status: "A" };

export default function RolePage() {
  const [searchText, setSearchText] = useState("");
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await fetchAllRoles();
      setRoles(data);
    } catch (err) {
      showError(err.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRoles()
      .then(setRoles)
      .catch((err) => showError(err.message || "Failed to load roles"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const saveRole = async () => {
    if (!form.role_code || !form.role_name) {
      showError("Role Code and Role Name are required");
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await updateRole(form.rec_id, {
          role_name: form.role_name,
          role_status: form.role_status,
        });
        setRoles((prev) =>
          prev.map((r) => (r.rec_id === form.rec_id ? { ...r, ...form } : r))
        );
        showSuccess("Role updated successfully");
      } else {
        const created = await createRole(form);
        setRoles((prev) => [...prev, created[0] ?? form]);
        showSuccess("Role created successfully");
      }
      clearForm();
    } catch (err) {
      showError(err.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  const editRole = (row) => {
    setForm({
      rec_id: row.rec_id,
      role_code: row.role_code,
      role_name: row.role_name,
      role_status: row.role_status || "A",
    });
    setIsEditing(true);
  };

  const handleDelete = (row) => {
    showWarning(
      "Confirm Delete",
      `Delete role '${row.role_code}'?`,
      async () => {
        try {
          setLoading(true);
          await deleteRole(row.rec_id);
          setRoles((prev) => prev.filter((r) => r.rec_id !== row.rec_id));
          showSuccess("Role deleted successfully");
        } catch (err) {
          showError(err.message || "Failed to delete role");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const filteredRoles = roles.filter(
    (x) =>
      x.role_code?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.role_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <PageBody title="Role Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveRole },
            { label: "Refresh", icon: <RefreshIcon />, onClick: loadRoles },
          ]}
          search={{ placeholder: "Search Role...", value: searchText, onChange: setSearchText }}
        />
        {loading && <div className="alertBox info">Loading...</div>}
        <FormPanel columns="150px 300px">
          {roleFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
              disabled={isEditing && field.name === "role_code"}
            />
          ))}
        </FormPanel>
        <DataTable
          columns={roleColumns}
          rows={filteredRoles}
          getKey={(row) => row.rec_id}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editRole },
            { label: "Delete", icon: <DeleteIcon />, onClick: handleDelete },
          ]}
        />
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
