import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, RefreshIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllUsers, createUser, updateUser, deleteUser } from "../../utils/userAPI";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import {
  DataTable,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import "../../styles/MasterPage.css";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/UseAlert";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options, disabled }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx} disabled={disabled}>
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

const userColumns = [
  { key: "user_id", label: "User ID" },
  { key: "user_name", label: "User Name" },
  { key: "email_id", label: "Email" },
  { key: "mobile_no", label: "Mobile" },
  { key: "user_status", label: "Status" },
  { key: "location_id", label: "Location ID" },
  { key: "division_code", label: "Division Code" },
  { key: "is_admin", label: "Admin User", render: (row) => (row.is_admin === "Y" ? "Yes" : "No") },
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
    rec_id: "", user_id: "", user_name: "", email_id: "", mobile_no: "",
    user_status: "A", is_admin: "N", password_hash: "", location_id: "", division_code: "",
  });

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const loadUsers = async () => {
    try {
      setError(""); setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true); setError("");
      try {
        const [userData, locationData, divisionData] = await Promise.all([
          fetchAllUsers(), fetchAllLocations(), fetchAllDivisionsApi(),
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
    init();
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
      rec_id: "", user_id: "", user_name: "", email_id: "", mobile_no: "",
      user_status: "A", is_admin: "N", password_hash: "", location_id: "", division_code: "",
    });
    setIsEditing(false);
  };

  const validateForm = () => {
    if (!form.user_id || !form.user_name) { showError("User ID and User Name are required"); return false; }
    if (!isEditing && !form.password_hash) { showError("Password is required for new users"); return false; }
    if (!["A", "I"].includes(form.user_status)) { showError("Invalid status"); return false; }
    return true;
  };

  const saveUser = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const payload = {
        user_name: form.user_name, email_id: form.email_id, mobile_no: form.mobile_no,
        user_status: form.user_status, location_id: form.location_id || null,
        division_code: form.division_code || null,
        ...(isSuperAdmin && { is_admin: form.is_admin }),
      };
      if (isEditing) {
        if (!hasChanges()) { showInfo("No changes detected"); return; }
        await updateUser(form.rec_id, payload);
        setUsers((prev) => prev.map((u) => u.rec_id === form.rec_id ? { ...u, ...form } : u));
        showSuccess("User updated successfully");
      } else {
        const newUser = await createUser({ ...form, ...payload });
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
      rec_id: row.rec_id, user_id: row.user_id, user_name: row.user_name,
      email_id: row.email_id || "", mobile_no: row.mobile_no || "",
      user_status: row.user_status || "A", is_admin: row.is_admin || "N",
      password_hash: "", location_id: row.location_id || "", division_code: row.division_code || "",
    };
    setForm(formatted);
    setOriginalUser(formatted);
    setIsEditing(true);
  };

  const handleDeleteUser = async (row) => {
    showWarning("Confirm Delete", `Delete user ${row.user_id}?`, async () => {
      try {
        setLoading(true);
        await deleteUser(row.rec_id);
        setUsers((prev) => prev.filter((u) => u.rec_id !== row.rec_id));
        showSuccess("User deleted successfully");
      } catch (err) {
        setError(err.message || "Failed to delete user");
      } finally {
        setLoading(false);
      }
    });
  };

  const filteredUsers = users.filter(
    (x) => x.user_id?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.user_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const locationOptions = locations.map((loc) => ({ label: `${loc.loc_code} - ${loc.loc_name}`, value: loc.loc_code }));
  const divisionOptions = divisions.map((div) => ({ label: `${div.division_code} - ${div.division_name}`, value: div.division_code }));

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

        <FormPanel>
          <TextField size="small" label="User ID" fullWidth sx={fieldSx}
            value={form.user_id} onChange={(e) => setField("user_id", e.target.value)}
            disabled={isEditing} />
          <TextField size="small" label="User Name" fullWidth sx={fieldSx}
            value={form.user_name} onChange={(e) => setField("user_name", e.target.value)} />
          <TextField size="small" label="Email" fullWidth sx={fieldSx}
            value={form.email_id} onChange={(e) => setField("email_id", e.target.value)} />
          <TextField size="small" label="Mobile" fullWidth sx={fieldSx}
            value={form.mobile_no} onChange={(e) => setField("mobile_no", e.target.value)} />
          <MuiSelect label="Status" name="user_status" value={form.user_status} onChange={setField}
            options={[{ label: "Active", value: "A" }, { label: "Inactive", value: "I" }]} />
          <MuiSelect label="Location" name="location_id" value={form.location_id} onChange={setField}
            options={locationOptions} />
          <MuiSelect label="Division Code" name="division_code" value={form.division_code} onChange={setField}
            options={divisionOptions} />
          <MuiSelect label="Admin User" name="is_admin" value={form.is_admin} onChange={setField}
            options={[{ label: "Yes", value: "Y" }, { label: "No", value: "N" }]}
            disabled={!isSuperAdmin} />
          {!isEditing && (
            <TextField size="small" label="Password" type="password" fullWidth sx={fieldSx}
              value={form.password_hash} onChange={(e) => setField("password_hash", e.target.value)} />
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
