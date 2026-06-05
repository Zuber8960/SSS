import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function DivisionPage() {

  const [divisions, setDivisions] = useState([
    {
      companyCode: "1001",
      companyName: "ABC Logistics Pvt Ltd",
      divisionCode: "101",
      divisionName: "Road Transport",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    companyCode: "",
    companyName: "",
    divisionCode: "",
    divisionName: "",
    openedOn: "",
    closedOn: "",
    status: "Active"
  });

  const clearForm = () => {
    setForm({
      companyCode: "",
      companyName: "",
      divisionCode: "",
      divisionName: "",
      openedOn: "",
      closedOn: "",
      status: "Active"
    });
  };

  const saveDivision = () => {

    if (!form.companyCode) {
      alert("Company Code is required");
      return;
    }

    if (!form.divisionCode) {
      alert("Division Code is required");
      return;
    }

    if (!form.divisionName) {
      alert("Division Name is required");
      return;
    }

    setDivisions([...divisions, form]);

    clearForm();
  };

  const editDivision = (row) => {
    setForm(row);
  };

  const deleteDivision = (divisionCode) => {

    if (!window.confirm("Delete Division ?"))
      return;

    setDivisions(
      divisions.filter(
        x => x.divisionCode !== divisionCode
      )
    );
  };

  const filteredDivisions = divisions.filter(
    x =>
      x.divisionCode
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      x.divisionName
        .toLowerCase()
        .includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>Division Master</h2>

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

          <button onClick={saveDivision}>
            Save
          </button>

          <button>
            Export
          </button>
        </div>

        {/* Search */}

        <input
          type="text"
          placeholder="Search Division..."
          value={searchText}
          onChange={(e) =>
            setSearchText(e.target.value)
          }
          style={{
            width: "300px",
            padding: "8px",
            marginBottom: "15px"
          }}
        />

        {/* Form */}

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
              gridTemplateColumns:
                "150px 300px 150px 300px",
              gap: "10px"
            }}
          >

            <label>Company Code</label>
            <input
              value={form.companyCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyCode: e.target.value
                })
              }
            />

            <label>Company Name</label>
            <input
              value={form.companyName}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyName: e.target.value
                })
              }
            />

            <label>Division Code</label>
            <input
              value={form.divisionCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  divisionCode: e.target.value
                })
              }
            />

            <label>Division Name</label>
            <input
              value={form.divisionName}
              onChange={(e) =>
                setForm({
                  ...form,
                  divisionName: e.target.value
                })
              }
            />

            <label>Opened On</label>
            <input
              type="date"
              value={form.openedOn}
              onChange={(e) =>
                setForm({
                  ...form,
                  openedOn: e.target.value
                })
              }
            />

            <label>Closed On</label>
            <input
              type="date"
              value={form.closedOn}
              onChange={(e) =>
                setForm({
                  ...form,
                  closedOn: e.target.value
                })
              }
            />

            <label>Status</label>

            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value
                })
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
            borderCollapse: "collapse"
          }}
        >

          <thead>
            <tr>
              <th>Company Code</th>
              <th>Company Name</th>
              <th>Division Code</th>
              <th>Division Name</th>
              <th>Status</th>
              <th width="150">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

            {filteredDivisions.map((row) => (

              <tr key={row.divisionCode}>

                <td>{row.companyCode}</td>
                <td>{row.companyName}</td>
                <td>{row.divisionCode}</td>
                <td>{row.divisionName}</td>
                <td>{row.status}</td>

                <td>

                  <button
                    onClick={() =>
                      editDivision(row)
                    }
                  >
                    Edit
                  </button>

                  <button
                    style={{
                      marginLeft: "5px"
                    }}
                    onClick={() =>
                      deleteDivision(
                        row.divisionCode
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