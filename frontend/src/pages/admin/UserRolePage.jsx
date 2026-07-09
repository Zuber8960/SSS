import { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllUserRoles, createUserRole, deleteUserRole } from "../../utils/userRole";
import { fetchAllUsers } from "../../utils/userAPI";
import { fetchAllRoles } from "../../utils/roleMaster";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/UseAlert";

const mappingColumns = [
  { key: "user_id", label: "User ID" },
  { key: "role_code", label: "Role Code" },
];

const emptyForm = { user_id: "", role_code: "" };

export default function UserRolePage() {
  const [mappings, setMappings] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const loadMappings = async () => {
    try {
      setLoading(true);
      const data = await fetchAllUserRoles();
      setMappings(data);
    } catch (err) {
      showError(err.message || "Failed to load user role mappings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [mappingData, userData, roleData] = await Promise.all([
          fetchAllUserRoles(),
          fetchAllUsers(),
          fetchAllRoles(),
        ]);
        setMappings(mappingData);
        setUserOptions(userData.map((u) => ({ label: u.user_id, value: u.user_id })));
        setRoleOptions(roleData.map((r) => ({ label: r.role_name, value: r.role_code })));
      } catch (err) {
        showError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearForm = () => setForm(emptyForm);

  const saveMapping = async () => {
    if (!form.user_id || !form.role_code) {
      showError("Please select both User and Role");
      return;
    }

    try {
      setLoading(true);
      const created = await createUserRole({ user_id: form.user_id, role_code: form.role_code });
      setMappings((prev) => [...prev, created[0]]);
      showSuccess("User role mapping created successfully");
      clearForm();
    } catch (err) {
      showError(err.message || "Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (row) => {
    showWarning(
      "Confirm Delete",
      `Remove role '${row.role_code}' from user '${row.user_id}'?`,
      async () => {
        try {
          setLoading(true);
          await deleteUserRole(row.user_id, row.role_code);
          setMappings((prev) =>
            prev.filter((m) => !(m.user_id === row.user_id && m.role_code === row.role_code))
          );
          showSuccess("Mapping deleted successfully");
        } catch (err) {
          showError(err.message || "Failed to delete mapping");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const filteredMappings = mappings.filter(
    (x) =>
      x.user_id?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.role_code?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <PageBody title="User Role Mapping">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveMapping },
            { label: "Refresh", onClick: loadMappings },
          ]}
          search={{ placeholder: "Search...", value: searchText, onChange: setSearchText }}
        />
        {loading && <div className="alertBox info">Loading...</div>}
        <FormPanel columns="150px 300px">
          <FormField
            label="User"
            name="user_id"
            form={form}
            setForm={setForm}
            options={userOptions}
          />
          <FormField
            label="Role"
            name="role_code"
            form={form}
            setForm={setForm}
            options={roleOptions}
          />
        </FormPanel>
        <DataTable
          columns={mappingColumns}
          rows={filteredMappings}
          getKey={(row) => `${row.user_id}_${row.role_code}`}
          actions={[
            { label: "Delete", onClick: handleDelete },
          ]}
        />
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
