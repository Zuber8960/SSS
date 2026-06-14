import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import moment from "moment";
import {
  DataTable,
  FormField,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { useEffect } from "react";
import { fetchEwayBill } from "../../utils/docket";

const headerFields = [
  { label: "Docket No", name: "docket_no" },
  { label: "Docket Date", name: "docket_date", type: "date" },
  { label: "From Location", name: "docket_loc" },
  { label: "To Location", name: "docket_to_loc" },
  // { label: "Consignor", name: "cnor" },
  // { label: "Consignee", name: "cnee" },
  { label: "Actual Weight", name: "act_wt", type: "number" },
  { label: "Charge Weight", name: "chrg_wt", type: "number" },

  { label: "No of CB", name: "no_cb", type: "number" },
  { label: "No of W. Crate", name: "no_w_crate", type: "number" },
  { label: "No of W. CBox", name: "no_w_cbox", type: "number" },
  { label: "No of Loose", name: "no_loose", type: "number" },
  { label: "No of Others", name: "no_others", type: "number" },
  { label: "Total Packages", name: "tot_pkgs", type: "number" },

  { label: "Rate", name: "rate", type: "number" },
  {
    label: "Rate UOM",
    name: "rate_uom",
    options: [
      { label: "Fixed", value: "Fixed" },
      { label: "Per Trip", value: "Per Trip" },
      { label: "Per KG", value: "Per KG" },
      { label: "Per Unit", value: "Per Unit" },
      { label: "Per Tone", value: "Per Tone" },
    ],
  },

  { label: "PO Number", name: "po_no" },
  { label: "PO Date", name: "po_date", type: "date" },

  { label: "Invoice No", name: "invoice_no" },
  { label: "Invoice Date", name: "invoice_date", type: "date" },
  { label: "Invoice Value", name: "invoice_value", type: "number" },

  {
    label: "RISK",
    name: "risk",
    options: [
      { label: "Insured by Transporter", value: "Insured by Transporter" },
      { label: "Insured by Customer", value: "Insured by Customer" },
      { label: "Not Insured", value: "Not Insured" },
    ],
  },

  { label: "Insurance Company", name: "insurance_company" },
  { label: "Insurance Policy No.", name: "insurance_policy_no" },
  { label: "Ins. Certificate No.", name: "insurance_cert_no" },
  { label: "Sum Insured", name: "sum_insured", type: "number" },
  { label: "Valid Upto", name: "valid_upto", type: "date" },

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

// Group fields into logical sections
const formSections = [
  {
    title: "Docket Information",
    icon: "📋",
    fields: ["docket_no", "docket_date", "docket_loc", "docket_to_loc"],
  },
  {
    title: "Package Details",
    icon: "📦",
    fields: [
      "act_wt",
      "chrg_wt",
      "no_cb",
      "no_w_crate",
      "no_w_cbox",
      "no_loose",
      "no_others",
      "tot_pkgs",
    ],
  },
  {
    title: "Rate & Charges",
    icon: "💰",
    fields: ["rate", "rate_uom"],
  },
  {
    title: "PO & Invoice",
    icon: "📄",
    fields: ["po_no", "po_date", "invoice_no", "invoice_date", "invoice_value"],
  },
  {
    title: "Insurance Details",
    icon: "🛡️",
    fields: [
      "risk",
      "insurance_company",
      "insurance_policy_no",
      "insurance_cert_no",
      "sum_insured",
      "valid_upto",
    ],
  },
  {
    title: "Goods Details",
    icon: "🏷️",
    fields: ["goods_grp", "goods_subgrp", "goods_desc"],
  },
  {
    title: "Remarks",
    icon: "💬",
    fields: ["remark"],
  },
];

const ewbColumns = [
  { key: "ewb_no", label: "EWB No" },
  { key: "ewb_date", label: "EWB Date" },
  { key: "ewb_valid", label: "Valid Upto" },
  { key: "inv_no", label: "Invoice No" },
  { key: "inv_date", label: "Invoice Date" },
];

const chargeDescOptions = [
  "Freight",
  "Ser charge",
  "COF",
  "Freight On Value",
];

const chargeColumns = [
  { key: "charge_code", label: "Charge Desc", options: chargeDescOptions },
  { key: "user_code", label: "User Desc", type: "number" },
  { key: "charge_amt", label: "Charge Amount", editable: false },
];

const chargeDefaults = {
  Freight: { user_code: 100 },
  "Ser charge": { user_code: "" },
  COF: { user_code: 0.003 },
  "Freight On Value": { user_code: "" },
};

export default function DocketPage() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();

  const [form, setForm] = useState({
    docket_no: "",
    docket_date: "",
    docket_loc: "",
    docket_to_loc: "",
    // cnor: "",
    // cnee: "",
    act_wt: "",
    chrg_wt: "",
    no_cb: 0,
    no_w_crate: 0,
    no_w_cbox: 0,
    no_loose: 0,
    no_others: 0,
    tot_pkgs: 0,
    rate: "",
    rate_uom: "",
    tot_amt: "",
    po_no: "",
    po_date: "",
    invoice_no: "",
    invoice_date: "",
    invoice_value: "",
    risk: "",
    insurance_company: "",
    insurance_policy_no: "",
    insurance_cert_no: "",
    sum_insured: "",
    valid_upto: "",
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
  const [sectionOrder, setSectionOrder] = useState(["ewayBill", "charges"]);
  const [isDocketNoEnabled, setIsDocketNoEnabled] = useState(false);
  const [docketNumberInput, setDocketNumberInput] = useState("");
  const [isFormEditMode, setIsFormEditMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const moveSectionToTop = (section) => {
    setSectionOrder((prev) => [section, ...prev.filter((item) => item !== section)]);
  };

  const sectionButtonStyle = {
    padding: "8px 18px",
    border: "none",
    borderRadius: 6,
    background: "#7e22ce",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  };

  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const sectionActionsStyle = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  };

  // ✅ Add rows
  const addEwbRow = () => {
    setEwbList([
      ...ewbList,
      { ewb_no: "", ewb_date: "", ewb_valid: "", inv_no: "", inv_date: "" },
    ]);
  };

  const addChargeRow = () => {
    setChargeList((prev) => [
      ...prev,
      calculateChargeRow(
        { charge_code: "Freight", ...chargeDefaults.Freight },
        [...prev, { charge_code: "Freight", ...chargeDefaults.Freight }]
      ),
    ]);
  };

  // ✅ Delete rows
  const deleteEwb = (row) => {
    setEwbList((prev) => prev.filter((_, index) => index !== row.id));
  };

  const deleteCharge = (row) => {
    setChargeList((prev) =>
      recalculateChargeList(prev.filter((_, index) => index !== row.id))
    );
  };

  const editCharge = () => {
    showInfo("Double click a charge cell to edit it.");
  };

  // ✅ Edit handlers
  const updateRow = (listSetter, list, index, field, value) => {
    const updated = [...list];
    updated[index][field] = value;
    listSetter(updated);
  };

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const formatAmount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
  };

  const calculateFreightAmount = (row) => {
    return toNumber(row.user_code);
  };

  const getFreightAmount = (rows) => {
    const freightRow = rows.find((row) => row.charge_code === "Freight");
    return freightRow ? calculateFreightAmount(freightRow) : 0;
  };

  const calculateChargeRow = (row, rows) => {
    const chargeCode = row.charge_code;
    const userValue = toNumber(row.user_code);
    const invoiceValue = toNumber(form.invoice_value);
    let chargeAmount = 0;

    if (chargeCode === "Freight") {
      chargeAmount = calculateFreightAmount(row);
    } else if (chargeCode === "Ser charge") {
      chargeAmount = (getFreightAmount(rows) * userValue) / 100;
    } else if (chargeCode === "COF") {
      chargeAmount = invoiceValue * userValue;
    } else if (chargeCode === "Freight On Value") {
      chargeAmount = (invoiceValue * userValue) / 100;
    }

    return {
      ...row,
      charge_amt: formatAmount(chargeAmount),
    };
  };

  const recalculateChargeList = (rows) =>
    rows.map((row) => calculateChargeRow(row, rows));

  const updateChargeRow = (index, field, value) => {
    const updated = [...chargeList];
    const existingRow = updated[index] || {};
    const defaults =
      field === "charge_code" ? chargeDefaults[value] || {} : {};

    updated[index] = {
      ...existingRow,
      ...defaults,
      [field]: value,
    };

    const recalculated = recalculateChargeList(updated);

    setChargeList(recalculated);

    return recalculated[index];
  };

  const fetchData = async (ewbLists) => {
    try {
      setLoading(true);
      setError("");
      const { data } = await fetchEwayBill(ewbLists);
      const ewRecords = data
        .filter(obj => obj.data)
        .map(obj => {
          const f = obj.data;
          const m = moment(f.docDate, "DD/MM/YYYY", true);

          return {
            docket_no: f.docNo || "",
            docket_date: m.isValid() ? m.format("YYYY-MM-DD") : "",
            docket_loc: f.fromPlace || "",
            docket_to_loc: f.toPlace || "",
            remark: f.status_desc || "Shipment is about to complete",
          };
        });

      const ewdata = {
        docket_no: ewRecords.map(x => x.docket_no).filter(Boolean).join(", "),
        docket_date: ewRecords
          .map(x => x.docket_date)
          .filter(Boolean)
          .sort()
          .pop() || "", // max date
        docket_loc: [...new Set(ewRecords.map(x => x.docket_loc).filter(Boolean))].join(", "),
        docket_to_loc: [...new Set(ewRecords.map(x => x.docket_to_loc).filter(Boolean))].join(", "),
        act_wt: "",
        chrg_wt: "",
        no_cb: 0,
        no_w_crate: 0,
        no_w_cbox: 0,
        no_loose: 0,
        no_others: 0,
        tot_pkgs: 0,
        rate: "",
        rate_uom: "",
        tot_amt: "",
        po_no: "",
        po_date: "",
        invoice_no: "",
        invoice_date: "",
        invoice_value: "",
        goods_grp: "",
        goods_subgrp: "",
        goods_desc: "",
        remark: [...new Set(ewRecords.map(x => x.remark).filter(Boolean))].join(", ")
      };
      ewdata && setForm(ewdata);
      setEwbList(data.map(obj => {
        return {
          ewb_no: obj.data.ewbNo,
          ewb_date: moment(obj.data.ewayBillDate, "DD/MM/YYYY hh:mm:ss A").format("MM/DD/YYYY"),
          ewb_valid: moment(obj.data.validUpto, "DD/MM/YYYY hh:mm:ss A").format("MM/DD/YYYY"),
          inv_no: "",
          inv_date: ""
        }
      }));
    } catch (err) {
      setError(err.message || "Failed to load locations");
      showError(err.message || "Failed to load locations");
      console.error("Error loading locations:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // fetchData();
  }, []);

  useEffect(() => {
    setChargeList((prev) => {
      const recalculated = recalculateChargeList(prev);
      return JSON.stringify(recalculated) === JSON.stringify(prev)
        ? prev
        : recalculated;
    });
  }, [form.rate, form.chrg_wt, form.tot_pkgs, form.invoice_value]);

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


  const showFormOnClick = async (e) => {
    if (e.target.classList.contains('active') === false) {
      console.log(ewbList);
      const ewbLists = [...new Set(ewbList.filter(obj => obj.ewb_no).map(obj => obj.ewb_no))].map(Number);
      await fetchData(ewbLists);
    }
    setShowForm((prev) => !prev);
  };

  const handleEditView = () => {
    const docketNo = docketNumberInput.trim();

    setIsFormEditMode(Boolean(docketNo));
    setShowForm(true);

    if (docketNo) {
      setForm((prev) => ({ ...prev, docket_no: docketNo }));
    }
  };

  // Build a lookup map from field name to field config
  const fieldMap = {};
  headerFields.forEach((f) => {
    fieldMap[f.name] = f;
  });

  // Section card styles
  const sectionCardStyles = {
    sectionCard: {
      background: "#fffefe",
      borderRadius: 12,
      border: "1px solid #e9e5f0",
      boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
      overflow: "hidden",
      marginBottom: 0,
      transition: "box-shadow 0.2s ease",
    },
    sectionHeader: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 20px",
      background: "linear-gradient(135deg, #f6f3ff 0%, #f0ecf9 100%)",
      borderBottom: "1px solid #e9e5f0",
    },
    sectionIcon: {
      fontSize: 18,
      lineHeight: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: "#4a3466",
      textTransform: "uppercase",
      letterSpacing: 0.1,
      margin: 0,
    },
    sectionFields: {
      padding: "18px 20px",
      display: "grid",
      gap: 16,
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    },
    fullWidthField: {
      gridColumn: "1 / -1",
    },
  };

  // Render a single form section card
  const renderFormSection = (section) => {
    const sectionFieldConfigs = section.fields
      .map((name) => fieldMap[name])
      .filter(Boolean);

    if (sectionFieldConfigs.length === 0) return null;

    const insuranceFields = [
      "insurance_company",
      "insurance_policy_no",
      "insurance_cert_no",
      "sum_insured",
      "valid_upto",
    ];

    // For insurance section, filter out fields that depend on risk === "Insured by Customer"
    const filteredFields =
      section.title === "Insurance Details"
        ? sectionFieldConfigs.filter((f) => {
            if (insuranceFields.includes(f.name)) {
              return form.risk === "Insured by Customer";
            }
            return true;
          })
        : sectionFieldConfigs;

    if (filteredFields.length === 0) return null;

    return (
      <div key={section.title} style={sectionCardStyles.sectionCard}>
        <div style={sectionCardStyles.sectionHeader}>
          <span style={sectionCardStyles.sectionIcon}>{section.icon}</span>
          <h4 style={sectionCardStyles.sectionTitle}>{section.title}</h4>
        </div>
        <div style={sectionCardStyles.sectionFields}>
          {filteredFields.map((field) => {
            const isTextarea = field.type === "textarea";
            return (
              <div
                key={field.name}
                style={isTextarea ? sectionCardStyles.fullWidthField : undefined}
              >
                <FormField
                  {...field}
                  form={form}
                  setForm={setForm}
                  disabled={
                    !isFormEditMode ||
                    (field.name === "docket_no" && !isDocketNoEnabled)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <PageBody title="Docket Entry">
        <PageToolbar
          actions={[
            {
              label: showForm ? "Hide Form" : "Show Form",
              active: showForm,
              onClick: showFormOnClick,
            },
            {
              label: showEwayBill ? "Hide E-Waybill" : "Show E-Waybill",
              active: showEwayBill,
              onClick: () => {
                if (!showEwayBill) {
                  moveSectionToTop("ewayBill");
                }
                setShowEwayBill((prev) => !prev);
              },
            },
            {
              label: showCharges ? "Hide Charges" : "Show Charges",
              active: showCharges,
              onClick: () => {
                if (!showCharges) {
                  moveSectionToTop("charges");
                }
                setShowCharges((prev) => !prev);
              },
            },
          ]}
        />
        {/* ✅ Detail Tables */}
        {sectionOrder.map((section) => {
          if (section === "ewayBill" && showEwayBill) {
            return (
              <div key="ewayBill">
                <div style={sectionHeaderStyle}>
                  <h3>EWB Details</h3>
                  <div style={sectionActionsStyle}>
                    <button
                      type="button"
                      onClick={addEwbRow}
                      style={sectionButtonStyle}
                    >
                      Add EWB
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      style={sectionButtonStyle}
                    >
                      Save
                    </button>
                  </div>
                </div>
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
              </div>
            );
          }

          if (section === "charges" && showCharges) {
            return (
              <div key="charges">
                <div style={sectionHeaderStyle}>
                  <h3>Charges</h3>
                  <div style={sectionActionsStyle}>
                    <button
                      type="button"
                      onClick={addChargeRow}
                      style={sectionButtonStyle}
                    >
                      Add Charge
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      style={sectionButtonStyle}
                    >
                      Save
                    </button>
                  </div>
                </div>
                <DataTable
                  columns={chargeColumns}
                  rows={chargeList}
                  getKey={(row, idx) => idx}
                  actions={[
                    { label: "Edit", onClick: editCharge },
                    { label: "Delete", onClick: deleteCharge },
                  ]}
                  editable
                  onCellChange={(rowIndex, key, value) =>
                    updateChargeRow(rowIndex, key, value)
                  }
                />
              </div>
            );
          }

          return null;
        })}

        {/* ✅ Header Form */}
        {showForm && (
          <>
            <div style={sectionHeaderStyle}>
              <h3>FORM</h3>
              <div style={sectionActionsStyle}>
                <div className="formFieldGroup" style={{ minWidth: 150 }}>
                  <input
                    type="number"
                    value={form.tot_amt}
                    onChange={(e) => setForm({ ...form, tot_amt: parseFloat(e.target.value) || 0 })}
                    placeholder="Total Amount"
                    disabled={true}
                    style={{ padding: "9px 14px", fontSize: 14 }}
                  />
                </div>
                
                <div className="formFieldGroup" style={{ minWidth: 150 }}>
                  <input
                    type="text"
                    value={docketNumberInput}
                    onChange={(e) => setDocketNumberInput(e.target.value)}
                    placeholder="Enter Docket Num"
                    style={{ padding: "9px 14px", fontSize: 14 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleEditView}
                  style={sectionButtonStyle}
                >
                  Edit/View
                </button>
                <button
                  type="button"
                  onClick={() => setIsDocketNoEnabled((prev) => !prev)}
                  style={sectionButtonStyle}
                >
                  {isDocketNoEnabled ? "Disable Docket No" : "Enable Docket No"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  style={sectionButtonStyle}
                >
                  Save
                </button>
              </div>
            </div>
            <div
              style={{
                background: "#f8f6ff",
                borderRadius: 14,
                border: "1px solid #e9e5f0",
                padding: "0 1px",
                boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
              }}
            >
              {formSections.map((section) => renderFormSection(section))}
            </div>
          </>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
