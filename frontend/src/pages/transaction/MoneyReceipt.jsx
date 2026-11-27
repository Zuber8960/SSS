import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Button, Chip, TextField,
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, FormField, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, PrintIcon, DeleteIcon, ClearIcon, EditIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { getSessionLocCode } from "../../utils/authService";
import { fetchChargeMaster, fetchChargesBulk, fetchDocketByDocketNo } from "../../utils/docket";
import { getDateFormat } from "../../utils/tenantService";
import { printMoneyReceipt } from "../../components/common/MoneyReceiptPrint";
import {
  fetchMrBanks,
  fetchOutstandingDockets,
  fetchMoneyReceiptByNumber,
  saveMoneyReceipt,
  deleteMoneyReceipt,
} from "../../utils/moneyReceipt";
import moment from "moment";

const today = () => moment().format("YYYY-MM-DD");

const locCodeOf = (v) => String(v || "").split(" - ")[0].trim();

const sessionBranchLabel = (locations = []) => {
  const loc = String(getSessionLocCode() || "").trim();
  if (!loc) return "";
  const row = (locations || []).find((l) => String(l.loc_code || "").trim().toUpperCase() === loc.toUpperCase());
  return row?.loc_name ? `${loc} - ${row.loc_name}` : loc;
};

const PAY_MODES = ["CASH", "CHEQUE", "NEFT/RTGS", "UPI"];

const MR_REASONS = [
  { value: "1", label: "PAID BOOKING" },
  { value: "2", label: "TO PAY DELIVERY" },
  { value: "3", label: "BILL COLLECTION" },
  { value: "4", label: "OTHERS" },
];

const mrReasonLabel = (v) => MR_REASONS.find((r) => r.value === String(v))?.label || "";

const CUST_COLS = "72px 120px minmax(180px, 1fr) 72px 150px";

const custCell = (extra = {}) => ({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  ...extra,
});

const customerOptionLabel = (option) => {
  if (option == null) return "";
  if (typeof option === "string") return option;
  return option.name || option.label || option.code || "";
};

const customerOptionKey = (option) => String(option?.value || option?.id || customerOptionLabel(option));

const sameCustomerOption = (a, b) => String(a?.value ?? a) === String(b?.value ?? b);

const filterCustomers = createFilterOptions({
  ignoreAccents: true,
  ignoreCase: true,
  trim: true,
  stringify: (option) => [option?.id, option?.code, option?.name, option?.loc, option?.town].filter(Boolean).join(" "),
});

const CustomerPaper = forwardRef(function CustomerPaper(props, ref) {
  const { children, ownerState, sx, style, ...other } = props;
  void ownerState;
  void sx;
  return (
    <div
      ref={ref}
      {...other}
      style={{
        ...style,
        marginTop: 4,
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: CUST_COLS,
        gap: 12,
        padding: "6px 10px",
        background: "#f1f5f9",
        color: "#475569",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.3,
        pointerEvents: "none",
      }}>
        <span>BP ID</span>
        <span>BP CODE</span>
        <span>CUSTOMER NAME</span>
        <span>LOC</span>
        <span>TOWN</span>
      </div>
      {children}
    </div>
  );
});

const fieldSx = {
  "& .MuiInputBase-root": { height: 30 },
  "& .MuiInputBase-input": { fontSize: 11, fontWeight: 700, padding: "4px 8px" },
  "& .MuiInputLabel-root": { fontSize: 11, fontWeight: 700 },
};

const MR_HEAD_CSS = `
.mr-receipt-head .MuiInputBase-root { height: 30px; }
.mr-receipt-head .MuiInputBase-input { font-size: 11px !important; font-weight: 700; padding: 4px 8px !important; }
.mr-receipt-head .MuiInputLabel-root { font-size: 11px !important; font-weight: 700; }
.mr-receipt-head .MuiSelect-select { font-size: 11px !important; min-height: 0 !important; padding-top: 4px !important; padding-bottom: 4px !important; }
.mr-receipt-head .MuiAutocomplete-input { padding: 2px 4px !important; }
.mr-docket-grid .MuiDataGrid-columnHeaderTitle {
  white-space: pre-line !important;
  line-height: 1.05 !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.mr-docket-grid .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-cell,
.mr-docket-grid .MuiDataGrid-cell span,
.mr-docket-grid .MuiDataGrid-cell input,
.mr-docket-grid .MuiInputBase-input {
  font-size: 10px !important;
  font-weight: 700 !important;
}
.mr-docket-grid .MuiDataGrid-cell {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  text-align: left !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.mr-docket-grid .MuiDataGrid-cell span,
.mr-docket-grid .MuiDataGrid-columnHeaderTitle {
  text-align: left !important;
}
.mr-docket-grid .MuiDataGrid-cell[data-field="bill_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="sgst_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="cgst_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="igst_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="tds_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="deduction_amt"],
.mr-docket-grid .MuiDataGrid-cell[data-field="net_received"] {
  justify-content: flex-end !important;
  text-align: right !important;
}
.mr-docket-grid .MuiDataGrid-cell[data-field="bill_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="sgst_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="cgst_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="igst_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="tds_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="deduction_amt"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="net_received"] span,
.mr-docket-grid .MuiDataGrid-cell[data-field="bill_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="sgst_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="cgst_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="igst_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="tds_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="deduction_amt"] input,
.mr-docket-grid .MuiDataGrid-cell[data-field="net_received"] input,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="bill_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="sgst_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="cgst_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="igst_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="tds_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="deduction_amt"] .MuiDataGrid-columnHeaderTitle,
.mr-docket-grid .MuiDataGrid-columnHeader[data-field="net_received"] .MuiDataGrid-columnHeaderTitle {
  text-align: right !important;
}
.mr-bill-grid .MuiDataGrid-cell,
.mr-bill-grid .MuiDataGrid-cell span {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
`;

