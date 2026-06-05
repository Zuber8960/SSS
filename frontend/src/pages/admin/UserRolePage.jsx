import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function UserRolePage() {

  const [mappings, setMappings] = useState([
    {
      userId: "ADMIN",
      roleCode: "ADMIN"
    }
  ]);

  const [form, setForm] = useState({
    userId: "",
    roleCode: ""
  });

  const users = [
    "ADMIN",
    "OPER01",
    "OPER02",
    "FLEET01",
    "ACC01"
  ];

  const roles = [
    "ADMIN",
    "BRANCH",
    "FLEET",
    "ACCOUNTS"
  ];

  const clearForm = () => {
    setForm({
      userId: "",
      roleCode: ""
    });
  };

  const saveMapping = () => {

    if (!form.userId || !form.roleCode) {
      alert("Please select User and Role");
      return;
    }

    setMappings([...mappings, form]);
    clearForm();
  };

  const editMapping = (row) => {
    setForm(row);
  };

  const deleteMapping = (userId, roleCode) => {

    if (!window.confirm("Delete Mapping ?"))
      return;

    setMappings(
      mappings.filter(
        x =>
          !(x.userId === userId &&
            x.roleCode === roleCode)
      )
    );
  };

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>User Role Mapping</h2>

        {/* Toolbar */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px"
          }}
        >
          <button onClick={clearForm}>
            New
          </button>

          <button onClick={saveMapping}>
            Save
          </button>
        </div>

        {/* Entry Form */}

        <div
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px"
          }}
        >

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 300px",
              gap: "10px"
            }}
          >

            <label>User</label>

            <select
              value={form.userId}
              onChange={(e) =>
                setForm({
                  ...form,
                  userId: e.target.value
                })
              }
            >
              <option value="">
                Select User
              </option>

              {users.map(user => (
                <option
                  key={user}
                  value={user}
                >
                  {user}
                </option>
              ))}
            </select>

            <label>Role</label>

            <select
              value={form.roleCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  roleCode: e.target.value
                })
              }
            >
              <option value="">
                Select Role
              </option>

              {roles.map(role => (
                <option
                  key={role}
                  value={role}
                >
                  {role}
                </option>
              ))}
            </select>

          </div>

        </div>

        {/* Grid */}

        <table
          width="100%"
          border="1"
          cellPadding="8"
          style={{
            borderCollapse: "collapse"
          }}
        >

          <thead>
            <tr>
              <th>User ID</th>
              <th>Role Code</th>
              <th width="150">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

            {mappings.map((row, index) => (

              <tr key={index}>

                <td>{row.userId}</td>

                <td>{row.roleCode}</td>

                <td>

                  <button
                    onClick={() =>
                      editMapping(row)
                    }
                    style={{
                      marginRight: "5px"
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteMapping(
                        row.userId,
                        row.roleCode
                      )
                    }
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