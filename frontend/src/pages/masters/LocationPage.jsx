import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function LocationPage() {

  const [locations, setLocations] = useState([
    {
      companyCode: "1001",
      divisionCode: "101",
      locCode: "DEL",
      locName: "Delhi Branch",
      locType: "BRANCH",
      state: "Delhi",
      city: "New Delhi",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    companyCode: "",
    divisionCode: "",

    locCode: "",
    locName: "",

    locType: "BRANCH",

    country: "India",
    state: "",
    city: "",
    area: "",

    address: "",
    pincode: "",

    phone: "",
    email: "",

    openedOn: "",
    closedOn: "",

    status: "Active"
  });

  const clearForm = () => {
    setForm({
      companyCode: "",
      divisionCode: "",

      locCode: "",
      locName: "",

      locType: "BRANCH",

      country: "India",
      state: "",
      city: "",
      area: "",

      address: "",
      pincode: "",

      phone: "",
      email: "",

      openedOn: "",
      closedOn: "",

      status: "Active"
    });
  };

  const saveLocation = () => {

    if (!form.companyCode) {
      alert("Company is required");
      return;
    }

    if (!form.divisionCode) {
      alert("Division is required");
      return;
    }

    if (!form.locCode) {
      alert("Location Code is required");
      return;
    }

    if (!form.locName) {
      alert("Location Name is required");
      return;
    }

    setLocations([...locations, form]);
    clearForm();
  };

  const editLocation = (row) => {
    setForm(row);
  };

  const deleteLocation = (locCode) => {

    if (!window.confirm("Delete Location ?"))
      return;

    setLocations(
      locations.filter(
        x => x.locCode !== locCode
      )
    );
  };

  const filteredLocations = locations.filter(
    x =>
      x.locCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.locName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>Location Master</h2>

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

          <button onClick={saveLocation}>
            Save
          </button>

          <button>
            Export
          </button>
        </div>

        {/* Search */}

        <input
          type="text"
          placeholder="Search Location..."
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

            <label>Location Code</label>
            <input
              value={form.locCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  locCode: e.target.value
                })
              }
            />

            <label>Location Name</label>
            <input
              value={form.locName}
              onChange={(e) =>
                setForm({
                  ...form,
                  locName: e.target.value
                })
              }
            />

            <label>Location Type</label>

            <select
              value={form.locType}
              onChange={(e) =>
                setForm({
                  ...form,
                  locType: e.target.value
                })
              }
            >
              <option>HO</option>
              <option>RO</option>
              <option>ZO</option>
              <option>AO</option>
              <option>BRANCH</option>
              <option>WAREHOUSE</option>
              <option>YARD</option>
            </select>

            <label>Country</label>

            <input
              value={form.country}
              onChange={(e) =>
                setForm({
                  ...form,
                  country: e.target.value
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

            <label>Area</label>
            <input
              value={form.area}
              onChange={(e) =>
                setForm({
                  ...form,
                  area: e.target.value
                })
              }
            />

            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: e.target.value
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
              <th>Name</th>
              <th>Division</th>
              <th>Type</th>
              <th>State</th>
              <th>City</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {filteredLocations.map((row) => (
              <tr key={row.locCode}>
                <td>{row.locCode}</td>
                <td>{row.locName}</td>
                <td>{row.divisionCode}</td>
                <td>{row.locType}</td>
                <td>{row.state}</td>
                <td>{row.city}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() =>
                      editLocation(row)
                    }
                  >
                    Edit
                  </button>

                  <button
                    style={{ marginLeft: "5px" }}
                    onClick={() =>
                      deleteLocation(row.locCode)
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