const consignorKey = (row) => String(row?.cnor_id ?? "").trim();

const sameConsignor = (list) => {
  const keys = new Set((list || []).map(consignorKey));
  return keys.size <= 1;
};

const partyLabel = (code, name) => {
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();
  if (c && c !== "0" && n) return `${c} - ${n}`;
  return n || (c && c !== "0" ? c : "");
};

const fmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const blankForm = (locations = []) => ({
  mr_no: "AUTO",
  mr_date: today(),
  loc_code: sessionBranchLabel(locations),
  customer: "",
  pay_mode: "CASH",
  chq_utr_no: "",
  chq_utr_date: "",
  issuing_bank: "",
  receiver_bank: "",
  mr_reason: "",
  remarks: "",
  received_amt: "",
});

const docketText = (key, label, minWidth) => ({ key, label, minWidth, align: "left", headerAlign: "left" });
const docketAmt = (key, label, minWidth, extra = {}) => ({ key, label, minWidth, align: "right", headerAlign: "right", ...extra });

const docketColumns = [
  docketText("docket_no", "Docket\nNo", 118),
  docketText("docket_date", "Date", 92),
  docketText("loc_code", "From\nLoc", 76),
  docketText("docket_from_town", "From\nTown", 120),
  docketText("docket_to_loc", "To\nLoc", 70),
  docketText("docket_to_town", "To\nTown", 120),
  docketText("docket_pay_type", "Pay\nType", 76),
  docketText("party_name", "Party\nName", 280),
  docketAmt("bill_amt", "Freight", 82),
  docketAmt("sgst_amt", "SGST", 72),
  docketAmt("cgst_amt", "CGST", 72),
  docketAmt("igst_amt", "IGST", 72),
  docketAmt("tds_amt", "TDS", 72, { editable: true, type: "number" }),
  docketAmt("deduction_amt", "Other\nDed", 88, { editable: true, type: "number" }),
  docketAmt("net_received", "Net\nReceived", 100),
];

const CHARGE_CODE_COL = {
  DK01: "freight",
  DK02: "unloading",
  DK03: "green_tax",
  DK04: "detention",
  DK05: "door_collection",
  DK06: "loading",
  DK07: "add_toll",
  DK08: "door_delivery",
  DK09: "other_charges",
};

const MASTER_DESC_RULES = [
  { key: "door_collection", tests: ["DOOR PKP", "DOOR COLLECTION", "DOOR COLLECT", "DOOR PICKUP", "PICKUP CHARGE"] },
  { key: "door_delivery", tests: ["DOOR DLY", "DOOR DLV", "DOOR DELIVERY"] },
  { key: "green_tax", tests: ["FREIGHT ON VALUE", "FOV"] },
  { key: "unloading", tests: ["FUEL SURCHARGE", "FSC"] },
  { key: "detention", tests: ["FACTORY CHARGE", "FACTORY"] },
  { key: "loading", tests: ["HANDLING CHARGE", "HANDLING"] },
  { key: "add_toll", tests: ["ODA CHARGE", "ODA"] },
  { key: "other_charges", tests: ["STATIONERY", "STATIONARY"] },
  { key: "freight", tests: ["FREIGHT", "FRT"] },
];

const BILL_MONEY_KEYS = [
  "freight", "loading", "unloading", "detention", "add_toll", "green_tax",
  "other_charges", "door_collection", "door_delivery", "taxable", "cgst", "sgst", "igst", "amount",
];

const columnFromCharge = (charge, master) => {
  const code = String(charge?.charge_code || "").toUpperCase().trim();
  if (CHARGE_CODE_COL[code]) return CHARGE_CODE_COL[code];
  const known = (master || []).find((m) => String(m.charge_code || "").toUpperCase().trim() === code);
  const desc = String(known?.charge_desc || charge?.charge_name || charge?.charge_desc || "").toUpperCase();
  for (const rule of MASTER_DESC_RULES) {
    if (rule.tests.some((t) => desc.includes(t))) return rule.key;
  }
  return null;
};

const locTownLabel = (loc, town) => {
  const l = String(loc || "").trim();
  const t = String(town || "").trim();
  if (l && t) return `${l} > ${t}`;
  return l || t || "";
};

const billDateText = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format(getDateFormat()) : String(val);
};

const rateText = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const n = parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
};

const weightText = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(n) : String(value);
};

const billColumns = [
  { key: "docket_no", label: "Docket", minWidth: 148, align: "left", headerAlign: "left" },
  { key: "docket_date", label: "Date", minWidth: 96, align: "left", headerAlign: "left" },
  { key: "origin", label: "Origin", minWidth: 150, align: "left", headerAlign: "left" },
  { key: "destination", label: "Dest", minWidth: 150, align: "left", headerAlign: "left" },
  { key: "consignee", label: "Cnee.", minWidth: 200, align: "left" },
  { key: "rate", label: "Rate", minWidth: 72 },
  { key: "rate_uom", label: "Rate UOM", minWidth: 84 },
  { key: "actual_wt", label: "Act Wt", minWidth: 70 },
  { key: "charge_wt", label: "Chg Wt", minWidth: 70 },
  { key: "freight", label: "Frt.", minWidth: 90, align: "right" },
  { key: "loading", label: "Hand.", minWidth: 80, align: "right" },
  { key: "unloading", label: "Fuel Chrg", minWidth: 90, align: "right" },
  { key: "detention", label: "Fact. Chrg", minWidth: 90, align: "right" },
  { key: "add_toll", label: "ODA Chrg", minWidth: 80, align: "right" },
  { key: "green_tax", label: "FOV", minWidth: 70, align: "right" },
  { key: "other_charges", label: "Stnry.", minWidth: 80, align: "right" },
  { key: "door_collection", label: "Door Pkp", minWidth: 80, align: "right" },
  { key: "door_delivery", label: "Door Dly", minWidth: 80, align: "right" },
  { key: "taxable", label: "Taxable", minWidth: 90, align: "right" },
  { key: "cgst", label: "CGST", minWidth: 70, align: "right" },
  { key: "sgst", label: "SGST", minWidth: 70, align: "right" },
  { key: "igst", label: "IGST", minWidth: 70, align: "right" },
  { key: "amount", label: "Amt.", minWidth: 90, align: "right" },
];

