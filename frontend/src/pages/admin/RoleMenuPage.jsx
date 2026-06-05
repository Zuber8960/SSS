import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function RoleMenuPage() {

  const roles = [
    "ADMIN",
    "BRANCH",
    "FLEET",
    "ACCOUNTS"
  ];

  const menus = [
    { menuId: 1, menuName: "Dashboard" },
    { menuId: 101, menuName: "User Master" },
    { menuId: 102, menuName: "Role Master" },
    { menuId: 103, menuName: "Menu Master" },
    { menuId: 104, menuName: "User Role Mapping" },
    { menuId: 105, menuName: "Role Menu Mapping" },
    { menuId: 201, menuName: "Company Master" },
    { menuId: 202, menuName: "Division Master" },
    { menuId: 203, menuName: "Location Master" },
    { menuId: 301, menuName: "Vehicle Master" },
    { menuId: 401, menuName: "Docket Entry" }
  ];

  const [roleCode, setRoleCode] = useState("");

  const [mappings, setMappings] = useState([]);

  const [form, setForm] = useState({
    menuId: "",
    viewYn: true,
    addYn: false,
    editYn: false,
    deleteYn: false
  });

  const clearForm = () => {
    setForm({
      menuId: "",
      viewYn: true,
      addYn: false,
      editYn: false,
      deleteYn: false
    });
  };

  const saveMapping = () => {

    if (!roleCode) {
      alert("Select Role");
      return;
    }

    if (!form.menuId) {
      alert("Select Menu");
      return;
    }

    setMappings([
      ...mappings,
      {
        roleCode,
        ...form
      }
    ]);

    clearForm();
  };

  const deleteMapping = (index) => {

    if (!window.confirm("Delete Mapping ?"))
      return;

    setMappings(
      mappings.filter((_, i) => i !== index)
    );
  };

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>Role Menu Mapping</h2>

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

            <label>Role</label>

            <select
              value={roleCode}
              onChange={(e) =>
                setRoleCode(e.target.value)
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

            <label>Menu</label>

            <select
              value={form.menuId}
              onChange={(e) =>
                setForm({
                  ...form,
                  menuId: e.target.value
                })
              }
            >
              <option value="">
                Select Menu
              </option>

              {menus.map(menu => (
                <option
                  key={menu.menuId}
                  value={menu.menuId}
                >
                  {menu.menuName}
                </option>
              ))}
            </select>

          </div>

          <br />

          <div
            style={{
              display: "flex",
              gap: "25px"
            }}
          >

            <label>
              <input
                type="checkbox"
                checked={form.viewYn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    viewYn: e.target.checked
                  })
                }
              />
              View
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.addYn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    addYn: e.target.checked
                  })
                }
              />
              Add
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.editYn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    editYn: e.target.checked
                  })
                }
              />
              Edit
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.deleteYn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deleteYn: e.target.checked
                  })
                }
              />
              Delete
            </label>

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
              <th>Role</th>
              <th>Menu</th>
              <th>View</th>
              <th>Add</th>
              <th>Edit</th>
              <th>Delete</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {mappings.map((row, index) => {

              const menuName =
                menus.find(
                  x =>
                    String(x.menuId) === String(row.menuId)
                )?.menuName || "";

              return (
                <tr key={index}>
                  <td>{row.roleCode}</td>
                  <td>{menuName}</td>
                  <td>{row.viewYn ? "Y" : "N"}</td>
                  <td>{row.addYn ? "Y" : "N"}</td>
                  <td>{row.editYn ? "Y" : "N"}</td>
                  <td>{row.deleteYn ? "Y" : "N"}</td>

                  <td>
                    <button
                      onClick={() =>
                        deleteMapping(index)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );

            })}

          </tbody>
        </table>

      </div>

    </MainLayout>
  );
}