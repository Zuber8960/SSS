import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon, RefreshIcon, AddRowIcon, ResetIcon, ViewIcon, AddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllUsers, createUser, updateUser, deleteUser } from "../../utils/userAPI";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import "../../styles/MasterPage.css";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/UseAlert";

const userFields = [
  { label: "User ID", name: "user_id" },
  { label: "User Name", name: "user_name" },
  { label: "Email", name: "email_id"},
  { label: "Mobile", name: "mobile_no", type: "number" },
  {
    label: "Status",
    name: "user_status",
    options: [
      { label: "Active", value: "A" },
      { label: "Inactive", value: "I" },
    ],
  },
];

const adminField = {
  label: "Admin User",
  name: "is_admin",
  options: [
    { label: "Yes", value: "Y" },
    { label: "No", value: "N" },
  ],
};

const userColumns = [
  { key: "user_id", label: "User ID" },
  { key: "user_name", label: "User Name" },
  { key: "email_id", label: "Email" },
  { key: "mobile_no", label: "Mobile" },
  { key: "user_status", label: "Status" },
  { key: "location_id", label: "Location ID" },
  { key: "division_code", label: "Division Code" },
  {
    key: "is_admin",
    label: "Admin User",
    render: (row) => (row.is_admin === "Y" ? "Yes" : "No"),
  },
];

export default function UserPage() {
  const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
  const isSuperAdmin = currentUser?.is_admin === "Y";

  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalUser, setOriginalUser] = useState(null);

  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();

  const [form, setForm] = useState({
    rec_id: "",
    user_id: "",
    user_name: "",
    email_id: "",
    mobile_no: "",
    user_status: "A",
    is_admin: "N",
    password_hash: "",
    location_id: "",
    division_code: "",
  });

  // ✅ Load locations
  const loadLocations = async () => {
    try {
      const data = await fetchAllLocations();
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  // ✅ Load divisions
  const loadDivisions = async () => {
    try {
      const data = await fetchAllDivisionsApi();
      setDivisions(data);
    } catch (err) {
      console.error("Failed to load divisions:", err);
    }
  };

  // ✅ Single API call
  const loadUsers = async () => {
    try {
      setError("");
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDataAtMount = async () => {
      setLoading(true);
      setError("");
      try {
        const [userData, locationData, divisionData] = await Promise.all([
          fetchAllUsers(),
          fetchAllLocations(),
          fetchAllDivisionsApi(),
        ]);
        setUsers(userData);
        setLocations(locationData);
        setDivisions(divisionData);
      } catch (err) {
        setError(err.message || "Failed to load data");
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDataAtMount();
  }, []);

  const hasChanges = () => {
    if (!originalUser) return true;

    return (
      form.user_name !== originalUser.user_name ||
      form.email_id !== originalUser.email_id ||
      form.mobile_no !== originalUser.mobile_no ||
      form.user_status !== originalUser.user_status ||
      form.location_id !== originalUser.location_id ||
      form.division_code !== originalUser.division_code
    );
  };


  const clearForm = () => {
    setForm({
      rec_id: "",
      user_id: "",
      user_name: "",
      email_id: "",
      mobile_no: "",
      user_status: "A",
      is_admin: "N",
      password_hash: "",
      location_id: "",
      division_code: "",
    });
    setIsEditing(false);
  };

  const validateForm = () => {
    if (!form.user_id || !form.user_name) {
      showError("User ID and User Name are required");
      return false;
    }

    if (!isEditing && !form.password_hash) {
      showError("Password is required for new users");
      return false;
    }

    if (!["A", "I"].includes(form.user_status)) {
      showError("Invalid status");
      return false;
    }

    return true;
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        user_name: form.user_name,
        email_id: form.email_id,
        mobile_no: form.mobile_no,
        user_status: form.user_status,
        location_id: form.location_id || null,
        division_code: form.division_code || null,
        ...(isSuperAdmin && { is_admin: form.is_admin }),
      };

      if (isEditing) {
        // ✅ Check for changes BEFORE API call
        if (!hasChanges()) {
          showInfo("No changes detected");
          return;
        }

        await updateUser(form.rec_id, payload);

        // ✅ Update state locally
        setUsers((prev) =>
          prev.map((u) =>
            u.rec_id === form.rec_id ? { ...u, ...form } : u
          )
        );

        showSuccess("User updated successfully");
      } else {
        const newUser = await createUser({ ...form, ...payload });

        // ✅ Add locally
        setUsers((prev) => [...prev, newUser[0]]);

        showSuccess("User created successfully");
      }

      clearForm();
    } catch (err) {
      setError(err.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const editUser = (row) => {
    const formatted = {
      rec_id: row.rec_id,
      user_id: row.user_id,
      user_name: row.user_name,
      email_id: row.email_id || "",
      mobile_no: row.mobile_no || "",
      user_status: row.user_status || "A",
      is_admin: row.is_admin || "N",
      password_hash: "",
      location_id: row.location_id || "",
      division_code: row.division_code || "",
    };

    setForm(formatted);
    setOriginalUser(formatted); // ✅ store original snapshot
    setIsEditing(true);
  };

  const handleDeleteUser = async (row) => {
    showWarning(
        "Confirm Delete",
        `Delete user ${row.user_id}?`,
        async () => {
          try {
            setLoading(true);

            await deleteUser(row.rec_id);

            setUsers((prev) =>
              prev.filter((u) => u.rec_id !== row.rec_id)
            );

            showSuccess("User deleted successfully");
          } catch (err) {
            setError(err.message || "Failed to delete user");
          } finally {
            setLoading(false);
          }
        }
      );

  };

  const filteredUsers = users.filter(
    (x) =>
      x.user_id?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.user_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Build location dropdown options
  const locationOptions = locations.map((loc) => ({
    label: `${loc.loc_code} - ${loc.loc_name}`,
    value: loc.loc_code,
  }));

  // Build division dropdown options
  const divisionOptions = divisions.map((div) => ({
    label: `${div.division_code} - ${div.division_name}`,
    value: div.division_code,
  }));

  return (
    <MainLayout>
      <PageBody title="User Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveUser },
            { label: "Refresh", icon: <RefreshIcon />, onClick: loadUsers },
          ]}
          search={{ placeholder: "Search User...", value: searchText, onChange: setSearchText }}
        />

        {error && <div className="alertBox error">⚠️ {error}</div>}
        {loading && <div className="alertBox info">⏳ Loading...</div>}

        <FormPanel flex>
          {userFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
              disabled={isEditing && field.name === "user_id"}
            />
          ))}

          <FormField
            label="Location ID"
            name="location_id"
            form={form}
            setForm={setForm}
            options={locationOptions}
          />

          <FormField
            label="Division Code"
            name="division_code"
            form={form}
            setForm={setForm}
            options={divisionOptions}
          />

          <FormField
            {...adminField}
            form={form}
            setForm={setForm}
            disabled={!isSuperAdmin}
          />

          {!isEditing && (
            <FormField
              label="Password"
              name="password_hash"
              type="password"
              form={form}
              setForm={setForm}
            />
          )}
        </FormPanel>

        <DataTable
          columns={userColumns}
          rows={filteredUsers}
          getKey={(row) => row.rec_id}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editUser },
            { label: "Delete", icon: <DeleteIcon />, onClick: handleDeleteUser },
          ]}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}