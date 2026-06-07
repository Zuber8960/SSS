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

export default function BusinessPartnerPage() {
  const [partners, setPartners] = useState([
    {
      bpCode: "C0001",
      bpName: "ABC Industries Ltd",
      bpType: "CUSTOMER",
      contactPerson: "Rohit Sharma",
      mobile: "9876543210",
      phone: "011-23456789",
      email: "contact@abcind.com",
      gstNo: "09ABCDE1234F1Z5",
      panNo: "ABCDE1234F",
      address: "Plot 7, Sector 10, New Delhi",
      state: "Delhi",
      city: "New Delhi",
      pincode: "110001",
      creditDays: "30",
      status: "Active",
    },
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
    status: "Active",
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
      status: "Active",
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
    if (!window.confirm("Delete Business Partner ?")) return;
    setPartners(partners.filter((x) => x.bpCode !== bpCode));
  };

  const filteredPartners = partners.filter(
    (x) =>
      x.bpCode.toLowerCase().includes(searchText.toLowerCase()) ||
      x.bpName.toLowerCase().includes(searchText.toLowerCase())
  );

  const partnerColumns = [
    { key: "bpCode", label: "Code" },
    { key: "bpName", label: "Name" },
    { key: "bpType", label: "Type" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
  ];

  const partnerActions = [
    { label: "Edit", onClick: editPartner },
    { label: "Delete", onClick: (row) => deletePartner(row.bpCode) },
  ];

  return (
    <MainLayout>
      <PageBody title="Business Partner Master">
        <PageToolbar
          actions={[
            { label: "New", onClick: clearForm },
            { label: "Save", onClick: savePartner },
            { label: "Export", onClick: () => alert("Export not implemented yet") },
          ]}
        />

        <SearchBox
          placeholder="Search Partner..."
          value={searchText}
          onChange={setSearchText}
        />

        <FormPanel>
          <FormField label="Partner Code" name="bpCode" form={form} setForm={setForm} />
          <FormField label="Partner Name" name="bpName" form={form} setForm={setForm} />
          <FormField label="Partner Type" name="bpType" form={form} setForm={setForm} options={["CUSTOMER", "CONSIGNOR", "CONSIGNEE", "VENDOR", "TRANSPORTER", "BROKER", "FLEET_OWNER", "SUPPLIER"]} />
          <FormField label="Contact Person" name="contactPerson" form={form} setForm={setForm} />
          <FormField label="Mobile" name="mobile" form={form} setForm={setForm} />
          <FormField label="Phone" name="phone" form={form} setForm={setForm} />
          <FormField label="Email" name="email" form={form} setForm={setForm} />
          <FormField label="GST No" name="gstNo" form={form} setForm={setForm} />
          <FormField label="PAN No" name="panNo" form={form} setForm={setForm} />
          <FormField label="Address" name="address" form={form} setForm={setForm} />
          <FormField label="State" name="state" form={form} setForm={setForm} />
          <FormField label="City" name="city" form={form} setForm={setForm} />
          <FormField label="Pincode" name="pincode" form={form} setForm={setForm} />
          <FormField label="Credit Days" name="creditDays" form={form} setForm={setForm} />
          <FormField label="Status" name="status" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={partnerColumns}
          rows={filteredPartners}
          getKey={(row) => row.bpCode}
          actions={partnerActions}
        />
      </PageBody>
    </MainLayout>
  );
}


//                 <td>{row.bpName}</td>
//                 <td>{row.bpType}</td>
//                 <td>{row.state}</td>
//                 <td>{row.city}</td>
//                 <td>{row.mobile}</td>
//                 <td>{row.status}</td>

//                 <td>
//                   <button
//                     onClick={() =>
//                       editPartner(row)
//                     }
//                   >
//                     Edit
//                   </button>

//                   <button
//                     style={{ marginLeft: "5px" }}
//                     onClick={() =>
//                       deletePartner(row.bpCode)
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