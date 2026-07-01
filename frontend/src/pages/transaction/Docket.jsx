import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import moment from "moment";
import {
  FormField,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { useEffect } from "react";
import {
  fetchEwayBill,
  fetchDocketByDocketNo,
  createDocket,
  updateDocket,
  fetchEwayBillFromDB,
  saveEwayBillToDB,
} from "../../utils/docket";
import ChargesSection from "./docket/ChargesSection";
import EwayBillSection from "./docket/EwayBillSection";

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
  const [docketId, setDocketId] = useState(null);

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

  // ✅ Delete rows
  const deleteEwb = (row) => {
    setEwbList((prev) => prev.filter((_, index) => index !== row.id));
  };

  // ✅ Edit handlers
  const updateRow = (listSetter, list, index, field, value) => {
    const updated = [...list];
    updated[index][field] = value;
    listSetter(updated);
  };

  const fetchData = async (ewbLists) => {
    try {
      setLoading(true);
      setError("");

      // 1. Check which ewb numbers already exist in the database
      let existingEwbNos = [];
      try {
        const dbRecords = await fetchEwayBillFromDB(ewbLists);
        existingEwbNos = (dbRecords || []).map(r => Number(r.ewb_no));
      } catch (dbErr) {
        console.warn("DB check failed, proceeding to fetch all from govt portal:", dbErr);
      }

      // 2. Determine which ewb numbers need to be fetched from government portal
      const missingEwbNos = ewbLists.filter(no => !existingEwbNos.includes(no));

      // 3. Fetch missing records from government portal and save to DB
      let govtData = [];
      if (missingEwbNos.length > 0) {
        try {
          const response = await fetchEwayBill(missingEwbNos);
          govtData = response?.data || response || [];

          // Save government portal data to DB
          if (govtData.length > 0) {
            try {
              await saveEwayBillToDB(govtData);
              showInfo(`${govtData.length} e-way bill(s) saved to database`);
            } catch (saveErr) {
              console.warn("Failed to save ewaybill to DB:", saveErr);
            }
          }
        } catch (govtErr) {
          console.warn("Failed to fetch from govt portal:", govtErr);
          showWarning("Could not fetch from government portal");
        }
      } else {
        showInfo("All e-way bills already exist in database");
      }

      // 4. Build combined records from both DB and govt data
      const allRecords = [
        ...(dbRecords || []),
        ...(govtData.filter(obj => obj.data).map(obj => obj.data) || [])
      ];

      if (allRecords.length === 0) {
        showWarning("No e-way bill records found");
        setEwbList([]);
        return;
      }

      const ewRecords = allRecords.map(f => {
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
          .pop() || "",
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

      // 5. Build ewb list from govt data (which includes ewbNo/ewayBillDate/validUpto)
      const govtEwbRecords = govtData
        .filter(obj => obj.data)
        .map(obj => ({
          ewb_no: obj.data.ewbNo,
          ewb_date: moment(obj.data.ewayBillDate, "DD/MM/YYYY hh:mm:ss A").format("MM/DD/YYYY"),
          ewb_valid: moment(obj.data.validUpto, "DD/MM/YYYY hh:mm:ss A").format("MM/DD/YYYY"),
          inv_no: "",
          inv_date: ""
        }));

      // For DB records without portal details, add basic entry
      const dbEwbRecords = (dbRecords || [])
        .filter(r => !govtEwbRecords.some(g => String(g.ewb_no) === String(r.ewb_no)))
        .map(r => ({
          ewb_no: r.ewb_no || "",
          ewb_date: r.ewb_date ? moment(r.ewb_date).format("MM/DD/YYYY") : "",
          ewb_valid: r.valid_upto ? moment(r.valid_upto).format("MM/DD/YYYY") : "",
          inv_no: "",
          inv_date: ""
        }));

      setEwbList([...govtEwbRecords, ...dbEwbRecords]);
    } catch (err) {
      setError(err.message || "Failed to load e-way bill data");
      showError(err.message || "Failed to load e-way bill data");
      console.error("Error loading e-way bill data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // fetchData();
  }, []);

  const showFormOnClick = async (e) => {
    if (e.target.classList.contains('active') === false) {
      console.log(ewbList);
      const ewbLists = [...new Set(ewbList.filter(obj => obj.ewb_no).map(obj => obj.ewb_no))].map(Number);
      await fetchData(ewbLists);
    }
    setShowForm((prev) => !prev);
  };

  // Save Form - POST for new, PUT for existing docket
  const handleFormSave = async () => {
    try {
      const docketNo = form.docket_no.trim();
      if (!docketNo) {
        showError("Docket number is required");
        return;
      }

      // Build payload - exclude tot_amt as it's computed
      const payload = { ...form };
      delete payload.tot_amt;

      let result;
      if (isFormEditMode) {
        // Update existing docket (PUT)
        result = await updateDocket(docketNo, payload);
        showSuccess("Docket updated successfully");
      } else {
        // Create new docket (POST)
        result = await createDocket(payload);
        showSuccess("Docket created successfully");
      }

      console.log("Save result:", result);
    } catch (err) {
      showError(err.message || "Failed to save docket");
      console.error("Save docket error:", err);
    }
  };

  const handleEditView = async () => {
    const docketNo = docketNumberInput.trim();

    setIsFormEditMode(Boolean(docketNo));
    setShowForm(true);

    if (docketNo) {
      setDocketId(docketNo);
      try {
        const docketData = await fetchDocketByDocketNo(docketNo);
        if (docketData) {
          // Map the response fields to the form state
          const mapped = {};
          Object.keys(form).forEach((key) => {
            mapped[key] = docketData[key] !== undefined ? docketData[key] : form[key];
          });
          setForm(mapped);
          showInfo("Docket data loaded successfully");
        }
      } catch (err) {
        showError(err.message || "Failed to fetch docket");
        console.error("Fetch docket error:", err);
        // Even if fetch fails, keep the docket number in the form
        setForm((prev) => ({ ...prev, docket_no: docketNo }));
      }
    }
  };

  const handleChargesChange = (charges) => {
    setChargeList(charges);
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
              <EwayBillSection
                key="ewayBill"
                ewbList={ewbList}
                onAdd={addEwbRow}
                onDelete={deleteEwb}
                onCellChange={(rowIndex, key, value) =>
                  updateRow(setEwbList, ewbList, rowIndex, key, value)
                }
                buttonStyle={sectionButtonStyle}
                sectionHeaderStyle={sectionHeaderStyle}
                sectionActionsStyle={sectionActionsStyle}
              />
            );
          }

          if (section === "charges" && showCharges) {
            return (
              <ChargesSection
                key="charges"
                docketId={docketId}
                invoiceValue={form.invoice_value}
                onChargesChange={handleChargesChange}
                buttonStyle={sectionButtonStyle}
                sectionHeaderStyle={sectionHeaderStyle}
                sectionActionsStyle={sectionActionsStyle}
              />
            );
          }

          return null;
        })}

        {/* ✅ Header Form */}
        {showForm && (
          <>
            <div
              style={{
                ...sectionHeaderStyle,
                flexWrap: "wrap",
                marginTop: 16,
              }}
              className="docketFormHeader"
            >
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
                  onClick={handleFormSave}
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