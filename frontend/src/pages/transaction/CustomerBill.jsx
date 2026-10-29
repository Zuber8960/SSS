import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { FormField, PageBody, DataTable } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, PrintIcon, AddIcon, DeleteIcon, EditIcon, CancelIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchDocketsForBilling, fetchCharges, fetchChargesBulk, fetchChargeMaster, fetchDocketByDocketNo } from "../../utils/docket";
import { fetchDeliveryNotes, fetchDeliveryNoteByDocketNo } from "../../utils/deliveryNote";
import { fetchAllLocations } from "../../utils/locationMaster";
import { saveInvoice, updateInvoice, deleteInvoice, cancelInvoice, fetchBilledDocketNos, fetchInvoiceByKeys, fetchInvoiceByNumber } from "../../utils/customerBill";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { getSessionLocCode } from "../../utils/authService";
import { printInvoice } from "../../components/common/InvoicePrint";
import { Autocomplete, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Tooltip } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import moment from "moment";
import { getDateFormat } from "../../utils/tenantService";
import { DEFAULT_SAC_CODE, LOGISTICS_SAC_CODES, formatSac, sacLabel } from "../../utils/sacCodes";

const docketNumericIndex = (no) => {
  const digits = String(no || "").replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits.slice(-6), 10) || 0;
};

const billingColumns = [
  {
    key: "docket_no",
    label: "Docket",
    minWidth: 118,
    flex: 1.35,
    align: "left",
    sortComparator: (a, b) => {
      const diff = docketNumericIndex(a) - docketNumericIndex(b);
      if (diff !== 0) return diff;
      return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
    },
  },
  { key: "docket_date", label: "Date", minWidth: 62 },
  { key: "origin", label: "Origin", minWidth: 120, flex: 1.4, align: "left" },
  { key: "destination", label: "Dest", minWidth: 120, flex: 1.4, align: "left" },
  { key: "consignee", label: "Cnee.", minWidth: 200, flex: 2.1, align: "left" },
  { key: "actual_wt", label: "Act\nWt", minWidth: 36, flex: 0.45 },
  { key: "charge_wt", label: "Chg\nWt", minWidth: 36, flex: 0.45 },
  { key: "freight", label: "Frt.", minWidth: 96 },
  { key: "loading", label: "Hand.", minWidth: 68, flex: 0.5 },
  { key: "unloading", label: "Fuel\nChrg", minWidth: 72, flex: 0.5 },
  { key: "detention", label: "Fact.\nChrg", minWidth: 74 },
  { key: "add_toll", label: "ODA\nChrg", minWidth: 66, flex: 0.5 },
  { key: "green_tax", label: "FOV", minWidth: 58, flex: 0.4 },
  { key: "other_charges", label: "Stnry.", minWidth: 74 },
  { key: "door_collection", label: "Door\nPkp", minWidth: 74 },
  { key: "door_delivery", label: "Door\nDly", minWidth: 74 },
  { key: "taxable", label: "Taxable", minWidth: 100 },
  { key: "cgst", label: "CGST", minWidth: 60, flex: 0.4 },
  { key: "sgst", label: "SGST", minWidth: 60, flex: 0.4 },
  { key: "igst", label: "IGST", minWidth: 60, flex: 0.4 },
  { key: "amount", label: "Amt.", minWidth: 84 },
  {
    key: "pod",
    label: "POD",
    minWidth: 40,
    render: (row) => (
      <span style={{ ...statusBadgeStyle, ...(row.pod === "YES" ? yesBadge : noBadge) }}>
        {row.pod}
      </span>
    ),
  },
];

const BILL_AMOUNT_COL_KEYS = [
  "freight", "loading", "unloading", "detention", "add_toll", "green_tax",
  "other_charges", "door_collection", "door_delivery", "taxable", "cgst", "sgst", "igst", "amount",
];

function BillGridTotalRow({ totals }) {
  const rowRef = useRef(null);

  useLayoutEffect(() => {
    const sync = () => {
      const headers = document.querySelectorAll(".customer-bill-page .MuiDataGrid-columnHeader[data-field]");
      const cells = rowRef.current?.children;
      if (!headers.length || !cells?.length) return;
      const count = Math.min(headers.length, cells.length);
      for (let i = 0; i < count; i++) {
        const w = Math.round(headers[i].getBoundingClientRect().width);
        cells[i].style.boxSizing = "border-box";
        cells[i].style.width = `${w}px`;
        cells[i].style.minWidth = `${w}px`;
        cells[i].style.maxWidth = `${w}px`;
        cells[i].style.flex = `0 0 ${w}px`;
      }
    };
    sync();
    const timer = window.setTimeout(sync, 50);
    const grid = document.querySelector(".customer-bill-page .MuiDataGrid-root");
    const ro = grid ? new ResizeObserver(sync) : null;
    if (grid && ro) ro.observe(grid);
    window.addEventListener("resize", sync);
    return () => {
      window.clearTimeout(timer);
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [totals]);

  const fields = ["__check__", ...billingColumns.map((c) => c.key)];
  return (
    <div ref={rowRef} style={totalRowStyle}>
      {fields.map((key) => (
        <div
          key={key}
          style={{
            ...totalCellStyle,
            justifyContent: key === "docket_no" ? "flex-start" : "center",
            paddingLeft: key === "docket_no" ? 8 : 4,
          }}
        >
          {key === "docket_no"
            ? "TOTAL"
            : BILL_AMOUNT_COL_KEYS.includes(key)
              ? Number(totals[key] || 0).toFixed(2)
              : ""}
        </div>
      ))}
    </div>
  );
}

const invoiceFields = [
  { label: "Invoice No", name: "invoice_no", disabled: true, width: 108 },
  { label: "Invoice Date", name: "invoice_date", type: "date", width: 128 },
  { label: "Billing Type", name: "billing_type", type: "select", options: ["Regular", "Debit Note"], required: true, width: 124 },
  { label: "Billing Branch", name: "billing_branch", type: "select", options: ["Select Branch"], required: true, disabled: true, width: 168 },
  { label: "From Date", name: "from_date", type: "date", required: true, width: 128 },
  { label: "To Date", name: "to_date", type: "date", required: true, width: 128 },
  { label: "Customer", name: "customer", type: "select", options: ["Select Customer"], width: 220 },
];

const sessionBranchLabel = (locations = []) => {
  const loc = String(getSessionLocCode() || "").trim();
  if (!loc) return "Select Branch";
  const locRow = (locations || []).find(
    (l) => String(l.loc_code || "").trim().toUpperCase() === loc.toUpperCase()
  );
  return locRow?.loc_name ? `${loc} - ${locRow.loc_name}` : loc;
};

const isoDateOnly = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format("YYYY-MM-DD") : "";
};

const capBillDateRange = (formValues) => {
  const invoiceDate = isoDateOnly(formValues.invoice_date);
  let fromDate = isoDateOnly(formValues.from_date);
  let toDate = isoDateOnly(formValues.to_date);
  if (invoiceDate && toDate && toDate > invoiceDate) toDate = invoiceDate;
  if (fromDate && toDate && fromDate > toDate) fromDate = toDate;
  return {
    ...formValues,
    invoice_date: invoiceDate || formValues.invoice_date || "",
    from_date: fromDate || formValues.from_date || "",
    to_date: toDate || formValues.to_date || "",
  };
};

const defaultBillDates = () => {
  const today = moment().format("YYYY-MM-DD");
  return capBillDateRange({
    invoice_date: today,
    from_date: moment().startOf("month").format("YYYY-MM-DD"),
    to_date: today,
  });
};

const emptyForm = {
  customer: "",
  invoice_no: "AUTO",
  invoice_date: moment().format("YYYY-MM-DD"),
  billing_branch: sessionBranchLabel(),
  billing_type: "Regular",
  sac_code: DEFAULT_SAC_CODE,
  invoice_remarks: "",
  ...defaultBillDates(),
};

const blankBillForm = (locations = []) => ({
  ...emptyForm,
  billing_branch: sessionBranchLabel(locations),
  ...defaultBillDates(),
});

const customerFieldSx = {
  "& .MuiInputBase-input": { fontSize: 11, fontWeight: 700 },
  "& .MuiInputLabel-root": { fontSize: 11, fontWeight: 700 },
};

const billPageFontCss = `
.customer-bill-page .MuiInputBase-input,
.customer-bill-page .MuiInputLabel-root,
.customer-bill-page .MuiSelect-select,
.customer-bill-page .MuiDataGrid-cell,
.customer-bill-page .MuiDataGrid-cell *,
.customer-bill-page .MuiDataGrid-columnHeaderTitle,
.customer-bill-page .MuiTablePagination-root,
.customer-bill-page .MuiTablePagination-selectLabel,
.customer-bill-page .MuiTablePagination-displayedRows {
  font-size: 11px !important;
  font-weight: 700 !important;
}
.customer-bill-page .MuiDataGrid-cell[data-field="freight"],
.customer-bill-page .MuiDataGrid-cell[data-field="loading"],
.customer-bill-page .MuiDataGrid-cell[data-field="unloading"],
.customer-bill-page .MuiDataGrid-cell[data-field="detention"],
.customer-bill-page .MuiDataGrid-cell[data-field="add_toll"],
.customer-bill-page .MuiDataGrid-cell[data-field="green_tax"],
.customer-bill-page .MuiDataGrid-cell[data-field="other_charges"],
.customer-bill-page .MuiDataGrid-cell[data-field="door_collection"],
.customer-bill-page .MuiDataGrid-cell[data-field="door_delivery"],
.customer-bill-page .MuiDataGrid-cell[data-field="taxable"],
.customer-bill-page .MuiDataGrid-cell[data-field="cgst"],
.customer-bill-page .MuiDataGrid-cell[data-field="sgst"],
.customer-bill-page .MuiDataGrid-cell[data-field="igst"],
.customer-bill-page .MuiDataGrid-cell[data-field="amount"],
.customer-bill-page .MuiDataGrid-cell[data-field="freight"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="loading"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="unloading"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="detention"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="add_toll"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="green_tax"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="other_charges"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="door_collection"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="door_delivery"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="taxable"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="cgst"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="sgst"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="igst"] *,
.customer-bill-page .MuiDataGrid-cell[data-field="amount"] * {
  font-size: 13px !important;
}
.customer-bill-page .MuiDataGrid-cell {
  padding: 0 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 26px !important;
}
.customer-bill-page .MuiDataGrid-cell > span,
.customer-bill-page .MuiDataGrid-cellContent {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 100%;
  line-height: 1.15 !important;
}
.customer-bill-page .MuiDataGrid-cell--textLeft,
.customer-bill-page .MuiDataGrid-cell--textLeft > span,
.customer-bill-page .MuiDataGrid-cell--textLeft .MuiDataGrid-cellContent {
  justify-content: flex-start !important;
  text-align: left !important;
}
.customer-bill-page .MuiDataGrid-columnHeader--alignLeft .MuiDataGrid-columnHeaderTitle {
  text-align: left !important;
}
.customer-bill-page .MuiDataGrid-row {
  min-height: 26px !important;
  max-height: 26px !important;
}
.customer-bill-page .MuiDataGrid-row.Mui-selected,
.customer-bill-page .MuiDataGrid-row.Mui-selected:nth-of-type(even) {
  background-color: #dcfce7 !important;
}
.customer-bill-page .MuiDataGrid-row.Mui-selected:hover {
  background-color: #bbf7d0 !important;
}
.customer-bill-page .MuiDataGrid-columnHeader {
  padding: 0 4px !important;
  height: 42px !important;
}
.customer-bill-page .MuiDataGrid-columnHeaders,
.customer-bill-page .MuiDataGrid-columnHeaderRow {
  min-height: 42px !important;
  max-height: 42px !important;
}
.customer-bill-page .MuiDataGrid-container--top,
.customer-bill-page .MuiDataGrid-topContainer {
  height: 42px !important;
  min-height: 42px !important;
  flex: 0 0 42px;
  position: sticky;
  top: 0;
  z-index: 40;
}
.customer-bill-page .MuiDataGrid-virtualScrollerRenderZone {
  position: relative !important;
  top: 0 !important;
  transform: none !important;
}
.customer-bill-page .MuiDataGrid-columnHeaderTitleContainer,
.customer-bill-page .MuiDataGrid-columnHeaderTitleContainerContent {
  height: 100%;
  justify-content: center;
  align-items: center;
}
.customer-bill-page .MuiDataGrid-columnHeaderTitle {
  white-space: pre-line !important;
  line-height: 1.15 !important;
  overflow: hidden !important;
  text-overflow: clip !important;
  text-align: center !important;
  text-transform: uppercase;
}
.customer-bill-page .MuiDataGrid-cellEmpty {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
}
`;

// Map ssm_charge_master.charge_desc onto billing columns (order: specific names first).
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

const columnFromMasterDesc = (desc) => {
  const d = String(desc || "").toUpperCase();
  if (!d) return null;
  for (const rule of MASTER_DESC_RULES) {
    if (rule.tests.some((t) => d.includes(t))) return rule.key;
  }
  return null;
};

const toDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format(getDateFormat()) : val;
};

