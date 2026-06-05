import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function CompanyPage() {

  const [companies, setCompanies] = useState([
    {
      companyCode: "1001",
      companyName: "ABC Logistics Pvt Ltd",
      state: "Uttar Pradesh",
      city: "Noida",
      panNo: "ABCDE1234F",
      gstNo: "09ABCDE1234F1Z5",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    companyCode: "",
    companyName: "",
    regAddress: "",
    state: "",
    city: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    panNo: "",
    gstNo: "",
    tanNo: "",
    openedOn: "",
    closedOn: "",
    status: "Active"
  });

  const clearForm = () => {
    setForm({
      companyCode: "",
      companyName: "",
      regAddress: "",
      state: "",
      city: "",
      pincode: "",
      phone: "",
      email: "",
      website: "",
      panNo: "",
      gstNo: "",
      tanNo: "",
      openedOn: "",
      closedOn: "",
      status: "Active"
    });
  };

  const saveCompany = () => {

    if (!form.companyCode || !form.companyName) {
      alert("Company Code and Company Name are required");
      return;
    }

    setCompanies([...companies, form]);
    clearForm();
  };

  const editCompany = (row) => {
    setForm(row);
  };

  const deleteCompany = (companyCode) => {

    if (!window.confirm("Delete Company ?"))
      return;

    setCompanies(
      companies.filter(
        x => x.companyCode !== companyCode
      )
    );
  };

  const filteredCompanies = companies.filter(
    x =>
      x.companyCode
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      x.companyName
        .toLowerCase()
        .includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>Company Master</h2>

        {/* Toolbar */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px"
          }}
        >
          <button onClick={clearForm}>New</button>
          <button onClick={saveCompany}>Save</button>
          <button>Export</button>
        </div>

        {/* Search */}

        <input
          type="text"
          placeholder="Search Company..."
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
            marginBottom: "20px",
            borderRadius: "5px"
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

            <label>Address</label>
            <input
              value={form.regAddress}
              onChange={(e) =>
                setForm({
                  ...form,
                  regAddress: e.target.value
                })
              }
            />

            <label>State</label>
            <input
              value={form.state}
              onChange={(e) =>
                setForm({
                  ...form,
                  state: e.target.value
                })
              }
            />

            <label>City</label>
            <input
              value={form.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  city: e.target.value
                })
              }
            />

            <label>Pincode</label>
            <input
              value={form.pincode}
              onChange={(e) =>
                setForm({
                  ...form,
                  pincode: e.target.value
                })
              }
            />

            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value
                })
              }
            />

            <label>Email</label>
            <input
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
            />

            <label>Website</label>
            <input
              value={form.website}
              onChange={(e) =>
                setForm({
                  ...form,
                  website: e.target.value
                })
              }
            />

            <label>PAN No</label>
            <input
              value={form.panNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  panNo: e.target.value
                })
              }
            />

            <label>GST No</label>
            <input
              value={form.gstNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  gstNo: e.target.value
                })
              }
            />

            <label>TAN No</label>
            <input
              value={form.tanNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  tanNo: e.target.value
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
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>Code</th>
              <th>Company Name</th>
              <th>State</th>
              <th>City</th>
              <th>PAN</th>
              <th>GST</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredCompanies.map((row) => (
              <tr key={row.companyCode}>
                <td>{row.companyCode}</td>
                <td>{row.companyName}</td>
                <td>{row.state}</td>
                <td>{row.city}</td>
                <td>{row.panNo}</td>
                <td>{row.gstNo}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() =>
                      editCompany(row)
                    }
                  >
                    Edit
                  </button>

                  <button
                    style={{ marginLeft: "5px" }}
                    onClick={() =>
                      deleteCompany(
                        row.companyCode
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