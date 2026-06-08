import { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { fetchAllUsers, createUser, updateUser, deleteUser } from "../../utils/userAPI";
import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
  SearchBox,
} from "../../components/common/MasterPage";
import "../../styles/MasterPage.css";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useAlert from "../../components/common/useAlert";


const userFields = [
  { label: "User ID", name: "user_id" },
  { label: "User Name", name: "user_name" },
  { label: "Email", name: "email_id" },
  { label: "Mobile", name: "mobile_no" },
  { label: "Status", name: "user_status", options: [
      { label: "Active", value: "A" },
      { label: "Inactive", value: "I" }
    ]
  }
];
const userColumns = [
  { key: "user_id", label: "User ID" },
  { key: "user_name", label: "User Name" },
  { key: "email_id", label: "Email" },
  { key: "mobile_no", label: "Mobile" },
  { key: "user_status", label: "Status" },
];

export default function UserPage() {
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
const {
  dialog,
  closeAlert,
  showSuccess,
  showError,
  showWarning,
} = useAlert();

  const [form, setForm] = useState({
    rec_id: "",
    user_id: "",
    user_name: "",
    email_id: "",
    mobile_no: "",
    user_status: "A",
    password_hash: ""
  });

   const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };


  // Load users on component mount
  useEffect(() => {
    const loadUsersAtMount = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAllUsers();
        setUsers(data);
      } catch (err) {
        setError(err.message || "Failed to load users");
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUsersAtMount();
  }, []);
 
  const clearForm = () => {
    setForm({
      rec_id: "",
      user_id: "",
      user_name: "",
      email_id: "",
      mobile_no: "",
      user_status: "A",
      password_hash: ""
    });
    setIsEditing(false);
  };

  const saveUser = async () => {
    if (!form.user_id || !form.user_name) {
      alert("User ID and User Name are mandatory");
      return;
    }

    if (!isEditing && !form.password_hash) {
      alert("Password is required for new users");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing) {
        if (form.user_status !== "A" && form.user_status !== "I") {
          showError("Please select a valid status value");
          return;
        }
        // Update existing user
        await updateUser(form.rec_id, {
          user_name: form.user_name,
          email_id: form.email_id,
          mobile_no: form.mobile_no,
          user_status: form.user_status
        });
        
        // Reload users
        await loadUsers();
        showSuccess("User updated successfully.");
      } else {
        // Create new user
        await createUser({
          user_id: form.user_id,
          user_name: form.user_name,
          email_id: form.email_id,
          mobile_no: form.mobile_no,
          user_status: form.user_status,
          password_hash: form.password_hash,
          company_code: 1 // Default company code
        });
        
        // Reload users
        await loadUsers();
        showSuccess("User created successfully.");
      }
      clearForm();
    } catch (err) {
      setError(err.message || "Failed to save user");
      console.error("Error saving user:", err);
    } finally {
      setLoading(false);
    }
  };

  const editUser = (row) => {
    setForm({
      rec_id: row.rec_id,
      user_id: row.user_id,
      user_name: row.user_name,
      email_id: row.email_id || "",
      mobile_no: row.mobile_no || "",
      user_status: row.user_status || "A",
      password_hash: ""
    });
    setIsEditing(true);
  };

  const handleDeleteUser = async (row) => {
    if (!window.confirm(`Delete user ${row.user_id}?`)) return;

    setLoading(true);
    setError("");

    try {
      await deleteUser(row.rec_id);
      
      // Reload users
      await loadUsers();
      showSuccess("User deleted successfully");
    } catch (err) {
      setError(err.message || "Failed to delete user");
      alert(err.message || "Failed to delete user");
      console.error("Error deleting user:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (x) =>
      x.user_id.toLowerCase().includes(searchText.toLowerCase()) ||
      x.user_name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <PageBody title="User Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveUser },
            { label: "Refresh", onClick: loadUsers },
          ]}
        />

        {error && (
          <div className="alertBox error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="alertBox info">
            <span>⏳</span>
            <span>Loading...</span>
          </div>
        )}

        <SearchBox placeholder="Search User..." value={searchText} onChange={setSearchText} />
        
        <FormPanel>
          {userFields.map((field) => (
            <FormField key={field.name} {...field} form={form} setForm={setForm} />
          ))}
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
            { label: "Edit", onClick: editUser },
            { label: "Delete", onClick: handleDeleteUser },
          ]}
        />
        <CommonAlertDialog
          dialog={dialog}
          onClose={closeAlert}
        />
      </PageBody>
    </MainLayout>
  );
}
