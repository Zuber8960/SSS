import { useState, useMemo, useEffect, useRef } from "react";
import { ToggleSwitch } from "../../components/common/MasterPage";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { EditIcon, SaveIcon, ResetIcon, SECTION_ICONS } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import moment from "moment";
import {
  MuiField,
  MuiSelectField,
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
  saveEwayBillToDB,
  updateEwayBillByRecId,
  findOrCreateBp,
} from "../../utils/docket";
import { fetchAllLocations, fetchLocationTowns } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { printDocket } from "../../components/common/DocketPrint";
import { printSticker } from "./docket/StickerPrint";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { fetchBpByBpName } from "../../utils/businessPartner";
import { fetchAllMaterialGroups, fetchAllMaterialSubGroups } from "../../utils/materialGroup";
import ChargesSection from "./docket/ChargesSection";
import EwayBillSection from "./docket/EwayBillSection";

const headerFields = [
  { label: "Cnor Name", name: "cnor_name" },
  { label: "Cnor Address", name: "cnor_address" },
  { label: "Cnor City", name: "cnor_city" },
  { label: "Cnor State", name: "cnor_state" },
  { label: "Cnor Pincode", name: "cnor_pincode" },
  { label: "Cnor GSTIN", name: "cnor_gstin" },

  { label: "Cnsee Name", name: "cnee_name" },
  { label: "Cnsee Address", name: "cnee_address" },
  { label: "Cnsee City", name: "cnee_city" },
  { label: "Cnsee State", name: "cnee_state" },
  { label: "Cnsee Pincode", name: "cnee_pincode" },
  { label: "Cnsee GSTIN", name: "cnee_gstin" },

  { label: "Docket No", name: "docket_no" },
  { label: "Docket Date", name: "docket_date", type: "date", required: true },
  { label: "From Location", name: "docket_loc", isLocation: true, required: true },
  { label: "From Town", name: "docket_from_town", required: true },
  { label: "To Location", name: "docket_to_loc", isLocation: true, required: true },
  { label: "To Town", name: "docket_to_town", required: true },

  {
    label: "Transit Type", name: "transit_type", required: true, options: [
      { label: "ROAD", value: "ROAD" },
      { label: "MULTIMODAL", value: "MULTIMODAL" },
    ]
  },
  {
    label: "Load Type", name: "load_type", required: true, options: [
      { label: "FTL", value: "FTL" },
      { label: "LTL", value: "LTL" },
      { label: "SUNDRY", value: "SUNDRY" },
    ]
  },
  {
    label: "Pay Type", name: "pay_type", required: true, options: [
      { label: "TBB", value: "TBB" },
      { label: "PAID", value: "PAID" },
      { label: "TO PAY", value: "TO PAY" },
    ]
  },
  { label: "Pay Location", name: "pay_loc", required: true },
  {
    label: "Delivery Type", name: "dly_type", required: true, options: [
      { label: "Door Delivery", value: "door delivery" },
      { label: "Godown Delivery", value: "godown delivery" },
    ]
  },
  {
    label: "CC Attached", name: "cc", required: true, options: [
      { label: "YES", value: "YES" },
      { label: "NO", value: "NO" },
    ]
  },

  { label: "Actual Wt", name: "act_wt", type: "number" },
  { label: "Charge Wt", name: "chrg_wt", type: "number" },

  { label: "No of CB", name: "no_cb", type: "number" },
  { label: "NOS W. Crate", name: "no_w_crate", type: "number" },
  { label: "No of W. CBox", name: "no_w_cbox", type: "number" },
  { label: "No of Loose", name: "no_loose", type: "number" },
  { label: "No of Others", name: "no_others", type: "number" },
  { label: "Total Pkgs", name: "tot_pkgs", type: "number", required: true },

  {
    label: "Dimension Unit", name: "dim_unit"
    // , compact: true
    , options: [
      { label: "Inches", value: "inches" },
      { label: "MM", value: "mm" },
      { label: "CM", value: "cm" },
    ]
  },
  { label: "Length",  name: "dim_length",  type: "number"
    // , compact: true
   },
  { label: "Breadth", name: "dim_breadth", type: "number"
    // , compact: true
   },
  { label: "Height",  name: "dim_height",  type: "number"
    // , compact: true
   },

  { label: "Rate", name: "rate", type: "number", required: true },
  {
    label: "Rate UOM",
    name: "rate_uom",
    required: true,
    options: [
      { label: "Fixed", value: "Fixed" },
      { label: "Per Trip", value: "Per Trip" },
      { label: "Per KG", value: "Per KG" },
      { label: "Per Unit", value: "Per Unit" },
      { label: "Per Tonne", value: "Per Tonne" },
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
    required: true,
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

  { label: "Goods Group",     name: "goods_grp",  required: true },
  { label: "Goods Sub Group", name: "goods_subgrp", required: true },
  { label: "Goods Description", name: "goods_desc", fullWidth: true, required: true },
  { label: "Remarks", name: "remark", type: "textarea" },
];

// Group fields into logical sections
const formSections = [
  {
    title: "Docket Information",
    icon: SECTION_ICONS.docketInfo,
    fields: ["docket_no", "docket_date", "docket_loc", "docket_from_town", "docket_to_loc", "docket_to_town",
      "transit_type", "load_type", "pay_type", "pay_loc", "dly_type", "cc"],
  },
  {
    title: "Consignor Details",
    icon: SECTION_ICONS.consignor,
    fields: ["cnor_name", "cnor_address", "cnor_city", "cnor_state", "cnor_pincode", "cnor_gstin"],
    half: true,
    columns: 2,
  },
  {
    title: "Consignee Details",
    icon: SECTION_ICONS.consignee,
    fields: ["cnee_name", "cnee_address", "cnee_city", "cnee_state", "cnee_pincode", "cnee_gstin"],
    half: true,
    columns: 2,
  },
  {
    title: "Package Details",
    icon: SECTION_ICONS.package,
    fields: [
      "act_wt",
      "chrg_wt",
      "no_cb",
      "no_w_crate",
      "no_w_cbox",
      "no_loose",
      "no_others",
      "tot_pkgs",
      "dim_unit",
      "dim_length",
      "dim_breadth",
      "dim_height",
    ],
    half: true,
    columns: 4,
  },
  {
    title: "PO & Invoice",
    icon: SECTION_ICONS.poInvoice,
    fields: ["po_no", "po_date", "invoice_no", "invoice_date", "invoice_value"],
    half: true,
    columns: 4,
  },
  {
    title: "Insurance Details",
    icon: SECTION_ICONS.insurance,
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
    icon: SECTION_ICONS.goods,
    fields: ["goods_grp", "goods_subgrp", "goods_desc"],
    half: true,
    columns: 2,
  },
  {
    title: "Rate & Charges",
    icon: SECTION_ICONS.rateCharges,
    fields: ["rate", "rate_uom"],
    half: true,
  },
  {
    title: "Remarks",
    icon: SECTION_ICONS.remarks,
    fields: ["remark"],
    half: true,
  },
];

const emptyForm = {
  docket_no: "",
  docket_date: "",
  docket_from_town: "",
  docket_loc: "",
  docket_to_town: "",
  docket_to_loc: "",
  cnor_id: null,
  cnor_name: "",
  cnor_address: "",
  cnor_city: "",
  cnor_state: "",
  cnor_pincode: "",
  cnor_gstin: "",
  cnee_id: null,
  cnee_name: "",
  cnee_address: "",
  cnee_city: "",
  cnee_state: "",
  cnee_pincode: "",
  cnee_gstin: "",
  transit_type: "",
  load_type: "",
  pay_type: "",
  pay_loc: "",
  dly_type: "",
  cc: "",
  act_wt: 30,
  chrg_wt: 30,
  no_cb: 0,
  no_w_crate: 0,
  no_w_cbox: 0,
  no_loose: 0,
  no_others: 0,
  tot_pkgs: 0,
  dim_unit: "",
  dim_length: "",
  dim_breadth: "",
  dim_height: "",
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
  const [locations, setLocations] = useState([]);
  const [townOptions, setTownOptions] = useState({ from: [], to: [], byLoc: {} });
  const [materialGroups, setMaterialGroups] = useState([]);
  const [allSubGroups, setAllSubGroups] = useState([]);
  const [company, setCompany] = useState(null);



  const [withEWB, setWithEWB] = useState(false);
  const [prePrinted, setPrePrinted] = useState(false);
  const [ewbList, setEwbList] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [showCharges, setShowCharges] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(["ewayBill", "charges"]);
  const [isDocketNoEnabled, setIsDocketNoEnabled] = useState(false);
  const [docketNumberInput, setDocketNumberInput] = useState("");
  const [isFormEditMode, setIsFormEditMode] = useState(false);
  const [docketExists, setDocketExists] = useState(false);
  const [docketRecId, setDocketRecId] = useState(null);
  const [ewbNoDisplay, setEwbNoDisplay] = useState("");
  const { isLoading, showLoading, hideLoading, withLoading } = useLoading();
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [bpSuggestions, setBpSuggestions] = useState({});
  const searchTimeoutRef = useRef(null);
  const prevLocRef = useRef({ docket_loc: "", docket_to_loc: "" });
  const ewbPopulatedRef = useRef({ cnor: false, cnee: false });
  const chargesRef = useRef(null);
  const [printAnchor, setPrintAnchor] = useState(null);

  const handlePrint = async (withFreight) => {
    if (!form.docket_no) {
      showError("Please load docket details before printing.");
      return;
    }
    const charges = withFreight ? (chargesRef.current?.getChargeList() ?? []) : [];
    await printDocket({
      form,
      charges,
      ewbList,
      ewbNoDisplay,
      company,
      locations,
      copies: ["Consignor Copy", "Consignee Copy", "Lorry Copy", "File Copy"],
    });
  };

  const handleStickerPrint = async () => {
    if (!form.docket_no) {
      showError("Please load docket details before printing.");
      return;
    }
    await printSticker({ form, company });
  };

  const handleWeightBlur = (field, value) => {
    let num = parseFloat(value);
    if (!Number.isFinite(num) || num < 30) num = 30;

    setForm((prev) => {
      const updated = { ...prev, [field]: num };
      // Ensure act_wt <= chrg_wt
      if (field === "act_wt" && updated.act_wt > updated.chrg_wt) {
        updated.chrg_wt = updated.act_wt;
        setDirtyFields((d) => new Set(d).add("chrg_wt"));
      }
      if (field === "chrg_wt" && updated.chrg_wt < updated.act_wt) {
        updated.chrg_wt = updated.act_wt;
      }
      return updated;
    });
    setDirtyFields((prev) => new Set(prev).add(field));
  };

  const fetchBpSuggestions = async (searchTerm, prefix) => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      setBpSuggestions((prev) => ({ ...prev, [prefix]: [] }));
      return;
    }
    const locCode = prefix === "cnee" ? form.docket_to_loc : form.docket_loc;
    try {
      const result = await fetchBpByBpName(searchTerm.trim(), locCode || null);
      if (result) {
        // If API returns single object, wrap in array; if array, use as-is
        const list = Array.isArray(result) ? result : [result];
        setBpSuggestions((prev) => ({ ...prev, [prefix]: list }));
      } else {
        setBpSuggestions((prev) => ({ ...prev, [prefix]: [] }));
      }
    } catch {
      setBpSuggestions((prev) => ({ ...prev, [prefix]: [] }));
    }
  };

  const handleBpNameChange = (value, prefix) => {
    setForm((prev) => ({ ...prev, [`${prefix}_name`]: value, [`${prefix}_id`]: null }));
    setDirtyFields((prev) => new Set(prev).add(`${prefix}_name`));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchBpSuggestions(value, prefix);
    }, 300);
  };

  const applyBpToForm = (bp, prefix) => {
    setForm((prev) => ({
      ...prev,
      [`${prefix}_id`]:      bp.record_id   ?? prev[`${prefix}_id`],
      [`${prefix}_name`]:    bp.bp_name     || prev[`${prefix}_name`],
      [`${prefix}_address`]: bp.bp_addres   || prev[`${prefix}_address`],
      [`${prefix}_city`]:    bp.bp_city     || prev[`${prefix}_city`],
      [`${prefix}_state`]:   bp.bp_state    || prev[`${prefix}_state`],
      [`${prefix}_pincode`]: bp.bp_pincode  || prev[`${prefix}_pincode`],
      [`${prefix}_gstin`]:   bp.bp_gstin    || prev[`${prefix}_gstin`],
    }));
    setDirtyFields((prev) => {
      const s = new Set(prev);
      [`${prefix}_id`, `${prefix}_name`, `${prefix}_address`, `${prefix}_city`, `${prefix}_state`, `${prefix}_pincode`, `${prefix}_gstin`].forEach((k) => s.add(k));
      return s;
    });
  };

  const selectBpSuggestion = (bp, prefix) => {
    applyBpToForm(bp, prefix);
    setBpSuggestions((prev) => ({ ...prev, [prefix]: [] }));
  };

  const handleBpNameBlur = (prefix) => {
    setTimeout(() => {
      setBpSuggestions((prev) => ({ ...prev, [prefix]: [] }));
    }, 200);
  };

  // Build location dropdown options
  const locationOptions = locations.map((loc) => ({
    label: `${loc.loc_code} - ${loc.loc_name}`,
    value: loc.loc_code,
  }));

  const townFieldOptions = useMemo(() => ({
    from: townOptions.from.map((town) => ({
      label: town.town_name || town.town_code || town.loc_code || town.name,
      value: town.town_name || town.town_code || town.loc_code || town.name,
    })),
    to: townOptions.to.map((town) => ({
      label: town.town_name || town.town_code || town.loc_code || town.name,
      value: town.town_name || town.town_code || town.loc_code || town.name,
    })),
  }), [townOptions]);

  useEffect(() => {
    const loadTowns = async () => {
      if (!form.docket_loc) {
        setTownOptions((prev) => ({ ...prev, from: [] }));
        return;
      }
      try {
        const towns = await fetchLocationTowns(form.docket_loc);
        const list = towns || [];
        setTownOptions((prev) => ({
          ...prev,
          from: list,
          byLoc: { ...prev.byLoc, [form.docket_loc]: list },
        }));
      } catch (err) {
        console.error('Failed to load from-town options:', err);
        setTownOptions((prev) => ({ ...prev, from: [] }));
      }
    };
    loadTowns();
  }, [form.docket_loc]);

  useEffect(() => {
    const loadTowns = async () => {
      if (!form.docket_to_loc) {
        setTownOptions((prev) => ({ ...prev, to: [] }));
        return;
      }
      try {
        const towns = await fetchLocationTowns(form.docket_to_loc);
        const list = towns || [];
        setTownOptions((prev) => ({
          ...prev,
          to: list,
          byLoc: { ...prev.byLoc, [form.docket_to_loc]: list },
        }));
      } catch (err) {
        console.error('Failed to load to-town options:', err);
        setTownOptions((prev) => ({ ...prev, to: [] }));
      }
    };
    loadTowns();
  }, [form.docket_to_loc]);

  // Pay Location dropdown - only shows From/To locations selected by user
  const payLocOptions = useMemo(() => {
    const opts = [];
    if (form.docket_loc) opts.push({ label: form.docket_loc, value: form.docket_loc });
    if (form.docket_to_loc && form.docket_to_loc !== form.docket_loc) opts.push({ label: form.docket_to_loc, value: form.docket_to_loc });
    return opts;
  }, [form.docket_loc, form.docket_to_loc]);

  // Load locations, material groups, and company on mount
  useEffect(() => {
    fetchAllLocations()
      .then((data) => setLocations(data))
      .catch((err) => console.error("Failed to load locations:", err));
    fetchAllMaterialGroups()
      .then((data) => setMaterialGroups(data))
      .catch((err) => console.error("Failed to load material groups:", err));
    fetchAllMaterialSubGroups()
      .then((data) => setAllSubGroups(data))
      .catch((err) => console.error("Failed to load sub groups:", err));
    fetchAllCompanies()
      .then((data) => { if (data?.length) setCompany(data[0]); })
      .catch((err) => console.error("Failed to load company:", err));
  }, []);

  // Pre-fetch towns for all locations so byLoc is populated before first EWB load
  useEffect(() => {
    if (!locations.length) return;
    const fetchAll = async () => {
      const entries = await Promise.all(
        locations.map(async (loc) => {
          try {
            const towns = (await fetchLocationTowns(loc.loc_code)) || [];
            return [loc.loc_code, towns];
          } catch {
            return [loc.loc_code, []];
          }
        })
      );
      setTownOptions((prev) => ({
        ...prev,
        byLoc: Object.fromEntries(entries),
      }));
    };
    fetchAll();
  }, [locations]);

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
  };

  // Save Form - POST for new, PUT for existing docket
  const handleFormSave = () => withLoading(async () => {
    try {
      if (prePrinted && !form.docket_no) {
        showError("Pre Printed Stationary is selected. Please enter a Docket Number before saving.");
        return;
      }
      if (!form.docket_date) { showError("Docket Date is required"); return; }
      if (!form.docket_loc)  { showError("From Location is required"); return; }
      if (!form.docket_to_loc) { showError("To Location is required"); return; }

      const packageTotalValue =
        (parseFloat(form.no_cb) || 0) +
        (parseFloat(form.no_w_crate) || 0) +
        (parseFloat(form.no_w_cbox) || 0) +
        (parseFloat(form.no_loose) || 0) +
        (parseFloat(form.no_others) || 0);

      const isNew = !(docketExists && docketRecId != null);
      if (isNew) {
        if (!form.docket_from_town && !form.docket_pickup_town) { showError("Pickup Town is required"); return; }
        if (!form.docket_to_town   && !form.docket_dly_town)    { showError("Delivery Town is required"); return; }
        if (!form.transit_type)    { showError("Transit Type is required"); return; }
        if (!form.load_type)       { showError("Load Type is required"); return; }
        if (!form.pay_type)        { showError("Pay Type is required"); return; }
        if (!form.pay_loc)         { showError("Pay Location is required"); return; }
        if (!form.dly_type)        { showError("Delivery Type is required"); return; }
        if (!form.cc)              { showError("CC Attached is required"); return; }
        if (!form.rate_uom)        { showError("Rate UOM is required"); return; }
        if (form.rate === undefined || form.rate === null || form.rate === "") { showError("Rate is required"); return; }
        if (!form.risk)            { showError("Risk is required"); return; }
        if (packageTotalValue <= 0) { showError("At least one package quantity (No of CB / Crate / CBox / Loose / Others) is required"); return; }
        if (!form.goods_grp)       { showError("Goods Group is required"); return; }
        if (!form.goods_subgrp)    { showError("Goods Sub-Group is required"); return; }
        if (!form.goods_desc)      { showError("Goods Description is required"); return; }
        const currentCharges = chargesRef.current?.getChargeList() ?? [];
        if (currentCharges.length === 0) { 
          showError("Charges Grid is blank, please fill Charges");
          return;
        }
      }

      // Map form field names → DB column names
      const formToDb = {
        docket_no:           "docket_no",
        docket_to_loc:       "docket_to_loc",
        docket_loc:          "docket_loc",
        docket_from_town:    "docket_pickup_town",
        docket_to_town:      "docket_dly_town",
        transit_type:        "docket_transit_type",
        load_type:           "docket_load_type",
        pay_type:            "docket_pay_type",
        pay_loc:             "docket_pay_loc",
        dly_type:            "docket_dly_type",
        cc:                  "docket_cc",
        cnor_id:             "cnor_id",
        cnee_id:             "cnee_id",
        act_wt:              "docket_act_wt",
        chrg_wt:             "docket_chrg_wt",
        no_cb:               "docket_crtns",
        no_w_crate:          "docket_bndls",
        no_w_cbox:           "docket_bags",
        no_loose:            "docket_loose",
        no_others:           "docket_other",
        rate:                "docket_rate",
        rate_uom:            "docket_rate_uom",
        po_no:               "docket_po_no",
        po_date:             "docket_po_date",
        invoice_no:          "docket_inv_no",
        invoice_date:        "docket_inv_date",
        invoice_value:       "docket_inv_value",
        risk:                "docket_risk",
        insurance_company:   "docket_insurance_co",
        insurance_policy_no: "docket_insurance_no",
        valid_upto:          "docket_insurance_date",
        sum_insured:         "docket_insurance_amt",
        goods_grp:           "docket_goods_grp",
        goods_subgrp:        "docket_goods_subgrp",
        goods_desc:          "docket_goods_desc",
        remark:              "docket_remark",
        tot_pkgs:            "docket_tot_pkgs",
        docket_date:         "docket_date",
        tot_amt:             "docket_tot_amt",
        dim_unit:            "dim_unit",
        dim_length:          "dim_length",
        dim_breadth:         "dim_breadth",
        dim_height:          "dim_height",
      };

      const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
      const aud_user = currentUser?.rec_id ?? null;

      // If cnor/cnee came from EWB API (no rec_id yet), try to find them in BP master; if not found, pass null
      let resolvedCnorId = form.cnor_id;
      let resolvedCneeId = form.cnee_id;
      if (form.cnor_name && !form.cnor_id || form.cnee_name && !form.cnee_id) {
        const bpResult = await findOrCreateBp({
          cnor: (!form.cnor_id && form.cnor_name) ? {
            bp_name:    form.cnor_name,
            bp_gstin:   form.cnor_gstin   || null,
            bp_addres:  form.cnor_address || null,
            bp_city:    form.cnor_city    || null,
            bp_pincode: form.cnor_pincode || null,
          } : null,
          cnee: (!form.cnee_id && form.cnee_name) ? {
            bp_name:    form.cnee_name,
            bp_gstin:   form.cnee_gstin   || null,
            bp_addres:  form.cnee_address || null,
            bp_city:    form.cnee_city    || null,
            bp_pincode: form.cnee_pincode || null,
          } : null,
        });
        if (bpResult.cnor?.record_id) {
          resolvedCnorId = bpResult.cnor.record_id;
          form.cnor_id = +resolvedCnorId;
          setForm((prev) => ({ ...prev, cnor_id: +resolvedCnorId }));
        }
        if (bpResult.cnee?.record_id) {
          resolvedCneeId = bpResult.cnee.record_id;
          form.cnee_id = +resolvedCneeId;
          setForm((prev) => ({ ...prev, cnee_id: +resolvedCneeId }));
        }
      }

      const payload = { aud_user, cnor_id: resolvedCnorId, cnee_id: resolvedCneeId };

      dirtyFields.forEach((formKey) => {
        if (formToDb[formKey]) {
          payload[formToDb[formKey]] = form[formKey];
        }
      });
      if (isNew) {
        if (payload.docket_act_wt  === undefined || payload.docket_act_wt  === "" || payload.docket_act_wt  === null) payload.docket_act_wt  = Math.max(parseFloat(form.act_wt) || 30, 30);
        if (payload.docket_chrg_wt === undefined || payload.docket_chrg_wt === "" || payload.docket_chrg_wt === null) payload.docket_chrg_wt = Math.max(parseFloat(form.chrg_wt) || 30, 30);
      } else {
        if (payload.docket_act_wt  === undefined || payload.docket_act_wt  === "" || payload.docket_act_wt  === null) delete payload.docket_act_wt;
        if (payload.docket_chrg_wt === undefined || payload.docket_chrg_wt === "" || payload.docket_chrg_wt === null) delete payload.docket_chrg_wt;
      }
      payload.docket_tot_pkgs = packageTotalValue;
      // Always include total charge amount so it stays in sync with the charges grid
      payload.docket_tot_amt = parseFloat(form.tot_amt) || 0;

      let result;
      let savedDocketNo;
      let isNewDocket = false;
      if (docketExists && docketRecId != null) {
        if (Object.keys(payload).length <= 1) {
          showInfo("No changes to save");
          return;
        }
        result = await updateDocketByRecId(docketRecId, payload);
        savedDocketNo = payload.docket_no || docketNumberInput;
        setDirtyFields(new Set());
        setIsFormEditMode(false);
        showSuccess(`Docket ${savedDocketNo} updated successfully`, "Success", 8000);
      } else {
        // When EWB grid populated the form and auto-num stationary is selected,
        // omit docket_no so the backend generates it
        if (withEWB && ewbList.length > 0 && !prePrinted) {
          delete payload.docket_no;
        }
        // Create new docket (POST) — backend strips rec_id: -1
        if (!payload.docket_inv_date) payload.docket_inv_date = null;
        result = await createDocket(payload);
        savedDocketNo = result?.docket_no;
        isNewDocket = true;
      }

      // Save charges after docket is persisted
      if (savedDocketNo && chargesRef.current) {
        await chargesRef.current.saveCharges(savedDocketNo);
      }

      // Save EWB list if withEWB is on and there are rows
      if (withEWB && ewbList.length > 0 && savedDocketNo) {
        const toDbDate = (val) => {
          if (!val) return null;
          const m = moment(val, ["YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"], true);
          return m.isValid() ? m.format("YYYY-MM-DD") : null;
        };
        const normalized = ewbList
          .filter((r) => r.ewb_no)
          .map((row) => ({
            ...row,
            docket_no: savedDocketNo,
            docket_date: toDbDate(form.docket_date) || null,
            docket_loc: form.docket_loc || null,
            ewb_date: toDbDate(row.ewb_date),
            ewb_valid: toDbDate(row.ewb_valid),
            inv_date: toDbDate(row.inv_date),
            cnor_name: row.cnor_name || form.cnor_name || null,
            cnor_address: row.cnor_address || form.cnor_address || null,
            cnor_gstin: row.cnor_gstin || form.cnor_gstin || null,
            cnor_pincode: row.cnor_pincode || form.cnor_pincode || null,
            cnor_city: row.cnor_city || form.cnor_city || null,
            cnee_name: row.cnee_name || form.cnee_name || null,
            cnee_address: row.cnee_address || form.cnee_address || null,
            cnee_gstin: row.cnee_gstin || form.cnee_gstin || null,
            cnee_pincode: row.cnee_pincode || form.cnee_pincode || null,
            cnee_city: row.cnee_city || form.cnee_city || null,
          }));
        const existing = normalized.filter((r) => r.rec_id);
        const newRows  = normalized.filter((r) => !r.rec_id);
        await Promise.all([
          ...existing.map((r) => updateEwayBillByRecId(r.rec_id, r)),
          ...(newRows.length ? [saveEwayBillToDB(newRows)] : []),
        ]);
        // Stamp docket_no back onto local state
        setEwbList((prev) => prev.map((r) => ({ ...r, docket_no: savedDocketNo })));
      }

      if (isNewDocket) {
        setForm((prev) => ({ ...prev, docket_no: savedDocketNo }));
        setDocketNumberInput(savedDocketNo || "");
        setDocketExists(true);
        setDocketRecId(result?.rec_id ?? result?.record_id ?? null);
        setDirtyFields(new Set());
        setIsFormEditMode(false);
        showSuccess(`Docket ${savedDocketNo} created successfully`, "Success", 8000);
      }

      console.log("Save result:", result);
    } catch (err) {
      showError(err.message || "Failed to save docket");
      console.error("Save docket error:", err);
    }
  });

  const toDate = (val) => {
    if (!val) return "";
    const m = moment(val);
    return m.isValid() ? m.format("YYYY-MM-DD") : "";
  };

  const handleEditView = async () => {
    const docketNo = docketNumberInput.trim();

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
            docket_from_town:    docketData.docket_pickup_town  || "",
            docket_to_loc:       docketData.docket_to_loc       || "",
            docket_to_town:      docketData.docket_dly_town     || "",
            // cnor/cnee: IDs come from docket, display fields come from BP join
            cnor_id:             docketData.cnor_id             ?? null,
            cnor_name:           docketData.cnor_name           || "",
            cnor_address:        docketData.cnor_address        || "",
            cnor_city:           docketData.cnor_city           || "",
            cnor_state:          docketData.cnor_state          || "",
            cnor_pincode:        docketData.cnor_pincode        || "",
            cnor_gstin:          docketData.cnor_gstin          || "",
            cnee_id:             docketData.cnee_id             ?? null,
            cnee_name:           docketData.cnee_name           || "",
            cnee_address:        docketData.cnee_address        || "",
            cnee_city:           docketData.cnee_city           || "",
            cnee_state:          docketData.cnee_state          || "",
            cnee_pincode:        docketData.cnee_pincode        || "",
            cnee_gstin:          docketData.cnee_gstin          || "",
            transit_type:        docketData.docket_transit_type || "",
            load_type:           docketData.docket_load_type    || "",
            pay_type:            docketData.docket_pay_type     || "",
            pay_loc:             docketData.docket_pay_loc      || "",
            dly_type:            docketData.docket_dly_type     || "",
            cc:                  docketData.docket_cc           || "",
            act_wt:              docketData.docket_act_wt       ?? "",
            chrg_wt:             docketData.docket_chrg_wt      ?? "",
            no_cb:               docketData.docket_crtns        ?? 0,
            no_w_crate:          docketData.docket_bndls        ?? 0,
            no_w_cbox:           docketData.docket_bags         ?? 0,
            no_loose:            docketData.docket_loose        ?? 0,
            no_others:           docketData.docket_other        ?? 0,
            tot_pkgs:            docketData.docket_tot_pkgs     ?? 0,
            dim_unit:            docketData.dim_unit            || "",
            dim_length:          docketData.dim_length          ?? "",
            dim_breadth:         docketData.dim_breadth         ?? "",
            dim_height:          docketData.dim_height          ?? "",
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
          // Update prevLocRef before setForm so the location-change effect
          // doesn't treat the loaded locations as a "change" and wipe cnor/cnee fields.
          prevLocRef.current = {
            docket_loc: mapped.docket_loc,
            docket_to_loc: mapped.docket_to_loc,
          };
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
      ewbPopulatedRef.current = { cnor: false, cnee: false };
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

    const isCnor = section.title === "Consignor Details";
    const isCnee = section.title === "Consignee Details";
    const prefix = isCnor ? "cnor" : "cnee";
    const isPackageDetails = section.title === "Package Details";

    const renderFieldInput = (field) => {
      const isTextarea = field.type === "textarea";
      let fieldProps = field.isLocation
        ? { ...field, options: locationOptions }
        : field;
      if (field.name === "pay_loc") {
        fieldProps = { ...fieldProps, options: payLocOptions };
      } else if (field.name === "docket_from_town") {
        fieldProps = { ...fieldProps, options: townFieldOptions.from };
      } else if (field.name === "docket_to_town") {
        fieldProps = { ...fieldProps, options: townFieldOptions.to };
      }
      if (field.name === "goods_grp") {
        fieldProps = { ...fieldProps, options: materialGroups.map(g => ({ label: g.material_group_desc, value: g.material_group_code })) };
      }
      if (field.name === "goods_subgrp") {
        const filtered = form.goods_grp
          ? allSubGroups.filter(s => s.material_group_code === form.goods_grp)
          : allSubGroups;
        fieldProps = { ...fieldProps, options: filtered.map(s => ({ label: s.subgroup_desc, value: s.sub_group_code })) };
      }
      const subGroupLookup = allSubGroups;
      const isNameField = (isCnor || isCnee) && field.name === `${prefix}_name`;

      if (isNameField) {
        const suggestions = bpSuggestions[prefix] || [];
        const isDisabled = !isFormEditMode;
        return (
          <div
            key={field.name}
            style={{ position: "relative", ...(field.fullWidth ? sectionCardStyles.fullWidthField : {}) }}
          >
            <MuiField
              label={field.label}
              name={`${prefix}_name`}
              value={form[`${prefix}_name`] || ""}
              onChange={(_, val) => handleBpNameChange(val, prefix)}
              onBlur={() => handleBpNameBlur(prefix)}
              disabled={isDisabled}
            />
            {suggestions.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: "#fff",
                  border: "1px solid #d0c5e0",
                  borderRadius: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  listStyle: "none",
                  margin: 0,
                  padding: "4px 0",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {suggestions.map((bp, idx) => (
                  <li
                    key={bp.rec_id || idx}
                    onClick={() => selectBpSuggestion(bp, prefix)}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "8px 2px",
                      cursor: "pointer",
                      background: idx % 2 === 0 ? "#faf9ff" : "#fff",
                      color: "#333",
                      fontSize: 12,
                      borderBottom: "1px solid #f0ecf9",
                    }}
                  >
                    {bp.bp_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      // cnor/cnee detail fields (address, city, state, pincode, gstin) are always read-only
      const isCnorCneeDetail =
        (isCnor || isCnee) &&
        [`${prefix}_address`, `${prefix}_city`, `${prefix}_state`, `${prefix}_pincode`, `${prefix}_gstin`].includes(field.name);

      const isDisabled =
        field.name === "tot_pkgs" ||
        isCnorCneeDetail ||
        !isFormEditMode ||
        (field.name === "docket_no" && !(prePrinted && isFormEditMode));

      const handleChange = (name, value) => {
        let updated = { ...form, [name]: value };
        setDirtyFields((prev) => new Set(prev).add(name));
        // Auto-populate goods_desc when goods_subgrp is selected
        if (name === "goods_subgrp") {
          const match = subGroupLookup.find(s => s.sub_group_code === value);
          if (match) {
            updated = { ...updated, goods_desc: match.subgroup_desc };
            setDirtyFields((prev) => new Set(prev).add("goods_desc"));
          }
        }
        // Keep tot_pkgs in sync whenever a package count field changes
        const pkgFields = ["no_cb", "no_w_crate", "no_w_cbox", "no_loose", "no_others"];
        if (pkgFields.includes(name)) {
          const newTotal =
            (parseFloat(updated.no_cb) || 0) +
            (parseFloat(updated.no_w_crate) || 0) +
            (parseFloat(updated.no_w_cbox) || 0) +
            (parseFloat(updated.no_loose) || 0) +
            (parseFloat(updated.no_others) || 0);
          updated = { ...updated, tot_pkgs: newTotal };
        }
        // Auto-set pay_loc when pay_type or locations change
        if (["pay_type", "docket_loc", "docket_to_loc"].includes(name)) {
          const payType = updated.pay_type;
          const fromLoc = updated.docket_loc;
          const toLoc = updated.docket_to_loc;
          if (payType === "PAID" && fromLoc) {
            updated = { ...updated, pay_loc: fromLoc };
            setDirtyFields((prev) => new Set(prev).add("pay_loc"));
          } else if (payType === "TO PAY" && toLoc) {
            updated = { ...updated, pay_loc: toLoc };
            setDirtyFields((prev) => new Set(prev).add("pay_loc"));
          }
        }
        // Clear cnor when from-location changes (unless EWB-populated)
        if (name === "docket_loc" && !ewbPopulatedRef.current.cnor) {
          updated = { ...updated, cnor_id: null, cnor_name: "", cnor_address: "", cnor_city: "", cnor_state: "", cnor_pincode: "", cnor_gstin: "" };
          setDirtyFields((prev) => {
            const s = new Set(prev);
            ["cnor_id","cnor_name","cnor_address","cnor_city","cnor_state","cnor_pincode","cnor_gstin"].forEach(k => s.add(k));
            return s;
          });
        }
        // Clear cnee when to-location changes (unless EWB-populated)
        if (name === "docket_to_loc" && !ewbPopulatedRef.current.cnee) {
          updated = { ...updated, cnee_id: null, cnee_name: "", cnee_address: "", cnee_city: "", cnee_state: "", cnee_pincode: "", cnee_gstin: "" };
          setDirtyFields((prev) => {
            const s = new Set(prev);
            ["cnee_id","cnee_name","cnee_address","cnee_city","cnee_state","cnee_pincode","cnee_gstin"].forEach(k => s.add(k));
            return s;
          });
        }
        setForm(updated);
      };

      return (
        <div
          key={field.name}
          style={isTextarea || field.fullWidth ? sectionCardStyles.fullWidthField : undefined}
        >
          {fieldProps.options ? (
            <MuiSelectField
              label={fieldProps.label}
              name={fieldProps.name}
              value={form[fieldProps.name]}
              onChange={handleChange}
              options={fieldProps.options}
              disabled={isDisabled}
              required={fieldProps.required}
            />
          ) : (
            <MuiField
              label={fieldProps.label}
              name={fieldProps.name}
              value={form[fieldProps.name]}
              onChange={handleChange}
              type={isTextarea ? "text" : (fieldProps.type || "text")}
              disabled={isDisabled}
              required={fieldProps.required}
              {...(["act_wt", "chrg_wt"].includes(field.name) ? {
                onBlur: () => handleWeightBlur(field.name, form[field.name]),
              } : {})}
            />
          )}
        </div>
      );
    };

    const packageTopFields = isPackageDetails
      ? filteredFields.filter((field) => ["act_wt", "chrg_wt"].includes(field.name))
      : [];
    const packageCompactFields = isPackageDetails
      ? filteredFields.filter((field) => field.compact)
      : [];
    const packageBottomFields = isPackageDetails
      ? filteredFields.filter((field) => !["act_wt", "chrg_wt"].includes(field.name) && !field.compact)
      : filteredFields;

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
          {isPackageDetails ? (
            <>
              <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {packageTopFields.map((field) => renderFieldInput(field))}
              </div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #ece7f4", margin: "4px 0 2px" }} />
              {packageBottomFields.map((field) => renderFieldInput(field))}
              {packageCompactFields.length > 0 && (
                <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                  {packageCompactFields.map((field) => renderFieldInput(field))}
                </div>
              )}
            </>
          ) : (
            filteredFields.map((field) => renderFieldInput(field))
          )}
        </div>
      </div>
    );
  };

  const onDocketPopulate = (docketData) => {
      const eq = (a, b) => (a ?? "").toString().trim().toLowerCase() === (b ?? "").toString().trim().toLowerCase();

      // 2nd+ EWB: validate cnor/cnee name and town match existing form values
      if (ewbList.length > 0) {
        const mismatches = [];
        if (form.cnor_name && !eq(docketData.cnor_name, form.cnor_name))
          mismatches.push(`Consignor Name: expected "${form.cnor_name}", got "${docketData.cnor_name}"`);
        if (form.docket_from_town && !eq(docketData.cnor_city, form.docket_from_town))
          mismatches.push(`Consignor Town: expected "${form.docket_from_town}", got "${docketData.cnor_city}"`);
        if (form.cnee_name && !eq(docketData.cnee_name, form.cnee_name))
          mismatches.push(`Consignee Name: expected "${form.cnee_name}", got "${docketData.cnee_name}"`);
        if (form.docket_to_town && !eq(docketData.cnee_city, form.docket_to_town))
          mismatches.push(`Consignee Town: expected "${form.docket_to_town}", got "${docketData.cnee_city}"`);

        if (mismatches.length > 0) {
          showError(mismatches.join("\n"), "Consignor / Consignee Mismatch");
          return false;
        }
      }

      setIsFormEditMode(true);
      setShowForm(true);
      if (docketData.ewb_no) setEwbNoDisplay(String(docketData.ewb_no));
      if (docketData.docket_no) setDocketNumberInput(docketData.docket_no);
      if (docketData.cnor_name) ewbPopulatedRef.current.cnor = true;
      if (docketData.cnee_name) ewbPopulatedRef.current.cnee = true;

      // cnor_city = docket_from_town, cnee_city = docket_to_town
      // Find the location by searching byLoc: which locCode has a town matching the city value
      // Returns { loc, townName } where townName is the exact cased value from byLoc
      const findLocByTown = (townName) => {
        if (!townName) return null;
        const normalized = townName.toLowerCase();
        for (const [locCode, towns] of Object.entries(townOptions.byLoc)) {
          const hit = towns.find(t =>
            (t.town_name || t.town_code || t.name || "").toLowerCase() === normalized
          );
          if (hit) {
            const loc = locations.find(l => l.loc_code === locCode) || null;
            const exactTownName = t => t.town_name || t.town_code || t.name || townName;
            return loc ? { loc, townName: exactTownName(hit) } : null;
          }
        }
        return null;
      };
      const cnorMatch = findLocByTown(docketData.cnor_city);
      const cneMatch  = findLocByTown(docketData.cnee_city);
      const cnorLoc   = cnorMatch?.loc;
      const cneeLoc   = cneMatch?.loc;
      const cnorTown  = cnorMatch?.townName;
      const cneeTown  = cneMatch?.townName;

      // Pre-update prevLocRef so the location-change effect doesn't
      // treat these as manual changes and wipe cnor/cnee fields
      if (cnorLoc) prevLocRef.current = { ...prevLocRef.current, docket_loc: cnorLoc.loc_code };
      if (cneeLoc) prevLocRef.current = { ...prevLocRef.current, docket_to_loc: cneeLoc.loc_code };

      // Populate town dropdowns: read from byLoc cache if available, else fetch and cache
      const loadTownForLoc = async (locCode, side) => {
        if (!locCode) return;
        const cached = townOptions.byLoc[locCode];
        if (cached) {
          setTownOptions((prev) => ({ ...prev, [side]: cached }));
        } else {
          try {
            const list = (await fetchLocationTowns(locCode)) || [];
            setTownOptions((p) => ({
              ...p,
              [side]: list,
              byLoc: { ...p.byLoc, [locCode]: list },
            }));
          } catch {}
        }
      };
      if (cnorLoc) loadTownForLoc(cnorLoc.loc_code, "from");
      if (cneeLoc) loadTownForLoc(cneeLoc.loc_code, "to");

      setForm((prev) => {
        const updates = {};
        if (docketData.docket_no) {
          updates.docket_no = docketData.docket_no;
        }
        if (docketData.docket_date) {
          const m = moment(docketData.docket_date, ["YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DDTHH:mm:ssZ", "YYYY-MM-DD", "DD/MM/YYYY"], true);
          updates.docket_date = m.isValid() ? m.format("YYYY-MM-DD") : docketData.docket_date;
        }
        updates.cnor_id      = docketData.cnor_id      ?? prev.cnor_id;
        updates.cnor_name    = docketData.cnor_name    || "";
        updates.cnor_address = docketData.cnor_address || "";
        updates.cnor_gstin   = docketData.cnor_gstin   || "";
        updates.cnor_pincode = docketData.cnor_pincode || "";
        updates.cnor_city    = docketData.cnor_city    ? docketData.cnor_city.toUpperCase() : "";
        updates.cnor_state   = docketData.cnor_state   || "";
        if (cnorLoc) {
          updates.docket_loc       = cnorLoc.loc_code;
          updates.docket_from_town = cnorTown || docketData.cnor_city;
        }
        updates.cnee_id      = docketData.cnee_id      ?? prev.cnee_id;
        updates.cnee_name    = docketData.cnee_name    || "";
        updates.cnee_address = docketData.cnee_address || "";
        updates.cnee_gstin   = docketData.cnee_gstin   || "";
        updates.cnee_pincode = docketData.cnee_pincode || "";
        updates.cnee_city    = docketData.cnee_city    ? docketData.cnee_city.toUpperCase() : "";
        updates.cnee_state   = docketData.cnee_state   || "";
        if (cneeLoc) {
          updates.docket_to_loc  = cneeLoc.loc_code;
          updates.docket_to_town = cneeTown || docketData.cnee_city;
        }
        updates.invoice_no    = docketData.invoice_no    || "";
        updates.invoice_date  = docketData.invoice_date  ? toDate(docketData.invoice_date) : "";
        updates.invoice_value = docketData.invoice_value ?? "";
        return { ...prev, ...updates };
      });
      setDirtyFields((prev) => {
        const s = new Set(prev);
        ['docket_no','docket_date','docket_loc','docket_from_town','docket_to_loc','docket_to_town','cnor_id','cnor_name','cnor_address','cnor_gstin','cnor_pincode','cnor_city','cnor_state','cnee_id','cnee_name','cnee_address','cnee_gstin','cnee_pincode','cnee_city','cnee_state','invoice_no','invoice_date','invoice_value'].forEach(k => s.add(k));
        return s;
      });
    }

  return (
    <MainLayout>
      <PageBody title="Docket Entry">
        {/* Top toolbar — EWB toggle + action buttons all inline */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tooltip title="Print Consignment">
              <IconButton
                onClick={(e) => setPrintAnchor(e.currentTarget)}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={printAnchor}
              open={Boolean(printAnchor)}
              onClose={() => setPrintAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(true); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print with Freight</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(false); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print without Freight</ListItemText>
              </MenuItem>
            </Menu>
            <Tooltip title="Print Sticker">
              <IconButton
                onClick={handleStickerPrint}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <LocalOfferIcon />
              </IconButton>
            </Tooltip>
          </div>
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
                onShowForm={() => setShowForm(true)}
                onDocketPopulate={onDocketPopulate}
                onClearAll={() => {
                  setEwbList([]);
                  setForm(emptyForm);
                  setDocketNumberInput("");
                  setEwbNoDisplay("");
                  setIsFormEditMode(false);
                  setDirtyFields(new Set());
                  prevLocRef.current = { docket_loc: "", docket_to_loc: "" };
                  ewbPopulatedRef.current = { cnor: false, cnee: false };
                }}
                showError={showError}
                showWarning={showWarning}
                showInfo={showInfo}
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
                <MuiField
                  label="EWB No"
                  name="ewb_no"
                  value={ewbNoDisplay}
                  onChange={() => {}}
                  disabled
                  sx={{ width: 130 }}
                />
                <ToggleSwitch
                  checked={prePrinted}
                  onChange={() => setPrePrinted((prev) => !prev)}
                  labelOn="Pre Printed Stationary"
                  labelOff="Auto Num Stationary"
                />
              </div>
              <div style={sectionActionsStyle}>
                <MuiField
                  label="Docket No"
                  name="docket_no"
                  value={docketNumberInput}
                  onChange={(_, val) => setDocketNumberInput(val)}
                  sx={{ width: 160 }}
                />
                <Tooltip title="Edit / View">
                  <IconButton
                    onClick={handleEditView}
                    size="small"
                    sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                {/* Docket No On/Off toggle removed — docket_no is always enabled in edit mode when pre-printed */}
                <Tooltip title="Reset Form">
                  <IconButton
                    onClick={() => {
                      setForm(emptyForm);
                      setDocketNumberInput("");
                      setEwbNoDisplay("");
                      setIsFormEditMode(false);
                      setDirtyFields(new Set());
                      setDocketExists(false);
                      setDocketRecId(null);
                      prevLocRef.current = { docket_loc: "", docket_to_loc: "" };
                      ewbPopulatedRef.current = { cnor: false, cnee: false };
                    }}
                    size="small"
                    sx={{ color: "#b45309", "&:hover": { background: "#fef3c7" } }}
                  >
                    <ResetIcon />
                  </IconButton>
                </Tooltip>
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

        <div style={{ marginTop: 16 }}>
            <ChargesSection
              key="charges"
              ref={chargesRef}
              docketId={form.docket_no}
              invoiceValue={form.invoice_value}
              docketRate={form.rate}
              rateUom={form.rate_uom}
              chargeWeight={form.chrg_wt}
              totalPkgs={form.tot_pkgs}
              buttonStyle={sectionButtonStyle}
              sectionHeaderStyle={sectionHeaderStyle}
              sectionActionsStyle={sectionActionsStyle}
              singleClick
              onChargesChange={(charges) => {
                const total = charges.reduce((sum, c) => sum + (parseFloat(c.charge_amt) || 0), 0);
                const rounded = Math.round(total * 100) / 100;
                setForm((prev) => prev.tot_amt === rounded ? prev : { ...prev, tot_amt: rounded });
                setDirtyFields((prev) => new Set(prev).add("tot_amt"));
              }}
            />
          </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}