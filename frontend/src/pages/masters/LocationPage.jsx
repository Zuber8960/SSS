import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  SearchBox,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import { fetchAllLocations } from "../../utils/locationMaster";

export default function LocationPage() {
  const [locations, setLocations] = useState([
    {
      loc_code: "HO01",
      loc_name: "Corporate Head Office",
      loc_type: "HO",
      loc_state: "UTTAR PRADESH",
      loc_town: "",
      loc_status: "A",
    },
  ]);

  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState({
    loc_id: "",
    record_id: "",
    loc_code: "",
    loc_name: "",
    loc_type: "HO",
    loc_country: "INDIA",
    loc_state: "",
    loc_town: "",
    loc_postal_code: "",
    loc_opened_on: "",
    loc_closed_on: "",
    loc_status: "A",
    parent_loc_code: "",
    longitude: "",
    mobile_no: "",
    telephone_no: "",
  });

  const clearForm = () => {
    setForm({
      loc_id: "",
      record_id: "",
      loc_code: "",
      loc_name: "",
      loc_type: "HO",
      loc_country: "INDIA",
      loc_state: "",
      loc_town: "",
      loc_postal_code: "",
      loc_opened_on: "",
      loc_closed_on: "",
      loc_status: "A",
      parent_loc_code: "",
      longitude: "",
      mobile_no: "",
      telephone_no: ""
    });
  };

  const saveLocation = () => {
    if (!form.loc_code) {
      alert("Location Code is required");
      return;
    }
    if (!form.loc_name) {
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
    if (!window.confirm("Delete Location ?")) return;

    setLocations(locations.filter((x) => x.loc_code !== locCode));
  };

  const filteredLocations = locations.filter(
    (x) =>
      x.loc_code?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.loc_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const locationColumns = [
    { key: "loc_code", label: "Location Code" },
    { key: "loc_name", label: "Location Name" },
    { key: "loc_type", label: "Type" },
    { key: "loc_state", label: "State" },
    { key: "loc_town", label: "Town" },
    {
      key: "loc_status",
      label: "Status",
    },
  ];

  const locationActions = [
    { label: "Edit", onClick: editLocation },
    { label: "Delete", onClick: (row) => deleteLocation(row.loc_code) },
  ];

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocationAtMount = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllLocations();
        setLocations(data);
      } catch (err) {
        setError(err.message || "Failed to load locations");
        console.error("Error loading locations:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLocationAtMount();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Location Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: saveLocation },
            {
              label: "Export",
              onClick: () => alert("Export not implemented yet"),
            },
          ]}
        />

        <SearchBox
          placeholder="Search Location..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Location Code" name="loc_code" form={form} setForm={setForm} />
          <FormField label="Location Name" name="loc_name" form={form} setForm={setForm} />
          <FormField
            label="Location Type"
            name="loc_type"
            form={form}
            setForm={setForm}
            options={["HO", "RO", "ZO", "AO", "BRANCH", "WAREHOUSE", "YARD"]}
          />
          <FormField label="Country" name="loc_country" form={form} setForm={setForm} />
          <FormField label="State" name="loc_state" form={form} setForm={setForm} />
          <FormField label="Town / City" name="loc_town" form={form} setForm={setForm} />
          <FormField label="Postal Code" name="loc_postal_code" form={form} setForm={setForm} />
          <FormField
            label="Opened On"
            name="loc_opened_on"
            type="date"
            form={form}
            setForm={setForm}
          />
          <FormField
            label="Closed On"
            name="loc_closed_on"
            type="date"
            form={form}
            setForm={setForm}
          />
          <FormField
            label="Status"
            name="loc_status"
            form={form}
            setForm={setForm}
            options={[
              { label: "Active", value: "A" },
              { label: "Inactive", value: "I" },
            ]}
          />
          <FormField label="Parent Location Code" name="parent_loc_code" form={form} setForm={setForm} />
          <FormField label="Longitude" name="longitude" form={form} setForm={setForm} />
          <FormField label="Mobile No" name="mobile_no" form={form} setForm={setForm} />
          <FormField label="Telephone No" name="telephone_no" form={form} setForm={setForm} />
        </FormPanel>

        <DataTable
          columns={locationColumns}
          rows={filteredLocations}
          getKey={(row) => row.loc_code}
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