const emptyCharges = () => ({
  freight: 0, loading: 0, unloading: 0, detention: 0, add_toll: 0,
  green_tax: 0, other_charges: 0, door_collection: 0, door_delivery: 0,
});

const toBillRow = (mr, docket, charges, master) => {
  const amounts = emptyCharges();
  (Array.isArray(charges) ? charges : []).forEach((c) => {
    const key = columnFromCharge(c, master);
    if (key && key in amounts) amounts[key] += num(c.charge_amt);
  });
  const hasCharges = (Array.isArray(charges) ? charges : []).length > 0;
  if (!hasCharges) amounts.freight = num(mr.bill_amt);
  const taxable = Math.round((
    amounts.freight + amounts.loading + amounts.unloading + amounts.detention
    + amounts.add_toll + amounts.green_tax + amounts.other_charges
    + amounts.door_collection + amounts.door_delivery
  ) * 100) / 100;
  const src = docket && typeof docket === "object" ? docket : {};
  const row = {
    id: mr.id,
    docket_no: mr.docket_no || src.docket_no || "",
    docket_date: billDateText(src.docket_date || mr.docket_date),
    origin: locTownLabel(src.docket_loc || mr.loc_code, src.docket_pickup_town || mr.docket_from_town),
    destination: locTownLabel(src.docket_to_loc || mr.docket_to_loc, src.docket_dly_town || mr.docket_to_town),
    consignee: src.cnee_name || "",
    rate: rateText(src.docket_rate),
    rate_uom: src.docket_rate_uom || "",
    actual_wt: weightText(src.docket_act_wt),
    charge_wt: weightText(src.docket_chrg_wt),
    taxable: taxable.toFixed(2),
  };
  Object.keys(amounts).forEach((key) => { row[key] = amounts[key].toFixed(2); });
  return row;
};

const billGst = (taxable, customer, branch) => {
  const base = num(taxable);
  const gst = Math.round(base * 0.18 * 100) / 100;
  const half = Math.round((gst / 2) * 100) / 100;
  const custKey = gstStateKey(customer?.bp_gstin, customer?.bp_state);
  const locKey = gstStateKey(branch?.loc_gstin || branch?.gstin_no, branch?.loc_state);
  const inter = Boolean(custKey && locKey && custKey !== locKey);
  const cgst = inter ? 0 : half;
  const sgst = inter ? 0 : Math.round((gst - cgst) * 100) / 100;
  const igst = inter ? gst : 0;
  return {
    taxable: fmt(base),
    cgst: fmt(cgst),
    sgst: fmt(sgst),
    igst: fmt(igst),
    amount: fmt(base + gst),
  };
};

const gstStateKey = (gstin, stateName) => {
  const g = String(gstin || "").replace(/\s/g, "").toUpperCase();
  if (/^[0-9]{2}/.test(g) && g.length >= 2) return g.slice(0, 2);
  return String(stateName || "").trim().toUpperCase();
};

const gstOnFreight = (freight, customer, branch) => {
  const amt = Math.round(num(freight) * 0.18 * 100) / 100;
  const half = Math.round((amt / 2) * 100) / 100;
  const custKey = gstStateKey(customer?.bp_gstin, customer?.bp_state);
  const locKey = gstStateKey(branch?.loc_gstin || branch?.gstin_no, branch?.loc_state);
  const interState = Boolean(custKey && locKey && custKey !== locKey);
  if (interState) return { sgst_amt: "0.00", cgst_amt: "0.00", igst_amt: fmt(amt) };
  return { sgst_amt: fmt(half), cgst_amt: fmt(half), igst_amt: "0.00" };
};

const applyNet = (row, tdsVal, dedVal) => {
  const freight = num(row.bill_amt);
  const gst = num(row.sgst_amt) + num(row.cgst_amt) + num(row.igst_amt);
  const gross = Math.round((freight + gst) * 100) / 100;
  let tds = Math.max(0, num(tdsVal));
  let ded = Math.max(0, num(dedVal));
  if (tds + ded > gross) {
    if (tds > gross) {
      tds = gross;
      ded = 0;
    } else {
      ded = Math.round((gross - tds) * 100) / 100;
    }
  }
  const net = Math.round((gross - tds - ded) * 100) / 100;
  return {
    ...row,
    sgst_amt: fmt(row.sgst_amt),
    cgst_amt: fmt(row.cgst_amt),
    igst_amt: fmt(row.igst_amt),
    tds_amt: fmt(tds),
    deduction_amt: fmt(ded),
    net_received: fmt(net),
    received_amt: fmt(net),
  };
};

