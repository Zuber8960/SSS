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

const headerFields = [
  { label: "Docket No", name: "docket_no" },
  { label: "Docket Date", name: "docket_date", type: "date" },
  { label: "From Location", name: "docket_loc" },
  { label: "To Location", name: "docket_to_loc" },
  { label: "Consignor", name: "cnor" },
  { label: "Consignee", name: "cnee" },
  { label: "Actual Weight", name: "act_wt", type: "number" },
  { label: "Charge Weight", name: "chrg_wt", type: "number" },

  { label: "No of CB", name: "no_cb", type: "number" },
  { label: "No of W. Crate", name: "no_w_crate", type: "number" },
  { label: "No of W. CBox", name: "no_w_cbox", type: "number" },
  { label: "No of Loose", name: "no_loose", type: "number" },
  { label: "No of Others", name: "no_others", type: "number" },
  { label: "Total Packages", name: "tot_pkgs", type: "number" },

  { label: "Rate", name: "rate", type: "number" },
  { label: "Total Amount", name: "tot_amt", type: "number" },

  { label: "PO Number", name: "po_no" },
  { label: "PO Date", name: "po_date", type: "date" },

  { label: "Invoice No", name: "invoice_no" },
  { label: "Invoice Date", name: "invoice_date", type: "date" },
  { label: "Invoice Value", name: "invoice_value", type: "number" },

  {
    label: "Goods Group",
    name: "goods_grp",
    options: [
      { label: "Group 1", value: "GRP1" },
      { label: "Group 2", value: "GRP2" },
    ],
  },
  {
    label: "Goods Sub Group",
    name: "goods_subgrp",
    options: [
      { label: "Sub Group 1", value: "SUB1" },
      { label: "Sub Group 2", value: "SUB2" },
    ],
  },
  { label: "Goods Description", name: "goods_desc" },
  { label: "Remarks", name: "remark", type: "textarea" },
];

const ewbColumns = [
  { key: "ewb_no", label: "EWB No" },
  { key: "ewb_date", label: "EWB Date" },
  { key: "ewb_valid", label: "Valid Upto" },
  { key: "inv_no", label: "Invoice No" },
  { key: "inv_date", label: "Invoice Date" },
];

const chargeColumns = [
  { key: "charge_code", label: "Charge Code" },
  { key: "charge_amt", label: "Amount" },
];

export default function DocketPage() {
  const { dialog, closeAlert, showSuccess } = useAlert();

  const [form, setForm] = useState({
    docket_no: "",
    docket_date: "",
    docket_loc: "",
    docket_to_loc: "",
    cnor: "",
    cnee: "",
    act_wt: "",
    chrg_wt: "",
    no_cb: 0,
    no_w_crate: 0,
    no_w_cbox: 0,
    no_loose: 0,
    no_others: 0,
    tot_pkgs: 0,
    rate: "",
    tot_amt: "",
    po_no: "",
    po_date: "",
    invoice_no: "",
    invoice_date: "",
    invoice_value: "",
    goods_grp: "",
    goods_subgrp: "",
    goods_desc: "",
    remark: "",
  });

  const [ewbList, setEwbList] = useState([]);
  const [chargeList, setChargeList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEwayBill, setShowEwayBill] = useState(true);
  const [showCharges, setShowCharges] = useState(false);
  const [isDocketNoEnabled, setIsDocketNoEnabled] = useState(false);

  // ✅ Add rows
  const addEwbRow = () => {
    setEwbList([
      ...ewbList,
      { ewb_no: "", ewb_date: "", ewb_valid: "", inv_no: "", inv_date: "" },
    ]);
  };

  const addChargeRow = () => {
    setChargeList([...chargeList, { charge_code: "", charge_amt: "" }]);
  };

  // ✅ Delete rows
  const deleteEwb = (row) => {
    setEwbList((prev) => prev.filter((_, index) => index !== row.id));
  };

  const deleteCharge = (row) => {
    setChargeList((prev) => prev.filter((_, index) => index !== row.id));
  };

  // ✅ Edit handlers
  const updateRow = (listSetter, list, index, field, value) => {
    const updated = [...list];
    updated[index][field] = value;
    listSetter(updated);
  };

  // ✅ Save
  const handleSave = () => {
    const payload = {
      header: form,
      ewbDetails: ewbList,
      charges: chargeList,
    };

    console.log("SAVE DATA:", payload);
    showSuccess("Docket saved successfully (console log)");
  };

  return (
    <MainLayout>
      <PageBody title="Docket Entry">
        <PageToolbar
          actions={[
            { label: "Save", onClick: handleSave },
            {
              label: showForm ? "Hide Form" : "Show Form",
              active: showForm,
              onClick: () => setShowForm((prev) => !prev),
            },
            {
              label: isDocketNoEnabled ? "Disable Docket No" : "Enable Docket No",
              active: isDocketNoEnabled,
              onClick: () => setIsDocketNoEnabled((prev) => !prev),
            },
            {
              label: showEwayBill ? "Hide E-Waybill" : "Show E-Waybill",
              active: showEwayBill,
              onClick: () => setShowEwayBill((prev) => !prev),
            },
            ...(showEwayBill
              ? [{ label: "Add EWB", onClick: addEwbRow }]
              : []),
            {
              label: showCharges ? "Hide Charges" : "Show Charges",
              active: showCharges,
              onClick: () => setShowCharges((prev) => !prev),
            },
            ...(showCharges
              ? [{ label: "Add Charge", onClick: addChargeRow }]
              : []),
          ]}
        />
         {/* ✅ EWB Table */}
        {showEwayBill && (
          <>
            <h3>EWB Details</h3>
            <DataTable
              columns={ewbColumns}
              rows={ewbList}
              getKey={(row, idx) => idx}
              actions={[
                { label: "Delete", onClick: deleteEwb },
              ]}
              editable
              onCellChange={(rowIndex, key, value) =>
                updateRow(setEwbList, ewbList, rowIndex, key, value)
              }
            />
          </>
        )}

        {/* ✅ Header Form */}
        {showForm && (
          <>
          <h3>FORM</h3>
          <FormPanel>
            {headerFields.map((field) => (
              <FormField
                key={field.name}
                {...field}
                form={form}
                setForm={setForm}
                disabled={field.name === "docket_no" && !isDocketNoEnabled}
              />
            ))}
          </FormPanel>
          </>
        )}

       

        {/* ✅ Charges Table */}
        {showCharges && (
          <>
            <h3>Charges</h3>
            <DataTable
              columns={chargeColumns}
              rows={chargeList}
              getKey={(row, idx) => idx}
              actions={[
                { label: "Delete", onClick: deleteCharge },
              ]}
              editable
              onCellChange={(rowIndex, key, value) =>
                updateRow(setChargeList, chargeList, rowIndex, key, value)
              }
            />
          </>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
