import { useState, useMemo } from "react";
import { ToggleSwitch } from "../../components/common/MasterPage";
import { IconButton, Tooltip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import MainLayout from "../../layouts/MainLayout";
import moment from "moment";
import {
  FormField,
  PageBody,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  fetchDocketByDocketNo,
  createDocket,
  updateDocketByRecId,
} from "../../utils/docket";
import ChargesSection from "./docket/ChargesSection";
import EwayBillSection from "./docket/EwayBillSection";

const headerFields = [
  { label: "Cnor Name", name: "cnor_name" },
  { label: "Cnor Address", name: "cnor_address" },
  { label: "Cnor Pincode", name: "cnor_pincode" },
  { label: "Cnor GSTIN", name: "cnor_gstin" },

  { label: "Cnsee Name", name: "cnee_name" },
  { label: "Cnsee Address", name: "cnee_address" },
  { label: "Cnsee Pincode", name: "cnee_pincode" },
  { label: "Cnsee GSTIN", name: "cnee_gstin" },

  { label: "Docket No", name: "docket_no" },
  { label: "Docket Date", name: "docket_date", type: "date" },
  { label: "From Location", name: "docket_loc" },
  { label: "To Location", name: "docket_to_loc" },
  // { label: "Consignor", name: "cnor" },
  // { label: "Consignee", name: "cnee" },
  { label: "Actual Wt", name: "act_wt", type: "number" },
  { label: "Charge Wt", name: "chrg_wt", type: "number" } ,

  { label: "No of CB", name: "no_cb", type: "number" },
  { label: "NOS W. Crate", name: "no_w_crate", type: "number" },
  { label: "No of W. CBox", name: "no_w_cbox", type: "number" },
  { label: "No of Loose", name: "no_loose", type: "number" },
  { label: "No of Others", name: "no_others", type: "number" },
  { label: "Total Pkgs", name: "tot_pkgs", type: "number" },

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
  { label: "Goods Description", name: "goods_desc", fullWidth: true },
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
    title: "Consignor Details",
    icon: "🏢",
    fields: ["cnor_name", "cnor_address", "cnor_pincode", "cnor_gstin"],
    half: true,
    columns: 2,
  },
  {
    title: "Consignee Details",
    icon: "🏬",
    fields: ["cnee_name", "cnee_address", "cnee_pincode", "cnee_gstin"],
    half: true,
    columns: 2,
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
    half: true,
    columns: 4,
  },
  {
    title: "PO & Invoice",
    icon: "📄",
    fields: ["po_no", "po_date", "invoice_no", "invoice_date", "invoice_value"],
    half: true,
    columns: 4,
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
    half: true,
    columns: 2,
  },
  {
    title: "Goods Details",
    icon: "🏷️",
    fields: ["goods_grp", "goods_subgrp", "goods_desc"],
    half: true,
    columns: 2,
  },
  {
    title: "Rate & Charges",
    icon: "💰",
    fields: ["rate", "rate_uom"],
    half: true,
  },
  {
    title: "Remarks",
    icon: "💬",
    fields: ["remark"],
    half: true,
  },
];

const emptyForm = {
  docket_no: "",
  docket_date: "",
  docket_loc: "",
  docket_to_loc: "",
  cnor_name: "",
  cnor_address: "",
  cnor_pincode: "",
  cnor_gstin: "",
  cnee_name: "",
  cnee_address: "",
  cnee_pincode: "",
  cnee_gstin: "",
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
};