export default function MoneyReceipt() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [banks, setBanks] = useState([]);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(() => blankForm());
  const [rows, setRows] = useState([]);
  const [billRows, setBillRows] = useState([]);
  const [billLoading, setBillLoading] = useState(false);
  const [chargeMaster, setChargeMaster] = useState([]);
  const [selectedIds, setSelectedIds] = useState({ type: "include", ids: new Set() });
  const [editing, setEditing] = useState(null);
  const [editNoMode, setEditNoMode] = useState(false);
  const billRowsRef = useRef([]);
  const chargeMasterRef = useRef([]);
  const skipCustomerReload = useRef(false);
  billRowsRef.current = billRows;
  chargeMasterRef.current = chargeMaster;

  useEffect(() => {
    fetchAllLocations().then((d) => {
      const list = Array.isArray(d) ? d : [];
      setLocations(list);
      setForm((prev) => ({ ...prev, loc_code: sessionBranchLabel(list) || prev.loc_code }));
    }).catch(() => {});
    fetchAllBusinessPartners().then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
    fetchMrBanks().then((d) => setBanks(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllCompanies().then((d) => { if (Array.isArray(d) && d.length) setCompany(d[0]); }).catch(() => {});
    fetchChargeMaster().then((d) => setChargeMaster(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const locCode = locCodeOf(form.loc_code) || getSessionLocCode();
  const loginLoc = useMemo(
    () => (locations || []).find((l) => String(l.loc_code || "").trim().toUpperCase() === String(locCode || "").toUpperCase()) || null,
    [locations, locCode]
  );
  const paidFull = form.mr_reason === "1";
  const showDocketGrid = form.mr_reason === "1" || form.mr_reason === "2";

  const toCustomerOption = (p) => {
    const name = String(p.bp_name || "").trim();
    const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
    const loc = String(p.loc_code || "").split(" - ")[0].trim();
    const town = String(p.bp_city || "").trim();
    const id = String(p.record_id ?? p.bp_id ?? "").trim();
    return {
      value: id,
      id,
      code,
      name,
      loc,
      town,
      label: name || code,
    };
  };

  const byCustomerName = (a, b) => {
    const name = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    if (name) return name;
    return String(a.code || "").localeCompare(String(b.code || ""), undefined, { sensitivity: "base" });
  };

  const customerOptions = useMemo(() => {
    const loc = String(locCode || "").toUpperCase();
    const opts = partners
      .filter((p) => {
        const type = String(p.bp_type ?? "").trim();
        const typeName = String(p.bp_type_name || "").trim().toLowerCase();
        if (type === "2" || typeName === "supplier") return false;
        const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return (!loc || !bpLoc || bpLoc === loc) && (p.bp_name || p.bp_grp_code || p.bp_code);
      })
      .map(toCustomerOption)
      .filter((o) => o.value)
      .sort(byCustomerName);
    const selected = partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(form.customer));
    if (selected) {
      const opt = toCustomerOption(selected);
      if (opt.value && !opts.some((o) => o.value === opt.value)) opts.unshift(opt);
    }
    if (String(form.customer || "").startsWith("party:") && !opts.some((o) => o.value === form.customer)) {
      const raw = String(form.customer).slice(6);
      const row = rows.find((r) => String(r.party_code || "") === raw || String(r.party_bp_name || "") === raw);
      const code = String(row?.party_code || raw).trim();
      const name = String(row?.party_bp_name || "").trim();
      opts.push({
        value: form.customer,
        id: "",
        code,
        name,
        loc: String(row?.loc_code || "").split(" - ")[0].trim(),
        town: "",
        label: name || code || partyLabel(code, name),
      });
    }
    return opts.sort(byCustomerName);
  }, [partners, locCode, form.customer, rows]);

  const selectedCustomer = useMemo(
    () => partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(form.customer)) || null,
    [partners, form.customer]
  );

  const partnerFromRow = (row) => {
    if (!row) return null;
    const id = String(row.party_id ?? "").trim();
    if (id && id !== "0") {
      const byId = partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === id);
      if (byId) return byId;
    }
    const code = String(row.party_code ?? "").trim();
    const rawName = String(row.party_bp_name || "").trim().toLowerCase();
    const byCode = partners.filter((p) => {
      const pCode = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
      return code && code !== "0" && pCode === code;
    });
    if (byCode.length === 1) return byCode[0];
    if (rawName) {
      const named = (byCode.length ? byCode : partners).find((p) => String(p.bp_name || "").trim().toLowerCase() === rawName);
      if (named) return named;
    }
    return byCode[0] || null;
  };

  const fillCustomerFromRows = (chosenIds, chosen) => {
    const row = chosen[0];
    if (!row) return null;
    const partner = partnerFromRow(row);
    const id = partner
      ? String(partner.record_id ?? partner.bp_id ?? "")
      : `party:${String(row.party_code || row.party_bp_name || "").trim()}`;
    if (id && id !== String(form.customer)) {
      skipCustomerReload.current = true;
      setForm((prev) => ({ ...prev, customer: id }));
    }
    if (partner) {
      setRows((prev) => prev.map((r) => {
        if (!chosenIds.has(r.id)) return applyNet(r, r.tds_amt, r.deduction_amt);
        return applyNet({ ...r, ...gstOnFreight(r.bill_amt, partner, loginLoc) }, r.tds_amt, r.deduction_amt);
      }));
    }
    return partner;
  };

  const loadOutstanding = async (customer = selectedCustomer, reason = form.mr_reason, mrDate = form.mr_date) => {
    if (!locCode || !mrDate || (reason !== "1" && reason !== "2")) {
      setRows([]);
      setSelectedIds({ type: "include", ids: new Set() });
      return;
    }
    try {
      showLoading();
      const data = await fetchOutstandingDockets({
        loc_code: locCode,
        bp_code: customer?.bp_grp_code || customer?.bp_code || "",
        bp_name: customer?.bp_name || "",
        bp_id: customer?.record_id ?? customer?.bp_id ?? "",
        mr_reason: reason,
        mr_date: mrDate,
      });
      setRows((Array.isArray(data) ? data : []).map((r) => applyNet({
        ...r,
        id: r.id || `${r.docket_no}_${r.docket_date}_${r.loc_code}`,
        party_id: r.party_id,
        party_bp_name: r.party_name,
        party_name: partyLabel(r.party_code, r.party_name),
        ...gstOnFreight(r.bill_amt, customer, loginLoc),
      }, r.tds_amt, r.deduction_amt)));
      setSelectedIds({ type: "include", ids: new Set() });
    } catch (e) {
      showError(e.message || "Failed to load outstanding dockets");
      setRows([]);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    if (skipCustomerReload.current) {
      skipCustomerReload.current = false;
      return;
    }
    if (editing) return;
    if (form.mr_reason !== "1" && form.mr_reason !== "2") {
      setRows([]);
      setSelectedIds({ type: "include", ids: new Set() });
      return;
    }
    loadOutstanding(selectedCustomer, form.mr_reason, form.mr_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, form.mr_reason, form.mr_date, locCode, selectedCustomer, editing]);

  useEffect(() => {
    const ids = selectedIds?.ids instanceof Set ? selectedIds.ids : new Set();
    if (form.mr_reason !== "1" && form.mr_reason !== "2") {
      setBillRows([]);
      setBillLoading(false);
      return undefined;
    }
    setBillRows((prev) => prev.filter((r) => ids.has(r.id)));
    const have = new Set(billRowsRef.current.filter((r) => ids.has(r.id)).map((r) => r.id));
    const missing = rows.filter((r) => ids.has(r.id) && !have.has(r.id));
    if (!missing.length) {
      setBillLoading(false);
      return undefined;
    }
    let cancel = false;
    setBillLoading(true);
    (async () => {
      try {
        const nos = missing.map((r) => r.docket_no);
        const [chargeRows, dockets] = await Promise.all([
          fetchChargesBulk(nos),
          Promise.all(missing.map((r) => fetchDocketByDocketNo(r.docket_no).catch(() => null))),
        ]);
        const byNo = {};
        (Array.isArray(chargeRows) ? chargeRows : []).forEach((c) => {
          const no = String(c.docket_no || "").trim();
          if (!byNo[no]) byNo[no] = [];
          byNo[no].push(c);
        });
        const built = missing.map((mr, i) => {
          const docket = Array.isArray(dockets[i]) ? dockets[i][0] : dockets[i];
          const no = String(mr.docket_no || "").trim();
          return toBillRow(mr, docket, byNo[no] || [], chargeMasterRef.current);
        });
        if (cancel) return;
        setBillRows((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const add = built.filter((r) => ids.has(r.id) && !seen.has(r.id));
          return [...prev.filter((r) => ids.has(r.id)), ...add];
        });
      } catch (e) {
        if (!cancel) showError(e.message || "Failed to load bill lines");
      } finally {
        if (!cancel) setBillLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, rows, form.mr_reason]);

  const selectedRows = useMemo(() => {
    const ids = selectedIds?.ids instanceof Set ? selectedIds.ids : new Set();
    return rows.filter((r) => ids.has(r.id));
  }, [rows, selectedIds]);

  const totals = useMemo(() => selectedRows.reduce((a, r) => {
    a.sgst += num(r.sgst_amt);
    a.cgst += num(r.cgst_amt);
    a.igst += num(r.igst_amt);
    a.tds += num(r.tds_amt);
    a.ded += num(r.deduction_amt);
    a.net += num(r.net_received);
    return a;
  }, { sgst: 0, cgst: 0, igst: 0, tds: 0, ded: 0, net: 0 }), [selectedRows]);

  const handleSetForm = (next) => {
    const prev = form;
    let updated = next;
    if (String(updated.pay_mode || "") === "CASH" && String(prev.pay_mode || "") !== "CASH") {
      updated = { ...updated, chq_utr_no: "", chq_utr_date: "", issuing_bank: "", receiver_bank: "" };
    }
    setForm(updated);
  };

  const onSelect = (sm) => {
    const nextIds = sm?.ids instanceof Set ? sm.ids : new Set([...(sm?.ids ?? sm ?? [])]);
    const chosen = rows.filter((r) => nextIds.has(r.id));
    if (!sameConsignor(chosen)) {
      showError("Dockets of different consignors cannot be selected together");
      return;
    }
    setSelectedIds({ type: "include", ids: nextIds });
    if (chosen.length) fillCustomerFromRows(nextIds, chosen);
    else setRows((prev) => prev.map((r) => applyNet(r, r.tds_amt, r.deduction_amt)));
  };

  const onCellChange = (id, field, value) => {
    const amt = fmt(value);
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const tds = field === "tds_amt" ? amt : r.tds_amt;
      const ded = field === "deduction_amt" ? amt : r.deduction_amt;
      return applyNet(r, tds, ded);
    }));
    if (["tds_amt", "deduction_amt"].includes(field)) {
      const already = selectedIds?.ids instanceof Set ? selectedIds.ids : new Set();
      const chosen = rows.filter((r) => already.has(r.id) || r.id === id);
      if (!sameConsignor(chosen)) {
        showError("Dockets of different consignors cannot be selected together");
        return;
      }
      const ids = new Set(already);
      ids.add(id);
      setSelectedIds({ type: "include", ids });
      fillCustomerFromRows(ids, chosen);
    }
  };

  const billView = useMemo(
    () => billRows.map((row) => ({ ...row, ...billGst(row.taxable, selectedCustomer, loginLoc) })),
    [billRows, selectedCustomer, loginLoc]
  );

  const billTotals = useMemo(() => billView.reduce((acc, row) => {
    BILL_MONEY_KEYS.forEach((key) => { acc[key] += num(row[key]); });
    return acc;
  }, Object.fromEntries(BILL_MONEY_KEYS.map((key) => [key, 0]))), [billView]);

  const handleClear = () => {
    setForm(blankForm(locations));
    setRows([]);
    setBillRows([]);
    setSelectedIds({ type: "include", ids: new Set() });
    setEditing(null);
    setEditNoMode(false);
  };

  const loadByNo = async () => {
    const no = String(form.mr_no || "").trim();
    if (!no || no.toUpperCase() === "AUTO") {
      showError("Enter a receipt number");
      return;
    }
    try {
      showLoading();
      const data = await fetchMoneyReceiptByNumber(no, locCode);
      if (!data) {
        showError("Receipt " + no + " not found for this branch");
        return;
      }
      const hdr = data.header ? data : data;
      const details = data.details || hdr.details || [];
      const partner = partners.find((p) => {
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        const id = String(p.record_id ?? p.bp_id ?? "").trim();
        const hdrCode = String(hdr.bp_code ?? "").trim();
        return (code && code === hdrCode)
          || (id && id === hdrCode)
          || String(p.bp_name || "").trim().toLowerCase() === String(hdr.bp_name || "").trim().toLowerCase();
      });
      setForm({
        mr_no: String(hdr.mr_no || "").trim(),
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : hdr.mr_date,
        loc_code: sessionBranchLabel(locations),
        customer: partner ? String(partner.record_id ?? partner.bp_id ?? "") : "",
        pay_mode: hdr.pay_mode || "CASH",
        chq_utr_no: hdr.chq_utr_no || "",
        chq_utr_date: hdr.chq_utr_date ? moment(hdr.chq_utr_date).format("YYYY-MM-DD") : "",
        issuing_bank: hdr.issuing_bank || "",
        receiver_bank: hdr.receiver_bank || "",
        mr_reason: hdr.mr_reason != null && hdr.mr_reason !== "" ? String(hdr.mr_reason) : "",
        remarks: hdr.remarks || "",
        received_amt: fmt(hdr.received_amt),
      });
      const mapped = details
        .filter((d) => d.docket_no || d.invoice_no)
        .map((d) => applyNet({
          id: `${d.docket_no || d.invoice_no}_${moment(d.docket_date || d.invoice_date).format("YYYY-MM-DD")}_${d.docket_loc || d.invoice_loc}`,
          docket_no: d.docket_no || "",
          docket_date: d.docket_date ? moment(d.docket_date).format("YYYY-MM-DD") : "",
          loc_code: d.docket_loc || d.invoice_loc,
          docket_from_town: d.docket_from_town || d.docket_pickup_town || "",
          docket_to_loc: d.docket_to_loc || "",
          docket_to_town: d.docket_to_town || d.docket_dly_town || "",
          docket_pay_type: d.docket_pay_type || "",
          cnor_id: d.cnor_id,
          party_id: d.party_id,
          party_code: d.party_code,
          party_bp_name: d.party_name,
          party_name: partyLabel(d.party_code, d.party_name) || partyLabel(hdr.bp_code, hdr.bp_name),
          bill_amt: fmt(d.bill_amt),
          sgst_amt: fmt(d.sgst_amt),
          cgst_amt: fmt(d.cgst_amt),
          igst_amt: fmt(d.igst_amt),
        }, d.tds_amt, d.deduction_amt));
      setRows(mapped);
      setSelectedIds({ type: "include", ids: new Set(mapped.map((r) => r.id)) });
      setEditing({
        mr_no: hdr.mr_no,
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : hdr.mr_date,
        loc_code: hdr.loc_code,
      });
      setEditNoMode(false);
      showSuccess("Receipt " + hdr.mr_no + " loaded");
    } catch (e) {
      showError(e.message || "Failed to load receipt");
    } finally {
      hideLoading();
    }
  };

  const handleEditClick = () => {
    if (!editNoMode) {
      setEditNoMode(true);
      setForm((prev) => ({ ...prev, mr_no: prev.mr_no === "AUTO" ? "" : String(prev.mr_no || "") }));
      return;
    }
    loadByNo();
  };

  const handleSave = async () => {
    if (!form.mr_date) {
      showError("Please select receipt date");
      return;
    }
    if (!["1", "2", "3", "4"].includes(String(form.mr_reason))) {
      showError("Please select MR Reason");
      return;
    }
    if (form.pay_mode !== "CASH" && !form.chq_utr_no) {
      showError("Enter cheque / UTR number");
      return;
    }
    const needsDetails = form.mr_reason === "1" || form.mr_reason === "2";
    const lines = selectedRows;
    const gridPartner = needsDetails ? partnerFromRow(lines[0]) : null;
    const customer = selectedCustomer || gridPartner;
    if (!needsDetails && !customer) {
      showError("Please select a customer");
      return;
    }
    if (needsDetails && !sameConsignor(lines)) {
      showError("Dockets of different consignors cannot be selected together");
      return;
    }
    if (needsDetails && !lines.length) {
      showError("Select at least one consignment");
      return;
    }
    const bpCode = customer?.bp_grp_code ?? customer?.bp_code ?? lines[0]?.party_code ?? 0;
    const bpName = customer?.bp_name || lines[0]?.party_bp_name || "";
    if (needsDetails && !String(bpName || "").trim() && !(bpCode && String(bpCode) !== "0")) {
      showError("Customer is missing on the selected docket");
      return;
    }
    const over = lines.find((r) => {
      const gross = num(r.bill_amt) + num(r.sgst_amt) + num(r.cgst_amt) + num(r.igst_amt);
      return num(r.tds_amt) + num(r.deduction_amt) - 0.009 > gross;
    });
    if (over) {
      showError(`TDS + Other Ded cannot exceed freight + GST for docket ${over.docket_no}`);
      return;
    }
    if (!needsDetails && num(form.received_amt) <= 0) {
      showError("Enter received amount");
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    try {
      showLoading();
      const result = await saveMoneyReceipt({
        header: {
          mr_no: editing?.mr_no || (form.mr_no && form.mr_no !== "AUTO" ? form.mr_no : null),
          mr_date: form.mr_date,
          loc_code: locCode,
          bp_code: bpCode,
          bp_name: bpName,
          pay_mode: form.pay_mode,
          chq_utr_no: form.chq_utr_no,
          chq_utr_date: form.chq_utr_date || null,
          issuing_bank: form.issuing_bank,
          receiver_bank: form.receiver_bank,
          mr_reason: Number(form.mr_reason),
          remarks: form.remarks,
          received_amt: needsDetails ? totals.net : form.received_amt,
          division_code: currentUser?.division_code ?? null,
        },
        details: needsDetails ? lines.map((r) => ({
          docket_no: r.docket_no,
          docket_date: r.docket_date,
          docket_loc: r.loc_code || locCode,
          bill_amt: r.bill_amt,
          sgst_amt: r.sgst_amt,
          cgst_amt: r.cgst_amt,
          igst_amt: r.igst_amt,
          received_amt: num(r.net_received),
          tds_amt: r.tds_amt,
          deduction_amt: r.deduction_amt,
        })) : [],
      });
      const hdr = result?.header || result;
      const billNo = result?.invoice?.invoice_no;
      showSuccess(billNo
        ? `Money receipt ${hdr.mr_no} saved. Bill ${billNo} created at GGRN and adjusted.`
        : `Money receipt ${hdr.mr_no} saved`);
      setForm((prev) => ({ ...prev, mr_no: String(hdr.mr_no || prev.mr_no).trim() }));
      setEditing({
        mr_no: hdr.mr_no,
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : form.mr_date,
        loc_code: hdr.loc_code || locCode,
      });
    } catch (e) {
      showError(e.message || "Failed to save receipt");
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async () => {
    if (!editing) {
      showError("Load a saved receipt before deleting");
      return;
    }
    try {
      showLoading();
      await deleteMoneyReceipt(editing.mr_no, editing.mr_date, editing.loc_code);
      showSuccess("Receipt deleted");
      handleClear();
    } catch (e) {
      showError(e.message || "Delete failed");
    } finally {
      hideLoading();
    }
  };

  const handlePrint = () => {
    if (!selectedCustomer && !form.mr_no) {
      showError("Nothing to print");
      return;
    }
    const paidOrToPay = form.mr_reason === "1" || form.mr_reason === "2";
    const lines = paidOrToPay
      ? (selectedRows.length ? selectedRows : rows)
      : [];
    try {
      printMoneyReceipt({
        receipt: {
          mr_no: form.mr_no,
          mr_date: form.mr_date,
          loc_code: locCode,
          loc_label: form.loc_code,
          bp_name: selectedCustomer?.bp_name || "",
          bp_code: selectedCustomer?.bp_grp_code || selectedCustomer?.bp_code || "",
          pay_mode: form.pay_mode,
          chq_utr_no: form.chq_utr_no,
          chq_utr_date: form.chq_utr_date,
          issuing_bank: form.issuing_bank,
          receiver_bank: form.receiver_bank,
          remarks: form.remarks,
          mr_reason_label: mrReasonLabel(form.mr_reason),
          received_amt: paidOrToPay ? totals.net : form.received_amt,
        },
        details: lines,
        company,
        locationsMap: Object.fromEntries(locations.map((l) => [l.loc_code, l])),
        customer: selectedCustomer,
      });
    } catch (e) {
      showError(e.message || "Popup blocked");
    }
  };

  const cash = form.pay_mode === "CASH";

  return (
    <MainLayout>
      <PageBody title="Money Receipt">
        <div className="pageToolbar" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 6 }}>
          <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick} sx={btn("#7e22ce", "#6b21a8")}>Edit</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={btn("#1ca562", "#119154")}>Save</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={btn("#1f6feb", "#1d4ed8")}>Print</Button>
          <Button variant="contained" startIcon={<DeleteIcon />} onClick={handleDelete} sx={btn("#dc2626", "#b91c1c")}>Delete</Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={btn("#8c98ab", "#6a7280")}>Clear</Button>
        </div>

        <div className="mr-receipt-head" style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8 }}>
          <style>{MR_HEAD_CSS}</style>
          <div style={{ padding: "3px 10px", fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: "#0d6efd", background: "#dfeeff" }}>
            Receipt Information
            {editNoMode && <Chip size="small" label="Enter receipt no, then click Edit again" sx={{ ml: 1, height: 18, fontSize: 10, fontWeight: 700 }} />}
            {editing && <Chip size="small" label={`Editing MR ${editing.mr_no}`} sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: "#f3e8ff", fontWeight: 700 }} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "6px 8px", padding: "6px 8px", background: "#f8fafc" }}>
            <div style={{ gridColumn: "span 2" }}><FormField label="MR No" name="mr_no" form={form} setForm={handleSetForm} disabled={!editNoMode} /></div>
            <div style={{ gridColumn: "span 2" }}><FormField label="MR Date" name="mr_date" type="date" form={form} setForm={handleSetForm} required /></div>
            <div style={{ gridColumn: "span 2" }}><FormField label="Branch" name="loc_code" form={form} setForm={handleSetForm} disabled /></div>
            <div style={{ gridColumn: "span 2" }}><FormField label="MR Reason" name="mr_reason" form={form} setForm={handleSetForm} options={MR_REASONS} required /></div>
            <div style={{ gridColumn: "span 2" }}><FormField label="Pay Mode" name="pay_mode" form={form} setForm={handleSetForm} options={PAY_MODES} required /></div>
            <div style={{ gridColumn: "span 2" }}><FormField label="Cheque / UTR No" name="chq_utr_no" form={form} setForm={handleSetForm} disabled={cash} /></div>
            <div style={{ gridColumn: "span 2" }}>
              <Autocomplete
                size="small"
                options={banks.map((b) => b.bank_name).filter(Boolean)}
                value={form.issuing_bank || null}
                disabled={cash}
                onChange={(_, v) => handleSetForm({ ...form, issuing_bank: v || "" })}
                renderInput={(p) => <TextField {...p} label="Issuing Bank" size="small" sx={fieldSx} />}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <Autocomplete
                size="small"
                options={banks.map((b) => b.bank_name).filter(Boolean)}
                value={form.receiver_bank || null}
                disabled={cash}
                onChange={(_, v) => handleSetForm({ ...form, receiver_bank: v || "" })}
                renderInput={(p) => <TextField {...p} label="Receiver's Bank" size="small" sx={fieldSx} />}
              />
            </div>
            <div style={{ gridColumn: "span 8" }}>
              <Autocomplete
                size="small"
                options={customerOptions}
                value={customerOptions.find((o) => String(o.value) === String(form.customer)) || null}
                openOnFocus
                autoHighlight
                selectOnFocus
                handleHomeEndKeys
                clearOnBlur
                noOptionsText="No customer found"
                slots={{ paper: CustomerPaper }}
                getOptionLabel={customerOptionLabel}
                getOptionKey={customerOptionKey}
                isOptionEqualToValue={sameCustomerOption}
                filterOptions={filterCustomers}
                slotProps={{
                  popper: {
                    placement: "bottom-start",
                  },
                  paper: {
                    sx: {
                      width: "100%",
                      mt: 0.5,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
                    },
                  },
                  listbox: {
                    sx: {
                      maxHeight: 320,
                      py: 0.5,
                      "& .MuiAutocomplete-option": {
                        alignItems: "center",
                        py: "7px",
                        px: "10px",
                        borderBottom: "1px solid #f1f5f9",
                      },
                      "& .MuiAutocomplete-option:last-of-type": { borderBottom: 0 },
                      "& .MuiAutocomplete-option.Mui-focused": { bgcolor: "#eff6ff" },
                      "& .MuiAutocomplete-option[aria-selected='true']": { bgcolor: "#dbeafe" },
                    },
                  },
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest}>
                      <span style={{ display: "grid", gridTemplateColumns: CUST_COLS, gap: 12, width: "100%", alignItems: "center" }}>
                        <span style={custCell({ fontSize: 12, fontWeight: 800, color: "#0f172a" })}>{option.id}</span>
                        <span style={custCell({ fontSize: 12, fontWeight: 800, color: "#0369a1" })}>{option.code}</span>
                        <span style={custCell({ fontSize: 13, fontWeight: 700, color: "#0f172a" })}>{option.name || option.code}</span>
                        <span style={custCell({ fontSize: 12, fontWeight: 800, color: "#0369a1" })}>{option.loc}</span>
                        <span style={custCell({ fontSize: 12, fontWeight: 600, color: "#334155" })}>{option.town}</span>
                      </span>
                    </li>
                  );
                }}
                onChange={(_, v) => {
                  handleSetForm({ ...form, customer: v?.value || "" });
                  setEditing(null);
                  if (form.mr_reason !== "1" && form.mr_reason !== "2") {
                    setRows([]);
                    setSelectedIds({ type: "include", ids: new Set() });
                    return;
                  }
                  const cust = v
                    ? (partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(v.value))
                      || { record_id: v.value, bp_id: v.value, bp_grp_code: v.code, bp_code: v.code, bp_name: v.name })
                    : null;
                  loadOutstanding(cust, form.mr_reason, form.mr_date);
                }}
                renderInput={(p) => <TextField {...p} label="Customer" size="small" sx={fieldSx} placeholder="Search code or name" />}
              />
            </div>
            <div style={{ gridColumn: "span 8" }}>
              <FormField label="Remarks" name="remarks" form={form} setForm={handleSetForm} />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              {showDocketGrid ? (
                <TextField label="Total Net Receipt" size="small" value={fmt(totals.net)} disabled sx={fieldSx} />
              ) : (
                <FormField label="Received Amount" name="received_amt" form={form} setForm={handleSetForm} />
              )}
            </div>
          </div>
        </div>

        {showDocketGrid && (
        <div style={{ marginTop: 12, padding: "8px 14px", background: "#e3f2fd", border: "1.5px solid #90caf9", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#0d6efd" }}>
          Total Net Receipt {fmt(totals.net)} &nbsp;|&nbsp; SGST {fmt(totals.sgst)} &nbsp;|&nbsp; CGST {fmt(totals.cgst)} &nbsp;|&nbsp; IGST {fmt(totals.igst)} &nbsp;|&nbsp; TDS {fmt(totals.tds)} &nbsp;|&nbsp; Other Ded {fmt(totals.ded)} &nbsp;|&nbsp; {selectedRows.length} consignment(s)
          {paidFull
            ? " — PAID: origin location is this branch, receipt pending, docket date on or before MR date"
            : " — TO PAY: destination location is this branch, receipt pending, docket date on or before MR date"}
        </div>
        )}

        {showDocketGrid && (
        <div className="mr-docket-grid" style={{ marginTop: 10 }}>
          <DataTable
            columns={docketColumns}
            rows={rows}
            getKey={(r) => r.id}
            dense
            rowHeight={28}
            headerHeight={36}
            autoHeight={false}
            scroll={{ afterRows: 5, horizontal: true, unpaged: true }}
            checkboxSelection
            selectedRowColor="#dcfce7"
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={onSelect}
            singleClick
            onCellChange={onCellChange}
          />
        </div>
        )}

        {showDocketGrid && (
        <div className="mr-bill-grid" style={{ marginTop: 14 }}>
          <div style={{ padding: "8px 14px", fontWeight: 700, color: "#0d6efd", background: "#dfeeff", border: "1px solid #dfeaf8", borderRadius: "8px 8px 0 0" }}>
            Bill
            {billLoading
              ? " — loading selected dockets"
              : ` — ${billView.length} docket(s) | Taxable ${fmt(billTotals.taxable)} | CGST ${fmt(billTotals.cgst)} | SGST ${fmt(billTotals.sgst)} | IGST ${fmt(billTotals.igst)} | Amount ${fmt(billTotals.amount)}`}
          </div>
          <DataTable
            columns={billColumns}
            rows={billView}
            getKey={(r) => r.id}
            dense
            rowHeight={42}
            headerHeight={44}
            autoHeight={false}
            isHeight={320}
            scroll={{ horizontal: true }}
          />
        </div>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Working..." />
      </PageBody>
    </MainLayout>
  );
}

const btn = (from, to) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "110px",
  "&:hover": { opacity: 0.92, background: `linear-gradient(135deg, ${from}, ${to})` },
});
