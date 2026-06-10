import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";

import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";


// ✅ Header Fields
const manifestFields = [
  { label: "Manifest No", name: "manifest_no" },
  { label: "Manifest Date", name: "manifest_date", type: "date" },
  { label: "From Location", name: "from_loc" },
  { label: "To Location", name: "to_loc" },

  { label: "Vehicle No", name: "vehicle_no" },
  { label: "Driver Name", name: "driver_name" },

  { label: "Consignor", name: "consignor" },
  { label: "Consignee", name: "consignee" },

  { label: "Total Weight", name: "total_wt", type: "number" },
  { label: "Total Packages", name: "total_pkgs", type: "number" },

  { label: "Remarks", name: "remarks", type: "textarea" },
];


// ✅ Detail Table Columns (Dockets inside Manifest)
const detailColumns = [
  { key: "docket_no", label: "Docket No" },
  { key: "from_loc", label: "From" },
  { key: "to_loc", label: "To" },
  { key: "packages", label: "Packages" },
  { key: "weight", label: "Weight" },
];


export default function ManifestPage() {
  const { dialog, closeAlert, showSuccess } = useAlert();

  const [form, setForm] = useState({
    manifest_no: "",
    manifest_date: "",
    from_loc: "",
    to_loc: "",
    vehicle_no: "",
    driver_name: "",
    consignor: "",
    consignee: "",
    total_wt: "",
    total_pkgs: "",
    remarks: "",
  });

  // ✅ detail rows (docket list)
  const [details, setDetails] = useState([]);


  // ✅ Add Row
  const addRow = () => {
    setDetails([
      ...details,
      {
        docket_no: "",
        from_loc: "",
        to_loc: "",
        packages: "",
        weight: "",
      },
    ]);
  };


  // ✅ Delete Row
  const deleteRow = (row) => {
    setDetails((prev) => prev.filter((r) => r !== row));
  };


  // ✅ Update Row
  const updateRow = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);
  };


  // ✅ Save
  const handleSave = () => {
    const payload = {
      header: form,
      details: details,
    };

    console.log("MANIFEST DATA:", payload);

    showSuccess("Manifest saved successfully");
  };


  return (
    <MainLayout>
      <PageBody title="Manifest Entry">

        {/* ✅ Toolbar */}
        <PageToolbar
          actions={[
            { label: "Add Row", onClick: addRow },
            { label: "Save", onClick: handleSave },
          ]}
        />

        {/* ✅ Header Form */}
        <FormPanel>
          {manifestFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
            />
          ))}
        </FormPanel>


        {/* ✅ Detail Grid */}
        <h3>Docket Details</h3>

        <DataTable
          columns={detailColumns}
          rows={details}
          getKey={(row, index) => index}
          actions={[
            {
              label: "Delete",
              onClick: deleteRow,
            },
          ]}
          editable
          onCellChange={(rowIndex, key, value) =>
            updateRow(rowIndex, key, value)
          }
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}