const locCodeOf = (val) => String(val || "").split(" - ")[0].split(">")[0].trim().toUpperCase();

const docketMatchesSessionLoc = (d, sessionLoc) => {
  const session = locCodeOf(sessionLoc);
  if (!session) return true;
  const pay = locCodeOf(d.docket_pay_loc || d.pay_loc);
  const booked = locCodeOf(d.docket_loc || d.booking_branch);
  return pay === session || booked === session;
};

const sortDocketsByNo = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const an = String(a?.docket_no || "").trim();
    const bn = String(b?.docket_no || "").trim();
    if (!an && !bn) return 0;
    if (!an) return 1;
    if (!bn) return -1;
    const diff = docketNumericIndex(an) - docketNumericIndex(bn);
    if (diff !== 0) return diff;
    return an.localeCompare(bn, undefined, { numeric: true, sensitivity: "base" });
  });

const locTownLabel = (loc, town) => {
  const l = String(loc || "").trim();
  const t = String(town || "").trim();
  if (l && t) return `${l} > ${t}`;
  return l || t || "";
};

const isDeliveredStatus = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (!s || /(un|not |pending|cancel)/.test(s)) return false;
  return /deliver|dly|closed|complete|^y$|^yes$/.test(s);
};

const invoiceDetailToRow = (d, locCode) => {
  const handling = d.handling ?? d.loading;
  const fuel = d.fuel_surcharge ?? d.unloading;
  const factory = d.factory_charge ?? d.detention;
  const oda = d.oda_charge ?? d.additional_toll;
  const fov = d.fov ?? d.green_tax;
  const stationery = d.stationery ?? d.other_charges;
  const doorPkp = parseFloat(d.door_collection) || 0;
  const doorDly = parseFloat(d.door_delivery) || 0;
  const freight = parseFloat(d.freight) || 0;
  const loadingAmt = parseFloat(handling) || 0;
  const fuelAmt = parseFloat(fuel) || 0;
  const factoryAmt = parseFloat(factory) || 0;
  const odaAmt = parseFloat(oda) || 0;
  const fovAmt = parseFloat(fov) || 0;
  const stnryAmt = parseFloat(stationery) || 0;
  const taxable = Math.round(
    (freight + loadingAmt + fuelAmt + factoryAmt + odaAmt + fovAmt + stnryAmt + doorPkp + doorDly) * 100
  ) / 100;
  const gstAmount = Math.round(taxable * 0.18 * 100) / 100;
  const interState = locCodeOf(d.docket_from_loc) !== locCodeOf(d.docket_to_loc);
  const cgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
  const sgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
  const igst = interState ? gstAmount : 0;
  const amount = Math.round((taxable + gstAmount) * 100) / 100;
  return {
    id: String(d.docket_no || "").trim(),
    docket_no: d.docket_no || "",
    docket_date: toDate(d.docket_date),
    origin: locTownLabel(d.docket_from_loc, d.docket_from_town),
    destination: locTownLabel(d.docket_to_loc, d.docket_to_town),
    consignee: d.consignee || "",
    booking_branch: d.docket_from_loc || "",
    delivery_branch: d.docket_to_loc || "",
    pay_type: "",
    pay_loc: locCode || "",
    packages: "",
    actual_wt: d.docket_actwt ?? "",
    charge_wt: d.docket_chrwt ?? "",
    freight: freight.toFixed(2),
    loading: loadingAmt.toFixed(2),
    unloading: fuelAmt.toFixed(2),
    detention: factoryAmt.toFixed(2),
    add_toll: odaAmt.toFixed(2),
    green_tax: fovAmt.toFixed(2),
    other_charges: stnryAmt.toFixed(2),
    door_collection: doorPkp.toFixed(2),
    door_delivery: doorDly.toFixed(2),
    discount: "0.00",
    taxable: taxable.toFixed(2),
    cgst: cgst.toFixed(2),
    sgst: sgst.toFixed(2),
    igst: igst.toFixed(2),
    amount: amount.toFixed(2),
    pod: d.pod_flag === "Y" || d.pod_flag === "YES" ? "YES" : "NO",
    delivery_status: d.delivery_status || "Delivered",
    invoice_status: "Billed",
    _chargesLoaded: true,
    _fromInvoice: true,
    _edited: { loading: true, unloading: true, detention: true, add_toll: true, green_tax: true, other_charges: true, door_collection: true, door_delivery: true },
  };
};