export default function DocketPage() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();

  const [form, setForm] = useState(emptyForm);

  const tot_amt = useMemo(
    () =>
      (parseFloat(form.no_cb) || 0) +
      (parseFloat(form.no_w_crate) || 0) +
      (parseFloat(form.no_w_cbox) || 0) +
      (parseFloat(form.no_loose) || 0) +
      (parseFloat(form.no_others) || 0),
    [form.no_cb, form.no_w_crate, form.no_w_cbox, form.no_loose, form.no_others]
  );


  const [withEWB, setWithEWB] = useState(false);
  const [prePrinted, setPrePrinted] = useState(false);
  const [ewbList, setEwbList] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [showCharges, setShowCharges] = useState(true);
  const [sectionOrder, setSectionOrder] = useState(["ewayBill", "charges"]);
  const [isDocketNoEnabled, setIsDocketNoEnabled] = useState(false);
  const [docketNumberInput, setDocketNumberInput] = useState("");
  const [isFormEditMode, setIsFormEditMode] = useState(false);
  const [docketExists, setDocketExists] = useState(false);
  const [docketRecId, setDocketRecId] = useState(null);
  const [ewbNoDisplay, setEwbNoDisplay] = useState("");
  const { isLoading, showLoading, hideLoading, withLoading } = useLoading();
  const [dirtyFields, setDirtyFields] = useState(new Set());

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

  // ✅ Edit handlers
  const updateRow = (listSetter, list, index, field, value) => {
    const updated = [...list];
    updated[index][field] = value;
    listSetter(updated);
  };


  const showFormOnClick = async () => {
    setShowForm((prev) => !prev);
    // if (!showForm) {
    //   console.log(ewbList);
    //   const ewbLists = [...new Set(ewbList.filter(obj => obj.ewb_no).map(obj => obj.ewb_no))].map(Number);
    //   await fetchData(ewbLists);
    // }
    // setShowForm((prev) => {
    //   if (prev) {
    //     setDocketNumberInput("");
    //     setDocketId(null);
    //   }
    //   return !prev;
    // });
  };

  // Save Form - POST for new, PUT for existing docket
  const handleFormSave = () => withLoading(async () => {
    try {
      // Map form field names → DB column names
      const formToDb = {
        docket_no:      "docket_no",
        docket_to_loc:    "docket_to_loc",
        docket_loc:    "docket_loc",
        act_wt:           "docket_act_wt",
        chrg_wt:          "docket_chrg_wt",
        no_cb:            "docket_crtns",
        no_w_crate:       "docket_bndls",
        no_w_cbox:        "docket_bags",
        no_loose:         "docket_loose",
        no_others:        "docket_other",
        rate:             "docket_rate",
        rate_uom:         "docket_rate_uom",
        po_no:            "docket_po_no",
        po_date:          "docket_po_date",
        invoice_value:    "docket_inv_value",
        risk:             "docket_risk",
        insurance_company:   "docket_insurance_co",
        insurance_policy_no: "docket_insurance_no",
        valid_upto:          "docket_insurance_date",
        sum_insured:         "docket_insurance_amt",
        goods_grp:        "docket_goods_grp",
        goods_subgrp:     "docket_goods_subgrp",
        goods_desc:       "docket_goods_desc",
        remark:           "docket_remark",
        tot_pkgs:         "docket_tot_pkgs", //docket_tot_pkgs
        docket_date:     "docket_date",
      };

      const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
      const aud_user = currentUser?.rec_id ?? null;

      const payload = { aud_user };
      dirtyFields.forEach((formKey) => {
        if (formToDb[formKey]) {
          payload[formToDb[formKey]] = form[formKey];
        }
      });
      // tot_pkgs is derived — include if any "no_*" field is dirty
      // const noFields = ["no_cb", "no_w_crate", "no_w_cbox", "no_loose", "no_others"];
      // if (noFields.some((f) => dirtyFields.has(f))) {
      //   payload.docket_tot_pkgs = tot_amt;
      // }

      let result;
      if (docketExists && docketRecId != null) {
        if (Object.keys(payload).length <= 1) {
          showInfo("No changes to save");
          return;
        }
        result = await updateDocketByRecId(docketRecId, payload);
        setDirtyFields(new Set());
        if (payload.docket_no) setDocketNumberInput(payload.docket_no);
        showSuccess("Docket updated successfully");
      } else {
        // Create new docket (POST) — backend strips rec_id: -1
        result = await createDocket(payload);
        setDocketExists(true);
        showSuccess("Docket created successfully");
      }

      console.log("Save result:", result);
    } catch (err) {
      showError(err.message || "Failed to save docket");
      console.error("Save docket error:", err);
    }
  });

  const handleEditView = async () => {
    const docketNo = docketNumberInput.trim();

    // setIsFormEditMode(Boolean(docketNo));
    setIsFormEditMode(true);
    setShowForm(true);

    if (docketNo) {
      try {
        const docketData = await fetchDocketByDocketNo(docketNo);
        if (docketData) {
          const toDate = (val) => {
            if (!val) return "";
            const m = moment(val);
            return m.isValid() ? m.format("YYYY-MM-DD") : "";
          };
          const mapped = {
            docket_no:           docketData.docket_no           || "",
            docket_date:         toDate(docketData.docket_date),
            docket_loc:          docketData.docket_loc          || "",
            docket_to_loc:       docketData.docket_to_loc       || "",
            cnor_name:           docketData.cnor_name           || "",
            cnor_address:        docketData.cnor_address        || "",
            cnor_pincode:        docketData.cnor_pincode        || "",
            cnor_gstin:          docketData.cnor_gstin          || "",
            cnee_name:           docketData.cnee_name           || "",
            cnee_address:        docketData.cnee_address        || "",
            cnee_pincode:        docketData.cnee_pincode        || "",
            cnee_gstin:          docketData.cnee_gstin          || "",
            act_wt:              docketData.docket_act_wt       ?? "",
            chrg_wt:             docketData.docket_chrg_wt      ?? "",
            no_cb:               docketData.docket_crtns        ?? 0,
            no_w_crate:          docketData.docket_bndls        ?? 0,
            no_w_cbox:           docketData.docket_bags         ?? 0,
            no_loose:            docketData.docket_loose        ?? 0,
            no_others:           docketData.docket_other        ?? 0,
            tot_pkgs:            docketData.docket_tot_pkgs     ?? 0,
            rate:                docketData.docket_rate         ?? "",
            rate_uom:            docketData.docket_rate_uom     || "",
            tot_amt:             docketData.docket_tot_amt      ?? "",
            po_no:               docketData.docket_po_no        || "",
            po_date:             toDate(docketData.docket_po_date),
            invoice_no:          docketData.docket_inv_no       || "",
            invoice_date:        toDate(docketData.docket_inv_date),
            invoice_value:       docketData.docket_inv_value    ?? "",
            risk:                docketData.docket_risk         || "",
            insurance_company:   docketData.docket_insurance_co || "",
            insurance_policy_no: docketData.docket_insurance_no || "",
            insurance_cert_no:   "",
            sum_insured:         docketData.docket_insurance_amt ?? "",
            valid_upto:          toDate(docketData.docket_insurance_date),
            goods_grp:           docketData.docket_goods_grp    || "",
            goods_subgrp:        docketData.docket_goods_subgrp || "",
            goods_desc:          docketData.docket_goods_desc   || "",
            remark:              docketData.docket_remark       || "",
          };
          setDirtyFields(new Set());
          setForm(mapped);
          setDocketExists(true);
          setDocketRecId(docketData.rec_id ?? null);
          setEwbNoDisplay(docketData.ewb_no || "");
          showInfo("Docket data loaded successfully");
        }
      } catch (err) {
        showError(err.message || "Failed to fetch docket");
        console.error("Fetch docket error:", err);
        setDocketExists(false);
        if (err.message && err.message.includes("not found")) {
          let empForm = { ...emptyForm, docket_no: docketNo };
          setForm(empForm);
        } else {
          setForm((prev) => ({ ...prev, docket_no: docketNo }));
        }
      }
    } else {
      setDocketExists(false);
      setDocketRecId(null);
      setDirtyFields(new Set());
      setForm(emptyForm);
      setEwbNoDisplay("");
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
      padding: "14px 16px",
      display: "grid",
      gap: 12,
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    },
    fullWidthField: {
      gridColumn: "1 / -1",
    },
  };

  // Render a single form section card
  const renderFormSection = (section) => {
    const sectionFieldConfigs = section.fields
      .map((name) => fieldMap[name])
      .filter(Boolean)
      .filter((f) => f.name !== "docket_no" || prePrinted);

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
      <div key={section.title} style={{ ...sectionCardStyles.sectionCard, gridColumn: section.half ? undefined : "1 / -1" }}>
        <div style={sectionCardStyles.sectionHeader}>
          <span style={sectionCardStyles.sectionIcon}>{section.icon}</span>
          <h4 style={sectionCardStyles.sectionTitle}>{section.title}</h4>
        </div>
        <div style={{
          ...sectionCardStyles.sectionFields,
          ...(section.columns && filteredFields.length > 1 ? {
            gridTemplateColumns: `repeat(auto-fill, minmax(max(${section.columns === 2 ? 150 : 100}px, calc(${(100 / section.columns).toFixed(0)}% - 10px)), 1fr))`,
            gap: 10,
          } : {}),
        }}>
          {filteredFields.map((field) => {
            const isTextarea = field.type === "textarea";
            return (
              <div
                key={field.name}
                style={isTextarea || field.fullWidth ? sectionCardStyles.fullWidthField : undefined}
              >
                <FormField
                  {...field}
                  form={form}
                  setForm={(updated) => {
                    setDirtyFields((prev) => new Set(prev).add(field.name));
                    setForm(updated);
                  }}
                  disabled={
                    !isFormEditMode ||
                    (["docket_no"].includes(field.name) && !isDocketNoEnabled)
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
        {/* Top toolbar — EWB toggle + action buttons all inline */}
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <ToggleSwitch
            checked={withEWB}
            onChange={() => setWithEWB((prev) => !prev)}
            labelOn="With EWB"
            labelOff="Without EWB"
          />

          <ToggleSwitch
            checked={showForm}
            onChange={showFormOnClick}
            labelOn="Hide Form"
            labelOff="Show Form"
          />

          <ToggleSwitch
            checked={showCharges}
            onChange={() => {
              if (!showCharges) moveSectionToTop("charges");
              setShowCharges((prev) => !prev);
            }}
            labelOn="Hide Charges"
            labelOff="Show Charges"
          />
        </div>
        {/* ✅ Detail Tables */}
        {withEWB && sectionOrder.map((section) => {
          if (section === "ewayBill") {
            return (
              <EwayBillSection
                key="ewayBill"
                ewbList={ewbList}
                onAdd={addEwbRow}
                onDelete={(ids) => setEwbList((prev) => prev.filter((_, idx) => !ids.includes(idx)))}

                onCellChange={(rowIndex, key, value) =>
                  updateRow(setEwbList, ewbList, rowIndex, key, value)
                }
                onEwbListUpdate={(rowIndex, populated) =>
                  setEwbList((prev) => {
                    const updated = [...prev];
                    updated[rowIndex] = { ...updated[rowIndex], ...populated };
                    return updated;
                  })
                }
                showError={showError}
                showWarning={showWarning}
                showSuccess={showSuccess}
                sectionHeaderStyle={sectionHeaderStyle}
                withEWB={withEWB}
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h3 style={{ margin: 0 }}>FORM</h3>
                <div className="formFieldGroup" style={{ width: 120 }}>
                  <input
                    type="text"
                    value={ewbNoDisplay}
                    placeholder="EWB No"
                    disabled
                    style={{ padding: "9px 14px", fontSize: 14 }}
                  />
                </div>
                <ToggleSwitch
                  checked={prePrinted}
                  onChange={() => setPrePrinted((prev) => !prev)}
                  labelOn="Pre Printed Stationary"
                  labelOff="Auto Num Stationary"
                />
              </div>
              <div style={sectionActionsStyle}>
                <div className="formFieldGroup" style={{ width: 75 }}>
                  <input
                    type="number"
                    value={tot_amt}
                    placeholder="Total Amount"
                    disabled={true}
                    style={{ padding: "9px 14px", fontSize: 14 }}
                  />
                </div>

                <div className="formFieldGroup" style={{ width: 150 }}>
                  <input
                    type="text"
                    value={docketNumberInput}
                    onChange={(e) => setDocketNumberInput(e.target.value)}
                    placeholder="Enter Docket Num"
                    style={{ padding: "9px 14px", fontSize: 14 }}
                  />
                </div>
                <Tooltip title="Edit / View">
                  <IconButton
                    onClick={handleEditView}
                    size="small"
                    sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                {prePrinted && (
                  <ToggleSwitch
                    checked={isDocketNoEnabled}
                    onChange={() => setIsDocketNoEnabled((prev) => !prev)}
                    labelOn="Docket No On"
                    labelOff="Docket No Off"
                  />
                )}
                <Tooltip title="Save">
                  <IconButton
                    onClick={handleFormSave}
                    size="small"
                    sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
            <div
              style={{
                background: "#f8f6ff",
                borderRadius: 14,
                border: "1px solid #e9e5f0",
                padding: "1px",
                boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 8,
              }}
            >
              {formSections.map((section) => renderFormSection(section))}
            </div>
          </>
        )}

        {showCharges && (
          <div style={{ marginTop: 16 }}>
          <ChargesSection
            key="charges"
            docketId={form.docket_no}
            invoiceValue={form.invoice_value}
            buttonStyle={sectionButtonStyle}
            sectionHeaderStyle={sectionHeaderStyle}
            sectionActionsStyle={sectionActionsStyle}
            singleClick
          />
          </div>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}