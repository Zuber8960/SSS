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
const tripFields = [
];


// ✅ Detail Table Columns (Hire Charges)
const detailColumns = [
];


export default function TripSheetPage() {

  const { dialog, closeAlert, showSuccess } = useAlert();

  const [form, setForm] = useState({
    trip_no: "",
    trip_date: "",
    vendor_name: "",
    vehicle_no: "",
    from_loc: "",
    to_loc: "",
    total_km: "",
    total_trips: "",
    remarks: "",
  });

  // ✅ Detail rows
  const [details, setDetails] = useState([]);

  // ✅ Add Row
  const addRow = () => {
    setDetails([
      ...details,
      {
        trip_no: "",
        date: "",
        from_loc: "",
        to_loc: "",
        km: "",
        rate: "",
        amount: "",
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

    // ✅ auto calculation
    if (field === "km" || field === "rate") {
      updated[index][field] = value;

      const km = Number(updated[index].km || 0);
      const rate = Number(updated[index].rate || 0);

      updated[index].amount = km * rate;
    } else {
      updated[index][field] = value;
    }

    setDetails(updated);
  };

  // ✅ Save
  const handleSave = () => {
    const payload = {
      header: form,
      details: details,
    };

    console.log("TRIP SHEET:", payload);

    showSuccess("Trip Sheet saved successfully");
  };

  return (
    <MainLayout>
      <PageBody title="Trip Sheet">

        {/* ✅ Toolbar */}
        <PageToolbar
          actions={[
            { label: "Add Row", onClick: addRow },
            { label: "Save", onClick: handleSave },
          ]}
        />

        {/* ✅ Header Form */}
        <FormPanel>
          {tripFields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              form={form}
              setForm={setForm}
            />
          ))}
        </FormPanel>

        {/* ✅ Details Table */}
        <h3>Trip Details</h3>

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