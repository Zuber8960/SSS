import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

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
      <div style={{ padding: "10px" }}>

        <h2>User Master</h2>

        {/* Toolbar */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <button onClick={clearForm}>New</button>
          <button onClick={saveUser}>Save</button>
          <button>Export</button>
        </div>

        {/* Search */}

        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <input
            placeholder="Search User..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: "300px",
              padding: "8px",
            }}
          />
        </div>

        {/* Entry Form */}

        <div
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 300px 150px 300px",
              gap: "10px",
            }}
          >
            <label>User ID</label>
            <input
              value={form.userId}
              onChange={(e) =>
                setForm({ ...form, userId: e.target.value })
              }
            />

            <label>User Name</label>
            <input
              value={form.userName}
              onChange={(e) =>
                setForm({ ...form, userName: e.target.value })
              }
            />

            <label>Email</label>
            <input
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <label>Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) =>
                setForm({ ...form, mobile: e.target.value })
              }
            />

            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Grid */}

        <table
          width="100%"
          border="1"
          cellPadding="8"
          style={{
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>User ID</th>
              <th>User Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Status</th>
              <th width="150">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((row) => (
              <tr key={row.userId}>
                <td>{row.userId}</td>
                <td>{row.userName}</td>
                <td>{row.email}</td>
                <td>{row.mobile}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() => editUser(row)}
                    style={{ marginRight: "5px" }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteUser(row.userId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </MainLayout>
  );
}