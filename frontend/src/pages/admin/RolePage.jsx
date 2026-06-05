import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function RolePage() {
  const [searchText, setSearchText] = useState("");

  const [roles, setRoles] = useState([
    {
      roleCode: "ADMIN",
      roleName: "System Administrator",
      status: "Active",
    },
    {
      roleCode: "BRANCH",
      roleName: "Branch User",
      status: "Active",
    },
  ]);

  const [form, setForm] = useState({
    roleCode: "",
    roleName: "",
    status: "Active",
  });

  const clearForm = () => {
    setForm({
      roleCode: "",
      roleName: "",
      status: "Active",
    });
  };

  const saveRole = () => {
    if (!form.roleCode || !form.roleName) {
      alert("Role Code and Role Name are mandatory");
      return;
    }

    setRoles([...roles, form]);
    clearForm();
  };

  const editRole = (row) => {
    setForm(row);
  };

  const deleteRole = (roleCode) => {
    if (!window.confirm("Delete Role ?")) return;

    setRoles(roles.filter((x) => x.roleCode !== roleCode));
  };

  const filteredRoles = roles.filter(
    (x) =>
      x.roleCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.roleName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>
      <div style={{ padding: "10px" }}>

        <h2>Role Master</h2>

        {/* Toolbar */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <button onClick={clearForm}>New</button>
          <button onClick={saveRole}>Save</button>
          <button>Export</button>
        </div>

        {/* Search */}

        <div style={{ marginBottom: "15px" }}>
          <input
            placeholder="Search Role..."
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
              gridTemplateColumns: "150px 300px",
              gap: "10px",
            }}
          >
            <label>Role Code</label>

            <input
              value={form.roleCode}
              onChange={(e) =>
                setForm({ ...form, roleCode: e.target.value })
              }
            />

            <label>Role Name</label>

            <input
              value={form.roleName}
              onChange={(e) =>
                setForm({ ...form, roleName: e.target.value })
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
              <th>Role Code</th>
              <th>Role Name</th>
              <th>Status</th>
              <th width="150">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredRoles.map((row) => (
              <tr key={row.roleCode}>
                <td>{row.roleCode}</td>
                <td>{row.roleName}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() => editRole(row)}
                    style={{ marginRight: "5px" }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteRole(row.roleCode)}
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