export default function CustomerBill() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dialog, closeAlert, showError, showSuccess, showWarning } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [form, setForm] = useState(() => blankBillForm());
  const [partners, setPartners] = useState([]);
  const [billingRows, setBillingRows] = useState([]);
  const [chargeMaster, setChargeMaster] = useState([]);
  const [deliveryNotesMap, setDeliveryNotesMap] = useState({});
  const [deliveredDocketNos, setDeliveredDocketNos] = useState(() => new Set());
  const [locations, setLocations] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedDocketNos, setSelectedDocketNos] = useState(() => new Set());
  const [loadingDockets, setLoadingDockets] = useState(false);
  const [docketsLoaded, setDocketsLoaded] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null); // { invoice_no, invoice_date, loc_code }
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editNoMode, setEditNoMode] = useState(false);
  // Guards against a stale customer/branch fetch resolving after a newer one
  const docketLoadToken = useRef(0);
  const editOverlayRef = useRef(null);
  const editLoadedKey = useRef("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAllBusinessPartners();
        setPartners(data);
      } catch (error) {
        showError(error.message || "Failed to load business partners");
        console.error("Load business partners error:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllLocations()
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load locations:", err));
    fetchAllCompanies()
      .then((data) => { if (Array.isArray(data) && data.length) setCompany(data[0]); })
      .catch((err) => console.error("Failed to load company:", err));
  }, []);

  useEffect(() => {
    fetchChargeMaster()
      .then((master) => setChargeMaster(Array.isArray(master) ? master : []))
      .catch((err) => console.error("Failed to load charge master:", err));
  }, []);

  useEffect(() => {
    fetchDeliveryNotes()
      .then((notes) => {
        const map = {};
        const delivered = new Set();
        (Array.isArray(notes) ? notes : []).forEach((n) => {
          const no = String(n.docket_no || "").trim();
          if (!no) return;
          map[no] = n;
          if (isDeliveredStatus(n.delivery_status)) delivered.add(no);
        });
        setDeliveryNotesMap(map);
        setDeliveredDocketNos(delivered);
      })
      .catch((err) => console.error("Failed to load delivery notes:", err));
  }, []);

  const loginBranchLabel = useMemo(() => sessionBranchLabel(locations), [locations]);
  const branchOptions = [loginBranchLabel].filter(Boolean);
  const branchSelected = !!(loginBranchLabel && loginBranchLabel !== "Select Branch");

  useEffect(() => {
    if (!loginBranchLabel || loginBranchLabel === "Select Branch") return;
    setForm((prev) =>
      prev.billing_branch === loginBranchLabel ? prev : { ...prev, billing_branch: loginBranchLabel }
    );
  }, [loginBranchLabel]);
  const isDebitNote = form.billing_type === "Debit Note";
  const selectedLocCode = useMemo(
    () => (form.billing_branch || "").split(" - ")[0].trim(),
    [form.billing_branch]
  );

  // Customers of the selected billing branch only (BP loc_code). Searchable by code and name.
  const customerOptions = useMemo(() => {
    if (!selectedLocCode) return [];
    const loc = selectedLocCode.toUpperCase();
    return partners
      .filter((p) => {
        const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return bpLoc === loc && (p.bp_name || p.bp_grp_code || p.bp_code);
      })
      .map((p) => {
        const name = String(p.bp_name || "").trim();
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        return {
          value: String(p.record_id ?? p.bp_id ?? ""),
          code,
          name,
          label: code ? `${code} - ${name}` : name,
        };
      })
      .filter((o) => o.value);
  }, [partners, selectedLocCode]);

  const handleSetForm = (updatedForm) => {
    const next = typeof updatedForm === "function" ? updatedForm(form) : updatedForm;
    const lockedBranch = loginBranchLabel || form.billing_branch;
    const capped = capBillDateRange({ ...next, billing_branch: lockedBranch });
    const bill = isoDateOnly(capped.invoice_date);
    const wantedTo = isoDateOnly(next.to_date);
    if (
      bill &&
      wantedTo &&
      wantedTo > bill &&
      isoDateOnly(next.to_date) !== isoDateOnly(form.to_date)
    ) {
      showError("To Date cannot be later than Invoice Date");
    }
    setForm(capped);
  };

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || "null") || {};
    } catch {
      return {};
    }
  };

  const chargeCodeToColumn = useMemo(() => {
    const map = {};
    (Array.isArray(chargeMaster) ? chargeMaster : []).forEach((m) => {
      const code = String(m.charge_code || "").toUpperCase().trim();
      if (!code) return;
      const col = columnFromMasterDesc(m.charge_desc);
      if (col) map[code] = col;
    });
    return map;
  }, [chargeMaster]);

  const mapChargeToColumn = (chargeCode, chargeDesc) => {
    const upperCode = String(chargeCode || "").toUpperCase().trim();
    if (upperCode && chargeCodeToColumn[upperCode]) return chargeCodeToColumn[upperCode];
    const master = (chargeMaster || []).find(
      (m) => String(m.charge_code || "").toUpperCase().trim() === upperCode
    );
    return columnFromMasterDesc(master?.charge_desc || chargeDesc);
  };

  const getDeliveryStatus = (docket) => {
    const note = deliveryNotesMap[docket.docket_no];
    return note?.delivery_status || docket.delivery_status || "Pending";
  };

  const getPodStatus = (docket) => {
    const note = deliveryNotesMap[docket.docket_no];
    return note?.pod_url ? "Received" : "Pending";
  };

  // Build a full billing row from a docket + its charges
  const buildBillingRow = (docket, charges = []) => {
    const chargeAmounts = {
      freight: 0,
      loading: 0,
      unloading: 0,
      detention: 0,
      add_toll: 0,
      green_tax: 0,
      other_charges: 0,
      door_collection: 0,
      door_delivery: 0,
      discount: 0,
    };

    (Array.isArray(charges) ? charges : []).forEach((c) => {
      const master = chargeMaster.find((m) => m.charge_code === c.charge_code);
      const desc = master?.charge_desc || c.charge_name || c.charge_desc || c.charge_code;
      const colKey = mapChargeToColumn(c.charge_code, desc);
      if (colKey && colKey in chargeAmounts) {
        chargeAmounts[colKey] += parseFloat(c.charge_amt) || 0;
      }
    });

    const taxable =
      chargeAmounts.freight +
      chargeAmounts.loading +
      chargeAmounts.unloading +
      chargeAmounts.detention +
      chargeAmounts.add_toll +
      chargeAmounts.green_tax +
      chargeAmounts.other_charges +
      chargeAmounts.door_collection +
      chargeAmounts.door_delivery -
      chargeAmounts.discount;
    const taxableRounded = Math.round(taxable * 100) / 100;

    const fromLoc = (docket.docket_loc || "").toLowerCase();
    const toLoc = (docket.docket_to_loc || "").toLowerCase();
    const interState = fromLoc !== toLoc;

    const gstRate = 0.18;
    const gstAmount = Math.round(taxableRounded * gstRate * 100) / 100;
    const cgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const sgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const igst = interState ? gstAmount : 0;
    const totalAmount = Math.round((taxableRounded + gstAmount) * 100) / 100;

    const deliveryStatus = getDeliveryStatus(docket);
    const pod = getPodStatus(docket);

    return {
      id: docket.docket_no + "_" + docket.docket_date,
      docket_no: docket.docket_no || "",
      docket_date: toDate(docket.docket_date),
      origin: locTownLabel(docket.docket_loc, docket.docket_pickup_town || docket.docket_from_town),
      destination: locTownLabel(docket.docket_to_loc, docket.docket_dly_town || docket.docket_to_town),
      consignee: docket.cnee_name || "",
      booking_branch: docket.docket_loc || "",
      delivery_branch: docket.docket_to_loc || "",
      pay_type: docket.docket_pay_type || docket.pay_type || "",
      pay_loc: docket.docket_pay_loc || docket.pay_loc || "",
      packages: docket.docket_tot_pkgs ?? docket.total_pkgs ?? "",
      actual_wt: docket.docket_act_wt ?? docket.actual_wt ?? "",
      charge_wt: docket.docket_chrg_wt ?? docket.chrg_wt ?? "",
      freight: chargeAmounts.freight.toFixed(2),
      loading: chargeAmounts.loading.toFixed(2),
      unloading: chargeAmounts.unloading.toFixed(2),
      detention: chargeAmounts.detention.toFixed(2),
      add_toll: chargeAmounts.add_toll.toFixed(2),
      green_tax: chargeAmounts.green_tax.toFixed(2),
      other_charges: chargeAmounts.other_charges.toFixed(2),
      door_collection: chargeAmounts.door_collection.toFixed(2),
      door_delivery: chargeAmounts.door_delivery.toFixed(2),
      discount: chargeAmounts.discount.toFixed(2),
      taxable: taxableRounded.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      amount: totalAmount.toFixed(2),
      pod: pod === "Received" ? "YES" : "NO",
      delivery_status: deliveryStatus,
      invoice_status: "Unbilled",
    };
  };

  // Editable charge columns - user can modify these values in the grid
  const editableChargeKeys = ["loading", "unloading", "detention", "add_toll", "green_tax", "other_charges", "door_collection", "door_delivery"];

  // The customer record picked in the dropdown. The dropdown stores only the
  // BP name, so we resolve the full partner row here to get its record_id.
  // Dockets saved during this session / belonging to the invoice being edited.
  // These stay visible in the list even though they are already billed.
  const editingDocketNos = useRef(new Set());
  const isDocketOnEditingInvoice = (docketNo) => editingDocketNos.current.has(String(docketNo));

  const isCancelFlag = (value) => {
    const v = String(value ?? "").trim().toUpperCase();
    return v === "Y" || v === "C" || v === "1";
  };

  const applyLoadedInvoice = (data) => {
    try {
    const submitted = !!(data.inv_sub_date);
    const cancelled = isCancelFlag(data.cancel_flag);
    const details = Array.isArray(data.details) ? data.details : [];
    const loginLoc = getSessionLocCode();
    if (loginLoc && locCodeOf(data.loc_code) && locCodeOf(data.loc_code) !== locCodeOf(loginLoc)) {
      showError("Bill " + data.invoice_no + " belongs to another branch");
      return false;
    }
    const bpCode = String(data.bp_code ?? "").trim();
    const hasCode = bpCode && bpCode !== "0";
    const bpName = String(data.bp_name || "").trim().toLowerCase();
    const billLoc = String(data.loc_code || "").trim().toUpperCase();
    const partner =
      partners.find((p) => {
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        const name = String(p.bp_name || "").trim().toLowerCase();
        const pLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return hasCode && code === bpCode && (!billLoc || !pLoc || pLoc === billLoc);
      }) ||
      partners.find((p) => {
        const name = String(p.bp_name || "").trim().toLowerCase();
        const pLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return bpName && name === bpName && (!billLoc || !pLoc || pLoc === billLoc);
      }) ||
      partners.find((p) => {
        const name = String(p.bp_name || "").trim().toLowerCase();
        return bpName && name === bpName;
      });
    if (!partner) {
      showError("Customer master row was not matched; bill data is still loaded");
    }
    const overlay = {};
    details.forEach((d) => {
      const no = String(d.docket_no || "").trim();
      if (!no) return;
      overlay[no] = invoiceDetailToRow(d, data.loc_code);
    });
    editOverlayRef.current = overlay;
    editingDocketNos.current = new Set(Object.keys(overlay));
    const overlayRows = Object.keys(overlay).map((no) => ({ ...overlay[no], id: no }));
    const invDate = moment(data.invoice_date);
    const isoDate = invDate.isValid() ? invDate.format("YYYY-MM-DD") : "";
    const sacFromBill = String(data.sac_code || "").trim();
    const safeSac = LOGISTICS_SAC_CODES.some((s) => s.code === sacFromBill)
      ? sacFromBill
      : DEFAULT_SAC_CODE;
    docketLoadToken.current++;
    setEditNoMode(false);
    setIsViewOnly(submitted || cancelled);
    setEditingInvoice({
      invoice_no: data.invoice_no,
      invoice_date: isoDate,
      loc_code: data.loc_code,
      cancel_flag: cancelled ? "Y" : data.cancel_flag || null,
      submitted,
    });
    setBillingRows(sortDocketsByNo(overlayRows));
    setSelectedDocketNos(new Set(Object.keys(overlay)));
    setDocketsLoaded(true);
    setLoadingDockets(false);
    const detailDates = details
      .map((d) => moment(d.docket_date))
      .filter((m) => m.isValid())
      .sort((a, b) => a.valueOf() - b.valueOf());
    const dates = defaultBillDates();
    setForm((prev) => capBillDateRange({
      customer: partner ? String(partner.record_id ?? partner.bp_id ?? "") : "",
      invoice_no: String(data.invoice_no || ""),
      invoice_date: isoDate,
      billing_branch: loginBranchLabel || sessionBranchLabel(locations),
      billing_type: data.invoice_type === "D" || data.invoice_type === "DN" ? "Debit Note" : "Regular",
      sac_code: safeSac,
      invoice_remarks: prev.invoice_remarks || "",
      from_date: detailDates.length ? detailDates[0].format("YYYY-MM-DD") : (prev.from_date || dates.from_date),
      to_date: detailDates.length ? detailDates[detailDates.length - 1].format("YYYY-MM-DD") : (prev.to_date || dates.to_date),
    }));
    showSuccess(
      cancelled
        ? "Invoice " + data.invoice_no + " is cancelled (view only)"
        : submitted
        ? "Invoice " + data.invoice_no + " opened in view-only mode (already submitted)"
        : "Invoice " + data.invoice_no + " opened for edit"
    );
    return true;
    } catch (err) {
      console.error("applyLoadedInvoice error:", err);
      showError(err.message || "Failed to display the bill");
      return false;
    }
  };

  const loadInvoiceByNo = async (invoiceNo) => {
    const no = String(invoiceNo || "").trim();
    if (!no || no.toUpperCase() === "AUTO") {
      showError("Please enter a bill number");
      return;
    }
    try {
      showLoading();
      const loc = locCodeOf(selectedLocCode) || locCodeOf(getSessionLocCode());
      const data = await fetchInvoiceByNumber(no, loc || null).catch(() => null);
      if (!data) {
        showError("Bill number " + no + " not found for this branch");
        return;
      }
      applyLoadedInvoice(data);
    } catch (err) {
      showError(err.message || "Failed to load invoice");
      console.error("Load invoice by number error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleEditClick = () => {
    if (!editNoMode) {
      setEditNoMode(true);
      setForm((prev) => ({
        ...prev,
        invoice_no: prev.invoice_no === "AUTO" ? "" : String(prev.invoice_no || ""),
      }));
      return;
    }
    loadInvoiceByNo(form.invoice_no);
  };

  useEffect(() => {
    const req = location.state?.editInvoice;
    if (!req || !partners.length || !locations.length) return;
    const key = `${req.invoice_no}|${req.invoice_date}|${req.loc_code}`;
    if (editLoadedKey.current === key) return;
    editLoadedKey.current = key;

    (async () => {
      try {
        showLoading();
        const loginLoc = getSessionLocCode();
        if (loginLoc && locCodeOf(req.loc_code) && locCodeOf(req.loc_code) !== locCodeOf(loginLoc)) {
          showError("This bill belongs to another branch");
          return;
        }
        const data = await fetchInvoiceByKeys(req.invoice_no, req.invoice_date, req.loc_code);
        if (!data) {
          showError("Invoice not found");
          return;
        }
        applyLoadedInvoice(data);
        navigate(location.pathname, { replace: true, state: {} });
      } catch (err) {
        showError(err.message || "Failed to open invoice for edit");
        console.error("Load invoice for edit error:", err);
      } finally {
        hideLoading();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, partners, locations]);

  const selectedCustomer = useMemo(
    () => partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(form.customer)) || null,
    [partners, form.customer]
  );

  // record_id of the selected business partner - this is what docket rows are
  // matched against (docket.cnor_id / docket.cnee_id)
  const selectedCustomerId = useMemo(() => {
    if (!selectedCustomer) return null;
    const id = selectedCustomer.record_id ?? selectedCustomer.bp_id ?? null;
    return id == null ? null : String(id);
  }, [selectedCustomer]);

  // A docket belongs to the customer when its cnor_id OR cnee_id equals the
  // selected business partner's record_id.
  // The name comparison is only a safety net for dockets whose cnor_id/cnee_id
  // columns came back NULL, so nothing silently disappears from the list.
  const docketBelongsToCustomer = (docket, customerId, customerName, partner) => {
    const ids = new Set(
      [customerId, partner?.record_id, partner?.bp_id, partner?.bp_grp_code, partner?.bp_code]
        .map((v) => String(v ?? "").trim())
        .filter((v) => v && v !== "0")
    );
    const cnorId = docket.cnor_id == null ? "" : String(docket.cnor_id).trim();
    const cneeId = docket.cnee_id == null ? "" : String(docket.cnee_id).trim();
    if ((cnorId && ids.has(cnorId)) || (cneeId && ids.has(cneeId))) return true;
    if (!customerName) return false;
    const name = customerName.trim().toLowerCase();
    return (
      (docket.cnor_name || "").trim().toLowerCase() === name ||
      (docket.cnee_name || "").trim().toLowerCase() === name
    );
  };

  // Load every docket belonging to the selected customer: resolve the partner's
  // record_id, then keep only dockets whose cnor_id or cnee_id equals it.
  // Optionally narrowed to the selected billing branch. Dockets already attached
  // to a saved invoice are flagged as Billed so the user never bills them twice.
  useEffect(() => {
    const customerName = selectedCustomer?.bp_name;
    if (isViewOnly) return;
    if (!form.customer || !selectedCustomerId) {
      if (editingInvoice) return;
      docketLoadToken.current++;
      setBillingRows([]);
      setSelectedDocketNos(new Set());
      setDocketsLoaded(false);
      setLoadingDockets(false);
      return;
    }
    if (!form.from_date || !form.to_date) {
      if (editingInvoice) return;
      docketLoadToken.current++;
      setBillingRows([]);
      setSelectedDocketNos(new Set());
      setDocketsLoaded(false);
      setLoadingDockets(false);
      return;
    }

    const token = ++docketLoadToken.current;
    const customerId = selectedCustomerId;
    const locCode = selectedLocCode;
    let cancelled = false;

    (async () => {
      try {
        setLoadingDockets(true);
        const customerIds = [
          customerId,
          selectedCustomer?.record_id,
          selectedCustomer?.bp_id,
          selectedCustomer?.bp_grp_code,
          selectedCustomer?.bp_code,
        ].filter((v) => v != null && String(v).trim() && String(v).trim() !== "0");
        const dockets = await fetchDocketsForBilling({
          locCode,
          customerIds,
          customerName: selectedCustomer?.bp_name || customerName || "",
          billedMode: isDebitNote ? "billed" : "unbilled",
          fromDate: form.from_date,
          toDate: form.to_date,
        });
        const billedList = await fetchBilledDocketNos().catch(() => []);

        const billedMap = {};
        (Array.isArray(billedList) ? billedList : []).forEach((no) => {
          if (no) billedMap[String(no).trim()] = true;
        });

        if (cancelled || token !== docketLoadToken.current) return;

        const docketList = Array.isArray(dockets) ? dockets : [];

        // Dockets already attached to a saved invoice are not billable again.
        // Ones belonging to the invoice currently being edited stay visible so
        // an existing invoice can be re-opened and updated.
        const isBilled = (docketNo) =>
          !!billedMap[String(docketNo).trim()] || isDocketOnEditingInvoice(docketNo);

        const filtered = docketList.filter((d) => {
          if (!d.docket_no) return false;
          if (isDebitNote) {
            if (!isBilled(d.docket_no) && !isDocketOnEditingInvoice(d.docket_no)) return false;
          } else if (isBilled(d.docket_no) && !isDocketOnEditingInvoice(d.docket_no)) {
            return false;
          }
          return true;
        });

        const chargeRows = await fetchChargesBulk(filtered.map((d) => d.docket_no)).catch(() => []);
        const chargesByDocket = {};
        (Array.isArray(chargeRows) ? chargeRows : []).forEach((c) => {
          const no = String(c.docket_no || "").trim();
          if (!no) return;
          if (!chargesByDocket[no]) chargesByDocket[no] = [];
          chargesByDocket[no].push(c);
        });

        let rows = filtered.map((d) => ({
          ...buildBillingRow(d, chargesByDocket[String(d.docket_no).trim()] || []),
          id: d.docket_no,
          invoice_status: billedMap[String(d.docket_no).trim()] ? "Billed" : "Unbilled",
          _chargesLoaded: true,
        }));

        const overlay = editOverlayRef.current;
        if (overlay && Object.keys(overlay).length) {
          const have = new Set(rows.map((r) => String(r.docket_no).trim()));
          rows = rows.map((r) => {
            const saved = overlay[String(r.docket_no).trim()];
            if (!saved) return r;
            return {
              ...r,
              ...saved,
              id: String(r.docket_no).trim(),
              pay_loc: r.pay_loc || saved.pay_loc,
              origin: r.origin || saved.origin,
              destination: r.destination || saved.destination,
              consignee: r.consignee || saved.consignee,
              invoice_status: "Billed",
              _fromInvoice: true,
              _chargesLoaded: true,
            };
          });
          Object.entries(overlay).forEach(([no, saved]) => {
            if (!have.has(no)) rows.push({ ...saved, id: no });
          });
          setSelectedDocketNos(new Set(Object.keys(overlay)));
        } else {
          setSelectedDocketNos(new Set());
        }

        setBillingRows(sortDocketsByNo(rows));
        setDocketsLoaded(true);

        // Helpful when a customer unexpectedly shows no dockets
        if (filtered.length === 0) {
          console.info(
            `[CustomerBill] No dockets for "${selectedCustomer?.bp_name}" (record_id=${customerId}). ` +
            `Scanned ${docketList.length} dockets; sample cnor_id/cnee_id:`,
            docketList.slice(0, 5).map((d) => ({ docket_no: d.docket_no, cnor_id: d.cnor_id, cnee_id: d.cnee_id }))
          );
        }
      } catch (err) {
        if (cancelled || token !== docketLoadToken.current) return;
        showError(err.message || "Failed to load dockets for the selected customer");
        console.error("Load customer dockets error:", err);
        setBillingRows([]);
        setDocketsLoaded(false);
      } finally {
        if (!cancelled && token === docketLoadToken.current) setLoadingDockets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, form.billing_branch, form.billing_type, form.from_date, form.to_date, selectedCustomerId, chargeMaster, isDebitNote, isViewOnly, editingInvoice]);

  // Recalculate derived fields (taxable, GST, amount) when charge values change
  const recalculateRow = (row) => {
    const freight = parseFloat(row.freight) || 0;
    const loading = parseFloat(row.loading) || 0;
    const unloading = parseFloat(row.unloading) || 0;
    const detention = parseFloat(row.detention) || 0;
    const add_toll = parseFloat(row.add_toll) || 0;
    const green_tax = parseFloat(row.green_tax) || 0;
    const other_charges = parseFloat(row.other_charges) || 0;
    const door_collection = parseFloat(row.door_collection) || 0;
    const door_delivery = parseFloat(row.door_delivery) || 0;
    const discount = parseFloat(row.discount) || 0;

    const taxable = Math.round(
      (freight + loading + unloading + detention + add_toll + green_tax + other_charges + door_collection + door_delivery - discount) * 100
    ) / 100;

    const fromLoc = locCodeOf(row.booking_branch || row.origin);
    const toLoc = locCodeOf(row.delivery_branch || row.destination);
    const interState = fromLoc !== toLoc;

    const gstRate = 0.18;
    const gstAmount = Math.round(taxable * gstRate * 100) / 100;
    const cgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const sgst = interState ? 0 : Math.round((gstAmount / 2) * 100) / 100;
    const igst = interState ? gstAmount : 0;
    const totalAmount = Math.round((taxable + gstAmount) * 100) / 100;

    return {
      ...row,
      taxable: taxable.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      amount: totalAmount.toFixed(2),
    };
  };

  // Fold a docket's charge lines into a grid row, keeping any value the user
  // has already typed (manual entries win over the fetched charge).
  const applyChargesToRow = (row, charges) => {
    const merged = { ...row };
    ["freight", "loading", "unloading", "detention", "add_toll", "green_tax", "other_charges", "door_collection", "door_delivery", "discount"].forEach((k) => {
      if (!row._edited?.[k]) merged[k] = "0.00";
    });
    (Array.isArray(charges) ? charges : []).forEach((c) => {
      const master = chargeMaster.find((m) => m.charge_code === c.charge_code);
      const desc = master?.charge_desc || c.charge_name || c.charge_desc || c.charge_code;
      const colKey = mapChargeToColumn(c.charge_code, desc);
      if (!colKey || !(colKey in merged)) return;
      if (row._edited?.[colKey]) return;
      merged[colKey] = ((parseFloat(merged[colKey]) || 0) + (parseFloat(c.charge_amt) || 0)).toFixed(2);
    });
    merged._chargesLoaded = true;
    return recalculateRow(merged);
  };

  // Whenever the user ticks dockets, pull their charge breakdown so amounts,
  // taxes and the totals row are real numbers before saving.
  const loadChargesForSelected = async (docketNos) => {
    const pending = docketNos.filter((no) => {
      const row = billingRows.find((r) => String(r.id) === String(no));
      return row && !row._chargesLoaded;
    });
    if (pending.length === 0) return;

    const pairs = await Promise.all(
      pending.map(async (no) => {
        try {
          return [no, await fetchCharges(no)];
        } catch {
          return [no, []];
        }
      })
    );
    const chargesByDocket = Object.fromEntries(pairs);

    setBillingRows((prev) =>
      prev.map((row) => {
        const key = String(row.id);
        if (!(key in chargesByDocket)) return row;
        const charges = chargesByDocket[key];
        return Array.isArray(charges) ? applyChargesToRow(row, charges) : { ...row, _chargesLoaded: true };
      })
    );
  };

  // Multi-select: ticks decide which dockets get saved on the invoice
  const handleRowSelectionModelChange = (model) => {
    if (isViewOnly) return;
    let ids;
    if (model?.type === "exclude") {
      const excluded = new Set([...(model.ids || [])].map(String));
      ids = billingRows.map((r) => String(r.id)).filter((id) => id && !excluded.has(id));
    } else {
      const rawIds = model?.ids instanceof Set
        ? model.ids
        : Array.isArray(model)
          ? model
          : model?.ids
            ? [...model.ids]
            : [];
      ids = [...rawIds].map(String);
    }
    const next = new Set(ids);
    setSelectedDocketNos((prev) => {
      if (prev instanceof Set && prev.size === next.size && [...next].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
    loadChargesForSelected([...next]);
  };

  // Add a new empty row so the user can enter a docket number
  const handleAddRow = () => {
    if (isViewOnly) {
      showError("Submitted bills are view only");
      return;
    }
    const id = "new_" + Date.now() + "_" + billingRows.length;
    const emptyRow = {
      id,
      docket_no: "",
      docket_date: "",
      origin: "",
      destination: "",
      consignee: "",
      booking_branch: "",
      delivery_branch: "",
      pay_type: "",
      pay_loc: "",
      packages: "",
      actual_wt: "",
      charge_wt: "",
      freight: "",
      loading: "",
      unloading: "",
      detention: "",
      add_toll: "",
      green_tax: "",
      other_charges: "",
      door_collection: "",
      door_delivery: "",
      discount: "",
      taxable: "",
      cgst: "",
      sgst: "",
      igst: "",
      amount: "",
      pod: "",
      delivery_status: "",
      invoice_status: "Unbilled",
      _chargesLoaded: false,
      _edited: {},
    };
    setBillingRows((prev) => [...prev, emptyRow]);
  };

  // When a docket number is entered in a row, fetch all docket data and populate the row
  const handleRowUpdate = async (newRow, oldRow) => {
    if (isViewOnly) return oldRow;
    // Check if a charge field was edited - recalculate derived fields
    const changedChargeKeys = editableChargeKeys.filter((key) => newRow[key] !== oldRow[key]);
    if (changedChargeKeys.length > 0) {
      // Remember the manual override so a later charge fetch does not wipe it
      const recalculated = recalculateRow({
        ...newRow,
        _edited: { ...(newRow._edited || {}), ...Object.fromEntries(changedChargeKeys.map((k) => [k, true])) },
      });
      // Update the billingRows state so the recalculated row persists in the grid
      setBillingRows((prev) =>
        prev.map((row) => (row.id === newRow.id ? { ...recalculated, id: newRow.id } : row))
      );
      return recalculated;
    }

    if (newRow.docket_no && newRow.docket_no !== oldRow.docket_no) {
      // Billing branch is mandatory - must be selected before entering a docket number
      const selectedBranch = form.billing_branch || "";
      if (!selectedBranch || selectedBranch === "Select Branch") {
        showError("Please select a billing branch before entering a docket number");
        return { ...newRow, docket_no: oldRow.docket_no };
      }

      try {
        showLoading();
        const docket = await fetchDocketByDocketNo(newRow.docket_no);
        const docketObj = Array.isArray(docket) ? docket[0] : docket;
        if (!docketObj) {
          showError("Docket " + newRow.docket_no + " not found");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        if (!docketMatchesSessionLoc(docketObj, selectedBranch)) {
          showError("Docket " + newRow.docket_no + " does not belong to billing branch " + selectedBranch);
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        let note = deliveryNotesMap[docketObj.docket_no] || deliveryNotesMap[newRow.docket_no];
        if (!note) {
          try {
            note = await fetchDeliveryNoteByDocketNo(docketObj.docket_no || newRow.docket_no);
          } catch {
            note = null;
          }
        }
        if (!isDeliveredStatus(note?.delivery_status)) {
          showError("Docket " + newRow.docket_no + " is not delivered");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        const billedList = await fetchBilledDocketNos().catch(() => []);
        const billedSet = new Set((Array.isArray(billedList) ? billedList : []).map((n) => String(n).trim()));
        const alreadyBilled =
          billedSet.has(String(newRow.docket_no).trim()) || isDocketOnEditingInvoice(newRow.docket_no);
        if (isDebitNote) {
          if (!alreadyBilled) {
            showError("Debit Note: docket " + newRow.docket_no + " has no bill prepared yet");
            return { ...newRow, docket_no: oldRow.docket_no };
          }
        } else if (alreadyBilled && !isDocketOnEditingInvoice(newRow.docket_no)) {
          showError("Docket " + newRow.docket_no + " already has a bill prepared");
          return { ...newRow, docket_no: oldRow.docket_no };
        }

        const charges = await fetchCharges(docketObj.docket_no || newRow.docket_no);
        const builtRow = buildBillingRow(docketObj, Array.isArray(charges) ? charges : []);
        showSuccess("Docket " + newRow.docket_no + " loaded");

        // Update the billingRows state so the populated row persists in the grid
        setBillingRows((prev) =>
          prev.map((row) => (row.id === newRow.id ? { ...builtRow, id: newRow.id } : row))
        );

        return { ...builtRow, id: newRow.id, _chargesLoaded: true, _edited: {} };
      } catch (err) {
        showError(err.message || "Failed to fetch docket " + newRow.docket_no);
        console.error("Load docket error:", err);
        return { ...newRow, docket_no: oldRow.docket_no };
      } finally {
        hideLoading();
      }
    }
    return newRow;
  };

  // Only Docket and charge columns should be editable
  const tableColumns = billingColumns.map((col) => ({
    ...col,
    editable: !isViewOnly && (col.key === "docket_no" || editableChargeKeys.includes(col.key)),
  }));

  // Stable array reference - DataTable memoises its controlled model on this,
  // so a fresh array every render would keep resetting the user's ticks
  const selectionIds = useMemo(() => {
    if (selectedDocketNos instanceof Set) return [...selectedDocketNos];
    if (Array.isArray(selectedDocketNos)) return selectedDocketNos.map(String);
    return [];
  }, [selectedDocketNos]);

  // The rows the user has ticked - these are the ones that get saved
  const selectedRows = useMemo(
    () =>
      billingRows.filter((r) => {
        const id = String(r.id ?? "");
        const no = String(r.docket_no ?? "").trim();
        return no && (selectedDocketNos.has(id) || selectedDocketNos.has(no));
      }),
    [billingRows, selectedDocketNos]
  );

  const totals = selectedRows.reduce(
    (acc, row) => ({
      freight: acc.freight + (parseFloat(row.freight) || 0),
      loading: acc.loading + (parseFloat(row.loading) || 0),
      unloading: acc.unloading + (parseFloat(row.unloading) || 0),
      detention: acc.detention + (parseFloat(row.detention) || 0),
      add_toll: acc.add_toll + (parseFloat(row.add_toll) || 0),
      green_tax: acc.green_tax + (parseFloat(row.green_tax) || 0),
      other_charges: acc.other_charges + (parseFloat(row.other_charges) || 0),
      door_collection: acc.door_collection + (parseFloat(row.door_collection) || 0),
      door_delivery: acc.door_delivery + (parseFloat(row.door_delivery) || 0),
      discount: acc.discount + (parseFloat(row.discount) || 0),
      taxable: acc.taxable + (parseFloat(row.taxable) || 0),
      cgst: acc.cgst + (parseFloat(row.cgst) || 0),
      sgst: acc.sgst + (parseFloat(row.sgst) || 0),
      igst: acc.igst + (parseFloat(row.igst) || 0),
      amount: acc.amount + (parseFloat(row.amount) || 0),
    }),
    { freight: 0, loading: 0, unloading: 0, detention: 0, add_toll: 0, green_tax: 0, other_charges: 0, door_collection: 0, door_delivery: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 }
  );

  // Removes the ticked dockets from the working list (nothing is sent to the server)
  const handleDeleteRow = () => {
    if (isViewOnly) {
      showError("Submitted bills are view only");
      return;
    }
    if (selectedDocketNos.size === 0) {
      showError("Please select at least one docket row to remove");
      return;
    }
    setBillingRows((prev) => prev.filter((row) => !selectedDocketNos.has(String(row.id))));
    if (editOverlayRef.current) {
      selectedDocketNos.forEach((id) => {
        const row = billingRows.find((r) => String(r.id) === String(id));
        const no = String(row?.docket_no || id).trim();
        delete editOverlayRef.current[no];
      });
    }
    setSelectedDocketNos(new Set());
    showSuccess("Selected docket(s) removed from this bill");
  };

  const handleCancelInvoice = () => {
    if (!editingInvoice) {
      showError("Load a saved bill with Edit before cancelling");
      return;
    }
    if (isCancelFlag(editingInvoice.cancel_flag)) {
      showError("This bill is already cancelled");
      return;
    }
    if (editingInvoice.submitted || isViewOnly) {
      showError("Submitted bills cannot be cancelled");
      return;
    }
    showWarning(
      "Cancel bill",
      "Bill " +
        editingInvoice.invoice_no +
        " will be marked cancelled. Its docket lines will be removed so those dockets can be billed again. Continue?",
      async () => {
        try {
          showLoading();
          await cancelInvoice(editingInvoice.invoice_no, editingInvoice.invoice_date, editingInvoice.loc_code);
          showSuccess("Bill " + editingInvoice.invoice_no + " cancelled. Dockets are available for another bill.");
          setForm(blankBillForm(locations));
          setBillingRows([]);
          setSelectedDocketNos(new Set());
          setEditingInvoice(null);
          setIsViewOnly(false);
          setEditNoMode(false);
          editOverlayRef.current = null;
          editingDocketNos.current = new Set();
          editLoadedKey.current = "";
        } catch (err) {
          showError(err.message || "Failed to cancel bill");
          console.error("Cancel invoice error:", err);
        } finally {
          hideLoading();
        }
      }
    );
  };

  const handleDeleteInvoice = async () => {
    if (isViewOnly) {
      showError("Submitted or cancelled bills cannot be deleted");
      return;
    }
    if (!editingInvoice) {
      showError("No saved invoice to delete. Save the invoice first.");
      return;
    }
    try {
      showLoading();
      await deleteInvoice(editingInvoice.invoice_no, editingInvoice.invoice_date, editingInvoice.loc_code);
      showSuccess("Invoice deleted successfully");
      setForm(blankBillForm(locations));
      setBillingRows([]);
      setSelectedDocketNos(new Set());
      setEditingInvoice(null);
      setIsViewOnly(false);
      setEditNoMode(false);
      editOverlayRef.current = null;
      editingDocketNos.current = new Set();
      editLoadedKey.current = "";
    } catch (err) {
      showError(err.message || "Failed to delete invoice");
      console.error("Delete invoice error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    docketLoadToken.current++;
    setForm(blankBillForm(locations));
    setBillingRows([]);
    setSelectedDocketNos(new Set());
    setDocketsLoaded(false);
    setLoadingDockets(false);
    setEditingInvoice(null);
    setIsViewOnly(false);
    setEditNoMode(false);
    editOverlayRef.current = null;
    editingDocketNos.current = new Set();
    editLoadedKey.current = "";
  };

  const buildInvoicePayload = () => {
    const currentUser = getCurrentUser();
    const selectedBranch = form.billing_branch || "";
    const selectedLocCode = selectedBranch.split(" - ")[0].trim();
    const customer = selectedCustomer;
    const totalAmt = selectedRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const header = {
      division_code: currentUser?.division_code ?? null,
      loc_code: selectedLocCode || null,
      bp_code: customer?.bp_grp_code ?? customer?.bp_code ?? 0,
      bp_name: customer?.bp_name || null,
      invoice_type: isDebitNote ? "D" : "R",
      invoice_no: editingInvoice?.invoice_no ?? null,
      invoice_date: form.invoice_date || null,
      sac_code: form.sac_code || DEFAULT_SAC_CODE,
      total_inv_amt: Math.round(totalAmt * 100) / 100,
      created_by: currentUser?.user_id ?? null,
      modified_by: currentUser?.user_id ?? null,
    };

    const details = selectedRows
      .map((row, index) => ({
        division_code: currentUser?.division_code ?? null,
        invoice_loc: selectedLocCode || null,
        invoice_date: form.invoice_date || null,
        invoice_type: isDebitNote ? "D" : "R",
        inv_sr_no: index + 1,
        docket_no: row.docket_no || null,
        docket_from_loc: locCodeOf(row.booking_branch || row.origin) || null,
        docket_to_loc: locCodeOf(row.delivery_branch || row.destination) || null,
        docket_date: row.docket_date ? moment(row.docket_date, getDateFormat()).format("YYYY-MM-DD") : null,
        docket_chrwt: parseFloat(row.charge_wt) || 0,
        docket_actwt: parseFloat(row.actual_wt) || 0,
        consignee: row.consignee || null,
        docket_from_town: String(row.origin || "").split(">").slice(1).join(">").trim() || null,
        docket_to_town: String(row.destination || "").split(">").slice(1).join(">").trim() || null,
        freight: parseFloat(row.freight) || 0,
        loading: parseFloat(row.loading) || 0,
        unloading: parseFloat(row.unloading) || 0,
        detention: parseFloat(row.detention) || 0,
        green_tax: parseFloat(row.green_tax) || 0,
        additional_toll: parseFloat(row.add_toll) || 0,
        other_charges: parseFloat(row.other_charges) || 0,
        handling: parseFloat(row.loading) || 0,
        fuel_surcharge: parseFloat(row.unloading) || 0,
        factory_charge: parseFloat(row.detention) || 0,
        oda_charge: parseFloat(row.add_toll) || 0,
        fov: parseFloat(row.green_tax) || 0,
        stationery: parseFloat(row.other_charges) || 0,
        door_collection: parseFloat(row.door_collection) || 0,
        door_delivery: parseFloat(row.door_delivery) || 0,
        taxable_amt: parseFloat(row.taxable) || 0,
        sgst: parseFloat(row.sgst) || 0,
        cgst: parseFloat(row.cgst) || 0,
        igst: parseFloat(row.igst) || 0,
        total_amt: parseFloat(row.amount) || 0,
        delivery_status: row.delivery_status || null,
        pod_flag: row.pod === "YES" ? "Y" : "N",
        created_by: currentUser?.user_id ?? null,
        modified_by: currentUser?.user_id ?? null,
      }));

    return { header, details };
  };

  const handlePrint = () => {
    if (selectedRows.length === 0) {
      showError("Please select at least one docket before printing");
      return;
    }
    if (!form.customer || !selectedCustomer) {
      showError("Please select a customer before printing");
      return;
    }
    const selectedBranch = form.billing_branch || "";
    const locCode = selectedBranch.split(" - ")[0].trim();
    const customer = selectedCustomer;
    const totalAmt = selectedRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const invoice = {
      invoice_no: form.invoice_no || "AUTO",
      invoice_date: form.invoice_date || "",
      bp_name: customer?.bp_name || "",
      bp_code: customer?.bp_grp_code || customer?.bp_code || "",
      bp_address: customer?.bp_addres || customer?.bp_address || "",
      bp_city: customer?.bp_city || "",
      bp_state: customer?.bp_state || "",
      bp_pincode: customer?.bp_pincode || "",
      bp_gstin: customer?.bp_gstin || "",
      bp_phone: customer?.bp_mobile1 || customer?.bp_mobile2 || "",
      loc_code: locCode || "",
      loc_label: selectedBranch || "",
      invoice_type: isDebitNote ? "D" : "R",
      sac_code: form.sac_code || DEFAULT_SAC_CODE,
      sac_label: formatSac(form.sac_code || DEFAULT_SAC_CODE),
      total_inv_amt: totalAmt.toFixed(2),
    };

    try {
      printInvoice({
        invoice,
        details: selectedRows,
        company,
        locationsMap: Object.fromEntries(locations.map((l) => [l.loc_code, l])),
        customer,
        partners,
      });
    } catch (err) {
      showError(err.message || "Print failed");
    }
  };

  const handleSave = async () => {
    if (isViewOnly) {
      showError("Submitted bills are view only and cannot be saved");
      return;
    }
    // Validate billing branch is selected
    const selectedBranch = form.billing_branch || "";
    if (!selectedBranch || selectedBranch === "Select Branch") {
      showError("Please select a billing branch before saving");
      return;
    }
    const locCode = selectedBranch.split(" - ")[0].trim();

    // Validate customer is selected
    if (!form.customer || !selectedCustomer) {
      showError("Please select a customer before saving");
      return;
    }

    // Validate invoice date
    if (!form.invoice_date) {
      showError("Please select an invoice date before saving");
      return;
    }

    if (!form.sac_code) {
      showError("Please select a SAC code before saving");
      return;
    }

    // The dockets are listed automatically, so the user must tick the ones to bill
    if (billingRows.length === 0) {
      showError("No dockets found for the selected customer");
      return;
    }

    if (selectedRows.length === 0) {
      showError("Please select at least one docket to bill");
      return;
    }

    if (!isDebitNote) {
      const alreadyBilled = selectedRows
        .filter((row) => row.invoice_status === "Billed" && !isDocketOnEditingInvoice(row.docket_no))
        .map((row) => row.docket_no);
      if (alreadyBilled.length > 0) {
        showError(
          "Cannot save. The following docket(s) are already billed on another invoice: " +
          alreadyBilled.join(", ")
        );
        return;
      }
    }

    const wrongBranchDockets = selectedRows
      .filter((row) => !docketMatchesSessionLoc(row, locCode))
      .map((row) => row.docket_no);

    if (wrongBranchDockets.length > 0) {
      showError(
        "Cannot save. The following docket(s) do not have payment location " +
        selectedBranch + ": " + wrongBranchDockets.join(", ")
      );
      return;
    }

    const notDelivered = selectedRows
      .filter((row) =>
        !row._fromInvoice &&
        !isDocketOnEditingInvoice(row.docket_no) &&
        !isDeliveredStatus(row.delivery_status) &&
        !deliveredDocketNos.has(String(row.docket_no))
      )
      .map((row) => row.docket_no);
    if (notDelivered.length > 0) {
      showError("Cannot save. The following docket(s) are not delivered: " + notDelivered.join(", "));
      return;
    }

    const payload = buildInvoicePayload();

    if (payload.details.length === 0) {
      showError("Please select at least one docket before saving");
      return;
    }

    const savedDocketNos = payload.details.map((d) => String(d.docket_no).trim());
    editingDocketNos.current = new Set(savedDocketNos);
    const overlay = {};
    selectedRows.forEach((r) => {
      const no = String(r.docket_no || "").trim();
      if (!no) return;
      overlay[no] = {
        ...r,
        id: no,
        invoice_status: "Billed",
        _fromInvoice: true,
        _chargesLoaded: true,
      };
    });
    editOverlayRef.current = overlay;

    try {
      showLoading();
      let result;
      if (editingInvoice) {
        result = await updateInvoice(
          editingInvoice.invoice_no,
          editingInvoice.invoice_date,
          editingInvoice.loc_code,
          payload
        );
        showSuccess("Invoice updated successfully");
      } else {
        result = await saveInvoice(payload);
        showSuccess("Invoice saved successfully");
        if (result?.header) {
          setForm((prev) => ({
            ...prev,
            invoice_no: String(result.header.invoice_no || ""),
          }));
          const savedDate = moment(result.header.invoice_date);
          setEditingInvoice({
            invoice_no: result.header.invoice_no,
            invoice_date: savedDate.isValid() ? savedDate.format("YYYY-MM-DD") : result.header.invoice_date,
            loc_code: result.header.loc_code,
          });
        }
      }

      // The saved dockets are now billed - flag them so they cannot be billed twice
      setBillingRows((prev) =>
        prev.map((row) =>
          savedDocketNos.includes(String(row.docket_no).trim()) || savedDocketNos.includes(String(row.id).trim())
            ? { ...row, invoice_status: "Billed", _fromInvoice: true }
            : row
        )
      );
    } catch (err) {
      showError(err.message || "Failed to save invoice");
      console.error("Save invoice error:", err);
    } finally {
      hideLoading();
    }
  };

  return (
    <MainLayout>
      <PageBody title="Customer Invoice Generation">
        <style>{billPageFontCss}</style>
        <div className="customer-bill-page">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick} sx={editHeaderButtonStyle}>
            Edit
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isViewOnly} sx={saveHeaderButtonStyle}>
            Save
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={printHeaderButtonStyle}>
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={handleCancelInvoice}
            disabled={!editingInvoice || isViewOnly}
            sx={cancelHeaderButtonStyle}
          >
            Cancel Bill
          </Button>
          <Button variant="contained" startIcon={<DeleteIcon />} onClick={handleDeleteInvoice} disabled={isViewOnly} sx={deleteHeaderButtonStyle}>
            Delete
          </Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={clearHeaderButtonStyle}>
            Clear
          </Button>
        </div>

        <div style={sectionWrap}>
          <div style={{ ...sectionTitleStyle, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            Invoice Information
            {editNoMode ? (
              <Chip
                size="small"
                label="Enter bill number, then click Edit again to load"
                sx={{ ml: 2, fontSize: 11, fontWeight: 700, bgcolor: "#fef3c7", color: "#92400e" }}
              />
            ) : null}
            {editingInvoice ? (
              <Chip
                size="small"
                label={
                  isCancelFlag(editingInvoice.cancel_flag)
                    ? `Invoice ${editingInvoice.invoice_no} — cancelled`
                    : isViewOnly
                    ? `Invoice ${editingInvoice.invoice_no} — submitted (view only)`
                    : `Editing Invoice ${editingInvoice.invoice_no} — add or remove dockets, then Save`
                }
                sx={{
                  ml: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: isCancelFlag(editingInvoice.cancel_flag)
                    ? "#fee2e2"
                    : isViewOnly
                    ? "#e2e8f0"
                    : "#f3e8ff",
                  color: isCancelFlag(editingInvoice.cancel_flag)
                    ? "#991b1b"
                    : isViewOnly
                    ? "#334155"
                    : "#6b21a8",
                }}
              />
            ) : null}
          </div>
          <div style={sectionGridStyle}>
            {invoiceFields
              .filter((field) => field.name !== "customer" && field.name !== "from_date" && field.name !== "to_date")
              .map((field) => (
                <div key={field.name} style={fieldCellStyle}>
                  <FormField
                    {...field}
                    disabled={
                      field.name === "invoice_no"
                        ? !editNoMode
                        : field.name === "billing_branch" ||
                          field.disabled ||
                          isViewOnly ||
                          (!!editingInvoice && field.name === "billing_type")
                    }
                    options={field.name === "billing_branch" ? branchOptions : field.options}
                    form={form}
                    setForm={handleSetForm}
                    onKeyDown={
                      field.name === "invoice_no" && editNoMode
                        ? (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              loadInvoiceByNo(form.invoice_no);
                            }
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
            <div style={{ ...fieldCellStyle, gridColumn: "span 2" }}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: 11, fontWeight: 700 }}>SAC Code</InputLabel>
                <Select
                  label="SAC Code"
                  value={
                    LOGISTICS_SAC_CODES.some((s) => s.code === form.sac_code)
                      ? form.sac_code
                      : DEFAULT_SAC_CODE
                  }
                  disabled={isViewOnly}
                  onChange={(e) => handleSetForm({ ...form, sac_code: e.target.value })}
                  sx={{
                    ...customerFieldSx,
                    "& .MuiSelect-select": { fontSize: 11, fontWeight: 700 },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { "& .MuiMenuItem-root": { fontSize: 11, fontWeight: 700, minHeight: 28, py: 0.5 } },
                    },
                  }}
                >
                  {LOGISTICS_SAC_CODES.map((s) => (
                    <MenuItem key={s.code} value={s.code}>
                      {sacLabel(s.code, s.desc)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            {invoiceFields
              .filter((field) => field.name === "from_date" || field.name === "to_date")
              .map((field) => (
                <div key={field.name} style={fieldCellStyle}>
                  <FormField
                    {...field}
                    disabled={isViewOnly}
                    form={form}
                    setForm={handleSetForm}
                  />
                </div>
              ))}
            <div style={{ ...fieldCellStyle, gridColumn: "span 4" }}>
              <Autocomplete
                size="small"
                disabled={!branchSelected || !!editingInvoice}
                options={
                  (() => {
                    const current = customerOptions.find((o) => String(o.value) === String(form.customer));
                    if (current || !selectedCustomer) return customerOptions;
                    const name = String(selectedCustomer.bp_name || "").trim();
                    const code = String(selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? "").trim();
                    return [
                      {
                        value: String(selectedCustomer.record_id ?? selectedCustomer.bp_id ?? form.customer),
                        code,
                        name,
                        label: code ? `${code} - ${name}` : name,
                      },
                      ...customerOptions,
                    ];
                  })()
                }
                value={
                  customerOptions.find((o) => String(o.value) === String(form.customer))
                  || (selectedCustomer
                    ? {
                        value: String(selectedCustomer.record_id ?? selectedCustomer.bp_id ?? form.customer),
                        code: String(selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? "").trim(),
                        name: String(selectedCustomer.bp_name || "").trim(),
                        label: String(selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? "").trim()
                          ? `${String(selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? "").trim()} - ${String(selectedCustomer.bp_name || "").trim()}`
                          : String(selectedCustomer.bp_name || "").trim(),
                      }
                    : null)
                }
                getOptionLabel={(opt) => {
                  if (!opt) return "";
                  if (typeof opt === "string") return opt;
                  return opt.label || (opt.code ? `${opt.code} - ${opt.name}` : opt.name || "");
                }}
                isOptionEqualToValue={(a, b) => String(a?.value) === String(b?.value)}
                filterOptions={(opts, state) => {
                  const q = String(state.inputValue || "").trim().toLowerCase();
                  if (!q) return opts;
                  return opts.filter((o) => {
                    const code = String(o.code || "").toLowerCase();
                    const name = String(o.name || "").toLowerCase();
                    const label = String(o.label || "").toLowerCase();
                    return code.includes(q) || name.includes(q) || label.includes(q);
                  });
                }}
                onChange={(_, v) => handleSetForm({ ...form, customer: v?.value || "" })}
                slotProps={{
                  paper: {
                    sx: {
                      "& .MuiAutocomplete-option": { fontSize: 11, fontWeight: 700, minHeight: 28, py: 0.5 },
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
                    size="small"
                    sx={customerFieldSx}
                    placeholder={branchSelected ? "Search code or name" : "Select billing branch first"}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ ...tableTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{isDebitNote ? "Available Dockets for Debit Note" : "Available Dockets for Billing"}</span>
            {selectedCustomer && !docketsLoaded && !loadingDockets && (
              <Chip
                size="small"
                label="Set From/To dates and customer to load dockets"
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#fff8e1", color: "#b45309" }}
              />
            )}
            {selectedCustomer && loadingDockets && (
              <Chip
                size="small"
                label="Loading dockets..."
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#e3f2fd", color: "#0d6efd" }}
              />
            )}
            {billingRows.length > 0 && (
              <Chip
                size="small"
                label={billingRows.length + " docket" + (billingRows.length > 1 ? "s" : "")}
                sx={{ ml: 2, fontSize: 12, fontWeight: 600, bgcolor: "#e8f5e9", color: "#1b5e20" }}
              />
            )}
            {selectedRows.length > 0 && (
              <Chip
                size="small"
                label={selectedRows.length + " selected"}
                sx={{ ml: 1, fontSize: 12, fontWeight: 700, bgcolor: "#0d6efd", color: "#fff" }}
              />
            )}
            <span style={{ flex: 1 }} />
            <Tooltip title="Remove Selected Rows">
              <span>
                <IconButton
                  onClick={handleDeleteRow}
                  disabled={isViewOnly}
                  size="small"
                  sx={{
                    color: "#dc2626",
                    background: "#fee2e2",
                    width: 34,
                    height: 34,
                    mr: 1,
                    "&:hover": { background: "#fecaca" },
                    "&.Mui-disabled": { color: "#9ca3af", background: "#f3f4f6" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add Docket Manually">
              <span>
                <IconButton
                  onClick={handleAddRow}
                  disabled={isViewOnly}
                  size="small"
                  sx={{
                    color: "#0d6efd",
                    background: "#e3f2fd",
                    width: 34,
                    height: 34,
                    "&:hover": { background: "#bbdefb" },
                    "&.Mui-disabled": { color: "#9ca3af", background: "#f3f4f6" },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </div>
          {selectedCustomer && docketsLoaded && billingRows.length === 0 && (
            <div
              style={{
                padding: "16px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#6b7280",
                background: "#fff",
                border: "1px solid #dfeaf8",
                borderTop: "none",
              }}
            >
              {isDebitNote
                ? `No billed delivered dockets found for ${selectedCustomer.bp_name}`
                : `No unbilled delivered dockets found for ${selectedCustomer.bp_name}`}
              {selectedLocCode ? ` with payment location ${selectedLocCode}` : ""}.
              {isDebitNote
                ? " Debit Note lists dockets that already have a bill prepared."
                : " Regular billing lists dockets that are delivered and not yet billed."}
            </div>
          )}
          <DataTable
            columns={tableColumns}
            rows={sortDocketsByNo(billingRows)}
            getKey={(row) => row.id || row.docket_no}
            checkboxSelection
            dense
            rowHeight={26}
            headerHeight={42}
            // autoHeight
            scroll={{ afterRows: 10, horizontal: true }}
            editable={!isViewOnly}
            singleClick
            onRowUpdate={isViewOnly ? undefined : handleRowUpdate}
            isHeight={320}
            rowSelectionModel={selectionIds}
            onRowSelectionModelChange={handleRowSelectionModelChange}
            isRowSelectable={isViewOnly ? () => false : undefined}
            selectedRowColor="#dcfce7"
            footer={selectedRows.length > 0 ? <BillGridTotalRow totals={totals} /> : null}
          />
        </div>

        <div style={bottomSectionStyle}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Invoice Remarks"
              name="invoice_remarks"
              form={form}
              setForm={handleSetForm}
              disabled={isViewOnly}
            />
          </div>
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading Customer Bill..." />
        </div>
      </PageBody>
    </MainLayout>
  );
}

const sectionWrap = {
  border: "1px solid #dfeaf8",
  background: "#fff",
  marginBottom: 14,
  overflow: "hidden",
};

const sectionTitleStyle = {
  background: "#dfeeff",
  borderBottom: "1px solid #dfeaf8",
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#0d6efd",
  lineHeight: 1.3,
};

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px 14px",
  padding: "14px 16px 16px",
  alignItems: "start",
  background: "#f8fafc",
};

const fieldCellStyle = {
  minWidth: 0,
};

const bottomSectionStyle = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "18px",
  padding: "18px 14px 12px",
  background: "#f9fbff",
  borderTop: "1px solid #e5edf8",
  marginTop: 12,
};

const tableTitleStyle = {
  background: "#f9fbff",
  border: "1px solid #dfeaf8",
  borderBottom: "none",
  padding: "10px 14px",
  fontWeight: 700,
  color: "#0d6efd",
  fontSize: 12,
  lineHeight: 1.3,
};

const totalRowStyle = {
  display: "flex",
  flexWrap: "nowrap",
  width: "max-content",
  background: "#f5f0d6",
  border: "1px solid #dfeaf8",
  borderTop: "none",
  fontWeight: 700,
  color: "#1f2937",
  minHeight: 30,
  boxSizing: "border-box",
};

const totalCellStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRight: "1px solid #dfeaf8",
  padding: "4px 4px",
  boxSizing: "border-box",
  fontSize: 13,
  fontWeight: 700,
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  height: "18px",
  borderRadius: "4px",
  fontSize: 10,
  fontWeight: 700,
  padding: "0 8px",
};

const yesBadge = {
  background: "#e8f5e9",
  color: "#1b5e20",
  border: "1px solid #a5d6a7",
};

const noBadge = {
  background: "#ffe7e7",
  color: "#b91c1c",
  border: "1px solid #f7b5b5",
};

const editHeaderButtonStyle = {
  background: "linear-gradient(135deg, #7e22ce, #6b21a8)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "120px",
  padding: "8px 16px",
  "&:hover": { background: "linear-gradient(135deg, #6d28d9, #581c87)" },
};

const saveHeaderButtonStyle = {
  background: "linear-gradient(135deg, #1ca562, #119154)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "120px",
  padding: "8px 16px",
  "&:hover": { background: "linear-gradient(135deg, #169d56, #0f7c4b)" },
};

const printHeaderButtonStyle = {
  background: "linear-gradient(135deg, #1f6feb, #1d4ed8)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "120px",
  padding: "8px 16px",
  "&:hover": { background: "linear-gradient(135deg, #1d5ec9, #1e40af)" },
};

const clearHeaderButtonStyle = {
  background: "linear-gradient(135deg, #8c98ab, #6a7280)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  minWidth: "120px",
  padding: "8px 16px",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(135deg, #7d8898, #4d5666)" },
};

const cancelHeaderButtonStyle = {
  background: "linear-gradient(135deg, #ea580c, #c2410c)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  minWidth: "120px",
  padding: "8px 16px",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(135deg, #d14e0a, #9a3412)" },
};

const deleteHeaderButtonStyle = {
  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  minWidth: "120px",
  padding: "8px 16px",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(135deg, #c81e1e, #991b1b)" },
};
