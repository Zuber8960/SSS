import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  SearchBox,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";

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
    (x) =>
      x.locCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.locName.toLowerCase().includes(searchText.toLowerCase())
  );

  const locationColumns = [
    { key: "locCode", label: "Location Code" },
    { key: "locName", label: "Location Name" },
    { key: "locType", label: "Type" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
  ];

  const locationActions = [
    { label: "Edit", onClick: editLocation },
    { label: "Delete", onClick: (row) => deleteLocation(row.locCode) },
  ];

  return (
    <MainLayout>
      <PageBody title="Location Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveLocation },
            { label: "Export", onClick: () => alert("Export not implemented yet") },
          ]}
        />

        <SearchBox
          placeholder="Search Location..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Company Code" name="companyCode" form={form} setForm={setForm} />
          <FormField label="Division Code" name="divisionCode" form={form} setForm={setForm} />
          <FormField label="Location Code" name="locCode" form={form} setForm={setForm} />
          <FormField label="Location Name" name="locName" form={form} setForm={setForm} />
          <FormField label="Location Type" name="locType" form={form} setForm={setForm} options={["HO", "RO", "ZO", "AO", "BRANCH", "WAREHOUSE", "YARD"]} />
          <FormField label="Country" name="country" form={form} setForm={setForm} />
          <FormField label="State" name="state" form={form} setForm={setForm} />
          <FormField label="City" name="city" form={form} setForm={setForm} />
          <FormField label="Area" name="area" form={form} setForm={setForm} />
          <FormField label="Address" name="address" form={form} setForm={setForm} />
          <FormField label="Pincode" name="pincode" form={form} setForm={setForm} />
          <FormField label="Phone" name="phone" form={form} setForm={setForm} />
          <FormField label="Email" name="email" form={form} setForm={setForm} />
          <FormField label="Opened On" name="openedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Closed On" name="closedOn" form={form} setForm={setForm} type="date" />
          <FormField label="Status" name="status" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={locationColumns}
          rows={filteredLocations}
          getKey={(row) => row.locCode}
          actions={locationActions}
        />
      </PageBody>
    </MainLayout>
  );
}
//             <label>State</label>
//             <input
//               value={form.state}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   state: e.target.value
//                 })
//               }
//             />

//             <label>City</label>
//             <input
//               value={form.city}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   city: e.target.value
//                 })
//               }
//             />

//             <label>Area</label>
//             <input
//               value={form.area}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   area: e.target.value
//                 })
//               }
//             />

//             <label>Address</label>
//             <input
//               value={form.address}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   address: e.target.value
//                 })
//               }
//             />

//             <label>Pincode</label>
//             <input
//               value={form.pincode}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   pincode: e.target.value
//                 })
//               }
//             />

//             <label>Phone</label>
//             <input
//               value={form.phone}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   phone: e.target.value
//                 })
//               }
//             />

//             <label>Email</label>
//             <input
//               value={form.email}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   email: e.target.value
//                 })
//               }
//             />

//             <label>Opened On</label>
//             <input
//               type="date"
//               value={form.openedOn}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   openedOn: e.target.value
//                 })
//               }
//             />

//             <label>Closed On</label>
//             <input
//               type="date"
//               value={form.closedOn}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   closedOn: e.target.value
//                 })
//               }
//             />

//             <label>Status</label>

//             <select
//               value={form.status}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   status: e.target.value
//                 })
//               }
//             >
//               <option>Active</option>
//               <option>Inactive</option>
//             </select>

//           </div>

//         </div>

//         {/* Grid */}

//         <table
//           width="100%"
//           border="1"
//           cellPadding="8"
//           style={{ borderCollapse: "collapse" }}
//         >
//           <thead>
//             <tr>
//               <th>Code</th>
//               <th>Name</th>
//               <th>Division</th>
//               <th>Type</th>
//               <th>State</th>
//               <th>City</th>
//               <th>Status</th>
//               <th>Action</th>
//             </tr>
//           </thead>

//           <tbody>

//             {filteredLocations.map((row) => (
//               <tr key={row.locCode}>
//                 <td>{row.locCode}</td>
//                 <td>{row.locName}</td>
//                 <td>{row.divisionCode}</td>
//                 <td>{row.locType}</td>
//                 <td>{row.state}</td>
//                 <td>{row.city}</td>
//                 <td>{row.status}</td>

//                 <td>
//                   <button
//                     onClick={() =>
//                       editLocation(row)
//                     }
//                   >
//                     Edit
//                   </button>

//                   <button
//                     style={{ marginLeft: "5px" }}
//                     onClick={() =>
//                       deleteLocation(row.locCode)
//                     }
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}

//           </tbody>
//         </table>

//       </div>

//     </MainLayout>
//   );
// }