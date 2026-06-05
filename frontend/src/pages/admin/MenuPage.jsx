import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function MenuPage() {
  const [menus, setMenus] = useState([
    {
      menuId: 1,
      parentMenuId: "",
      menuName: "Dashboard",
      menuPath: "/dashboard",
      sequence: 1,
      status: "Active",
    },
    {
      menuId: 100,
      parentMenuId: "",
      menuName: "Administration",
      menuPath: "",
      sequence: 2,
      status: "Active",
    },
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    menuId: "",
    parentMenuId: "",
    menuName: "",
    menuPath: "",
    sequence: "",
    status: "Active",
  });

  const clearForm = () => {
    setForm({
      menuId: "",
      parentMenuId: "",
      menuName: "",
      menuPath: "",
      sequence: "",
      status: "Active",
    });
  };

  const saveMenu = () => {
    if (!form.menuId || !form.menuName) {
      alert("Menu ID and Menu Name are mandatory");
      return;
    }

    setMenus([...menus, form]);
    clearForm();
  };

  const editMenu = (row) => {
    setForm(row);
  };

  const deleteMenu = (menuId) => {
    if (!window.confirm("Delete Menu ?")) return;

    setMenus(menus.filter((x) => x.menuId !== menuId));
  };

  const filteredMenus = menus.filter(
    (x) =>
      x.menuName.toLowerCase().includes(searchText.toLowerCase()) ||
      String(x.menuId).includes(searchText)
  );

  return (
    <MainLayout>
      <div style={{ padding: "10px" }}>

        <h2>Menu Master</h2>

        {/* Toolbar */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <button onClick={clearForm}>New</button>
          <button onClick={saveMenu}>Save</button>
          <button>Export</button>
        </div>

        {/* Search */}

        <div style={{ marginBottom: "15px" }}>
          <input
            placeholder="Search Menu..."
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
            marginBottom: "20px",
            borderRadius: "5px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "150px 300px 150px 300px",
              gap: "10px",
            }}
          >
            <label>Menu ID</label>
            <input
              value={form.menuId}
              onChange={(e) =>
                setForm({ ...form, menuId: e.target.value })
              }
            />

            <label>Parent Menu ID</label>
            <input
              value={form.parentMenuId}
              onChange={(e) =>
                setForm({ ...form, parentMenuId: e.target.value })
              }
            />

            <label>Menu Name</label>
            <input
              value={form.menuName}
              onChange={(e) =>
                setForm({ ...form, menuName: e.target.value })
              }
            />

            <label>Menu Path</label>
            <input
              value={form.menuPath}
              onChange={(e) =>
                setForm({ ...form, menuPath: e.target.value })
              }
            />

            <label>Display Sequence</label>
            <input
              value={form.sequence}
              onChange={(e) =>
                setForm({ ...form, sequence: e.target.value })
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
              <th>Menu ID</th>
              <th>Parent ID</th>
              <th>Menu Name</th>
              <th>Menu Path</th>
              <th>Sequence</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredMenus.map((row) => (
              <tr key={row.menuId}>
                <td>{row.menuId}</td>
                <td>{row.parentMenuId}</td>
                <td>{row.menuName}</td>
                <td>{row.menuPath}</td>
                <td>{row.sequence}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() => editMenu(row)}
                    style={{ marginRight: "5px" }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteMenu(row.menuId)}
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