import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

export default function BusinessPartnerPage() {

  const [partners, setPartners] = useState([
    {
      bpCode: "C0001",
      bpName: "ABC Industries Ltd",
      bpType: "CUSTOMER",
      state: "Delhi",
      city: "New Delhi",
      mobile: "9876543210",
      status: "Active"
    }
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    bpCode: "",
    bpName: "",

    bpType: "CUSTOMER",

    contactPerson: "",
    mobile: "",
    phone: "",
    email: "",

    gstNo: "",
    panNo: "",

    address: "",

    state: "",
    city: "",
    pincode: "",

    creditDays: "",

    status: "Active"
  });

  const clearForm = () => {
    setForm({
      bpCode: "",
      bpName: "",

      bpType: "CUSTOMER",

      contactPerson: "",
      mobile: "",
      phone: "",
      email: "",

      gstNo: "",
      panNo: "",

      address: "",

      state: "",
      city: "",
      pincode: "",

      creditDays: "",

      status: "Active"
    });
  };

  const savePartner = () => {

    if (!form.bpCode) {
      alert("Partner Code Required");
      return;
    }

    if (!form.bpName) {
      alert("Partner Name Required");
      return;
    }

    setPartners([...partners, form]);
    clearForm();
  };

  const editPartner = (row) => {
    setForm(row);
  };

  const deletePartner = (bpCode) => {

    if (!window.confirm("Delete Business Partner ?"))
      return;

    setPartners(
      partners.filter(
        x => x.bpCode !== bpCode
      )
    );
  };

  const filteredPartners = partners.filter(
    x =>
      x.bpCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.bpName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <MainLayout>

      <div style={{ padding: "10px" }}>

        <h2>Business Partner Master</h2>

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

          <button onClick={savePartner}>
            Save
          </button>

          <button>
            Export
          </button>
        </div>

        <input
          type="text"
          placeholder="Search Partner..."
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

            <label>Partner Code</label>
            <input
              value={form.bpCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  bpCode: e.target.value
                })
              }
            />

            <label>Partner Name</label>
            <input
              value={form.bpName}
              onChange={(e) =>
                setForm({
                  ...form,
                  bpName: e.target.value
                })
              }
            />

            <label>Partner Type</label>

            <select
              value={form.bpType}
              onChange={(e) =>
                setForm({
                  ...form,
                  bpType: e.target.value
                })
              }
            >
              <option>CUSTOMER</option>
              <option>CONSIGNOR</option>
              <option>CONSIGNEE</option>
              <option>VENDOR</option>
              <option>TRANSPORTER</option>
              <option>BROKER</option>
              <option>FLEET_OWNER</option>
              <option>SUPPLIER</option>
            </select>

            <label>Contact Person</label>
            <input
              value={form.contactPerson}
              onChange={(e) =>
                setForm({
                  ...form,
                  contactPerson: e.target.value
                })
              }
            />

            <label>Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile: e.target.value
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

            <label>Credit Days</label>
            <input
              value={form.creditDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  creditDays: e.target.value
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
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>State</th>
              <th>City</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {filteredPartners.map((row) => (
              <tr key={row.bpCode}>
                <td>{row.bpCode}</td>
                <td>{row.bpName}</td>
                <td>{row.bpType}</td>
                <td>{row.state}</td>
                <td>{row.city}</td>
                <td>{row.mobile}</td>
                <td>{row.status}</td>

                <td>
                  <button
                    onClick={() =>
                      editPartner(row)
                    }
                  >
                    Edit
                  </button>

                  <button
                    style={{ marginLeft: "5px" }}
                    onClick={() =>
                      deletePartner(row.bpCode)
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