import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchAllInvoices, fetchInvoiceDetails } from "../../utils/customerBill";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { RefreshIcon, PrintIcon, ExportIcon, CloseIcon, EditIcon, ViewIcon } from "../../components/common/icons";
import { printInvoice, resolveBillToCustomer } from "../../components/common/InvoicePrint";
import { IconButton, Tooltip, Button, TextField, Autocomplete, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import moment from "moment";
import { getDateFormat } from "../../utils/tenantService";
import { formatSac } from "../../utils/sacCodes";

const formatInvoiceNo = (v) => {
  const n = Number(v);
  if (Number.isFinite(n)) return String(Math.trunc(n));
  return String(v ?? "").trim();
};

const isRealBpCode = (v) => {
  const s = String(v ?? "").trim();
  return !!s && s !== "0";
};

const formatCustomer = (inv, partners = []) => {
  const rawCode = String(inv?.bp_code ?? "").trim();
  const name = String(inv?.bp_name ?? "").trim();
  const loc = String(inv?.loc_code ?? "").split(" - ")[0].trim().toUpperCase();
  const norm = (s) => String(s || "").replace(/["']/g, "").trim().toLowerCase();
  const list = Array.isArray(partners) ? partners : [];

  let partner = null;
  if (isRealBpCode(rawCode)) {
    partner = list.find((p) => {
      const grp = String(p.bp_grp_code ?? "").trim();
      const code = String(p.bp_code ?? "").trim();
      return grp === rawCode || code === rawCode;
    }) || null;
  }
  if (!partner && name) {
    const want = norm(name);
    partner = list.find((p) => {
      if (norm(p.bp_name) !== want) return false;
      if (!loc) return true;
      const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
      return !bpLoc || bpLoc === loc;
    }) || list.find((p) => norm(p.bp_name) === want) || null;
  }

  const code = String(partner?.bp_grp_code ?? partner?.bp_code ?? (isRealBpCode(rawCode) ? rawCode : "")).trim();
  const displayName = name || String(partner?.bp_name ?? "").trim();
  return {
    code,
    name: displayName,
    label: code && displayName ? `${code} - ${displayName}` : (displayName || code),
  };
};

const isCancelFlag = (value) => {
  const v = String(value ?? "").trim().toUpperCase();
  return v === "Y" || v === "C" || v === "1" || v === "TRUE";
};

const combinedColumns = [
  { key: "invoice_no", label: "Inv\nNo", minWidth: 72, align: "left", sortComparator: (a, b) => Number(a) - Number(b) },
  { key: "invoice_date", label: "Inv\nDate", minWidth: 78 },
  { key: "bp_name", label: "Customer", minWidth: 240, flex: 2.2, align: "left" },
  { key: "loc_label", label: "Branch", minWidth: 110, align: "left" },
  { key: "invoice_type", label: "Type", minWidth: 56 },
  { key: "sac_label", label: "SAC", minWidth: 88, flex: 0.55, align: "left" },
  { key: "docket_chrwt", label: "Chg\nWt", minWidth: 44 },
  { key: "freight", label: "Frt.", minWidth: 96 },
  { key: "handling", label: "Hand.", minWidth: 68 },
  { key: "fuel_surcharge", label: "Fuel\nChrg", minWidth: 72 },
  { key: "factory_charge", label: "Fact.\nChrg", minWidth: 74 },
  { key: "oda_charge", label: "ODA\nChrg", minWidth: 66 },
  { key: "fov", label: "FOV", minWidth: 58 },
  { key: "stationery", label: "Stnry.", minWidth: 74 },
  { key: "door_collection", label: "Door\nPkp", minWidth: 74 },
  { key: "door_delivery", label: "Door\nDly", minWidth: 74 },
  { key: "taxable_amt", label: "Taxable", minWidth: 100 },
  { key: "cgst", label: "CGST", minWidth: 60 },
  { key: "sgst", label: "SGST", minWidth: 60 },
  { key: "igst", label: "IGST", minWidth: 60 },
  { key: "total_inv_amt", label: "Inv\nAmt", minWidth: 84 },
  { key: "inv_sub_date", label: "Subm.\nDate", minWidth: 78 },
  {
    key: "cancel_flag",
    label: "Cancel",
    minWidth: 64,
    render: (row) => (isCancelFlag(row.cancel_flag) ? "Y" : ""),
  },
];

const invoiceReportGridCss = `
.invoice-report-page .MuiDataGrid-cell,
.invoice-report-page .MuiDataGrid-cell *,
.invoice-report-page .MuiDataGrid-columnHeaderTitle {
  font-size: 11px !important;
  font-weight: 700 !important;
}
.invoice-report-page .MuiDataGrid-cell[data-field="freight"],
.invoice-report-page .MuiDataGrid-cell[data-field="handling"],
.invoice-report-page .MuiDataGrid-cell[data-field="fuel_surcharge"],
.invoice-report-page .MuiDataGrid-cell[data-field="factory_charge"],
.invoice-report-page .MuiDataGrid-cell[data-field="oda_charge"],
.invoice-report-page .MuiDataGrid-cell[data-field="fov"],
.invoice-report-page .MuiDataGrid-cell[data-field="stationery"],
.invoice-report-page .MuiDataGrid-cell[data-field="door_collection"],
.invoice-report-page .MuiDataGrid-cell[data-field="door_delivery"],
.invoice-report-page .MuiDataGrid-cell[data-field="taxable_amt"],
.invoice-report-page .MuiDataGrid-cell[data-field="cgst"],
.invoice-report-page .MuiDataGrid-cell[data-field="sgst"],
.invoice-report-page .MuiDataGrid-cell[data-field="igst"],
.invoice-report-page .MuiDataGrid-cell[data-field="total_inv_amt"],
.invoice-report-page .MuiDataGrid-cell[data-field="freight"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="handling"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="fuel_surcharge"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="factory_charge"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="oda_charge"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="fov"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="stationery"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="door_collection"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="door_delivery"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="taxable_amt"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="cgst"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="sgst"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="igst"] *,
.invoice-report-page .MuiDataGrid-cell[data-field="total_inv_amt"] * {
  font-size: 13px !important;
}
.invoice-report-page .MuiDataGrid-cell {
  padding: 0 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 26px !important;
}
.invoice-report-page .MuiDataGrid-cell > span,
.invoice-report-page .MuiDataGrid-cellContent {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 100%;
  line-height: 1.15 !important;
}
.invoice-report-page .MuiDataGrid-cell--textLeft,
.invoice-report-page .MuiDataGrid-cell--textLeft > span,
.invoice-report-page .MuiDataGrid-cell--textLeft .MuiDataGrid-cellContent {
  justify-content: flex-start !important;
  text-align: left !important;
}
.invoice-report-page .MuiDataGrid-columnHeader--alignLeft .MuiDataGrid-columnHeaderTitle {
  text-align: left !important;
}
.invoice-report-page .MuiDataGrid-row {
  min-height: 26px !important;
  max-height: 26px !important;
}
.invoice-report-page .MuiDataGrid-row.Mui-selected,
.invoice-report-page .MuiDataGrid-row.Mui-selected:nth-of-type(even) {
  background-color: #dcfce7 !important;
}
.invoice-report-page .MuiDataGrid-row.Mui-selected:hover {
  background-color: #bbf7d0 !important;
}
.invoice-report-page .dgt-row-y,
.invoice-report-page .dgt-row-y:nth-of-type(even) {
  background-color: #fecaca !important;
}
.invoice-report-page .dgt-row-y:hover {
  background-color: #fca5a5 !important;
}
.invoice-report-page .dgt-row-y.Mui-selected,
.invoice-report-page .dgt-row-y.Mui-selected:nth-of-type(even),
.invoice-report-page .dgt-row-y.Mui-selected:hover {
  background-color: #fca5a5 !important;
}
.invoice-report-page .MuiDataGrid-columnHeader {
  padding: 0 4px !important;
  height: 48px !important;
}
.invoice-report-page .MuiDataGrid-columnHeaders,
.invoice-report-page .MuiDataGrid-columnHeaderRow {
  min-height: 48px !important;
  max-height: 48px !important;
}
.invoice-report-page .MuiDataGrid-container--top,
.invoice-report-page .MuiDataGrid-topContainer {
  height: 48px !important;
  min-height: 48px !important;
  position: sticky;
  top: 0;
  z-index: 40;
  flex: 0 0 48px;
}
.invoice-report-page .MuiDataGrid-virtualScrollerRenderZone {
  position: relative !important;
  top: 0 !important;
  transform: none !important;
}
.invoice-report-page .MuiDataGrid-columnHeaderTitleContainer,
.invoice-report-page .MuiDataGrid-columnHeaderTitleContainerContent {
  height: 100%;
  justify-content: center;
  align-items: center;
}
.invoice-report-page .MuiDataGrid-columnHeaderTitle {
  white-space: pre-line !important;
  line-height: 1.15 !important;
  overflow: hidden !important;
  text-overflow: clip !important;
  text-align: center !important;
  text-transform: uppercase;
}
.invoice-report-page .dataTableWrapper,
.invoice-report-page .MuiDataGrid-root,
.invoice-report-page .MuiDataGrid-main {
  width: 100% !important;
  max-width: 100% !important;
}
.invoice-report-page .dataTableWrapper,
.invoice-report-page .MuiDataGrid-root {
  min-height: 520px !important;
  height: 520px !important;
  --DataGrid-headerHeight: 48px;
  --DataGrid-headersTotalHeight: 48px;
  --DataGrid-topContainerHeight: 48px;
}
.invoice-report-page .MuiDataGrid-virtualScroller {
  overflow: auto !important;
  scrollbar-width: thin !important;
  scrollbar-color: #93c5fd #e3f2fd;
}
.invoice-report-page .MuiDataGrid-virtualScroller::-webkit-scrollbar {
  display: block !important;
  width: 10px !important;
  height: 10px !important;
}
.invoice-report-page .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb {
  background: #60a5fa;
  border-radius: 8px;
}
.invoice-report-page .MuiDataGrid-virtualScroller::-webkit-scrollbar-track {
  background: #e3f2fd;
}
.invoice-report-page .MuiDataGrid-cellEmpty {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
}
`;

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format(getDateFormat()) : v;
};

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export default function InvoiceReport() {
  const navigate = useNavigate();
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [allGridRows, setAllGridRows] = useState([]);
  const [partners, setPartners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [printAnchor, setPrintAnchor] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [fCust, setFCust] = useState("");
  const [fBranch, setFBranch] = useState("");
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");

  useEffect(() => {
    // Invoice headers are NOT fetched here — loadAllData() (below) does that and
    // also flattens them into grid rows, so fetching them twice was wasteful and
    // left invoicesRaw out of sync with allGridRows.
    fetchAllBusinessPartners().then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllLocations().then((d) => setLocations(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllCompanies().then((d) => { if (Array.isArray(d) && d.length) setCompany(d[0]); }).catch(() => {});
  }, []);

  const lMap = useMemo(() => {
    const m = {};
    (locations || []).forEach((l) => { if (l.loc_code) m[l.loc_code] = l; });
    return m;
  }, [locations]);

  // ── Load all invoice headers + details and flatten into a single grid ──
  const loadAllData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) showLoading();
    try {
      const headers = await fetchAllInvoices();
      const list = Array.isArray(headers) ? headers : [];

      // Fetch details for every invoice in parallel
      const detailPromises = list.map(async (inv) => {
        try {
          const m = moment(inv.invoice_date);
          const apiDate = m.isValid() ? m.format("YYYY-MM-DD") : inv.invoice_date;
          const res = await fetchInvoiceDetails(inv.invoice_no, apiDate, inv.loc_code);
          return { inv, details: Array.isArray(res) ? res : [] };
        } catch {
          return { inv, details: [] };
        }
      });
      const results = await Promise.all(detailPromises);

      // Group: ONE row per invoice, summing all docket lines
      const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
      const rows = [];
      results.forEach(({ inv, details }, index) => {
        const loc = lMap[inv.loc_code] || {};
        const invDate = toDate(inv.invoice_date);
        const customer = formatCustomer(inv, partners);
        const locLabel = loc.loc_name ? `${loc.loc_code} - ${loc.loc_name}` : inv.loc_code || "";
        const typeLabel = inv.invoice_type === "D" || inv.invoice_type === "DN" ? "Debit Note" : inv.invoice_type === "CM" ? "Complimentary" : inv.invoice_type === "R" || inv.invoice_type === "C" ? "Regular" : inv.invoice_type || "";

        const lines = Array.isArray(details) ? details : [];
        const sum = {
          docket_chrwt: 0, freight: 0, handling: 0, fuel_surcharge: 0, factory_charge: 0,
          oda_charge: 0, fov: 0, stationery: 0, door_collection: 0, door_delivery: 0,
          taxable_amt: 0, cgst: 0, sgst: 0, igst: 0, total_amt: 0,
        };
        lines.forEach((d) => {
          sum.docket_chrwt += num(d.docket_chrwt);
          sum.freight += num(d.freight);
          sum.handling += num(d.handling ?? d.loading);
          sum.fuel_surcharge += num(d.fuel_surcharge ?? d.unloading);
          sum.factory_charge += num(d.factory_charge ?? d.detention);
          sum.oda_charge += num(d.oda_charge ?? d.additional_toll);
          sum.fov += num(d.fov ?? d.green_tax);
          sum.stationery += num(d.stationery ?? d.other_charges);
          sum.door_collection += num(d.door_collection);
          sum.door_delivery += num(d.door_delivery);
          sum.taxable_amt += num(d.taxable_amt);
          sum.cgst += num(d.cgst);
          sum.sgst += num(d.sgst);
          sum.igst += num(d.igst);
          sum.total_amt += num(d.total_amt);
        });
        const docketNos = lines.map((d) => d.docket_no).filter(Boolean).join(", ");

        const invoiceNo = formatInvoiceNo(inv.invoice_no);
        rows.push({
          id: inv.record_id != null ? `inv-${inv.record_id}` : `inv-${invoiceNo}-${inv.loc_code || ""}-${index}`,
          invoice_no: invoiceNo,
          invoice_date: invDate,
          bp_name: customer.label,
          bp_code: customer.code,
          loc_code: inv.loc_code || "",
          loc_label: locLabel,
          invoice_type: typeLabel,
          sac_code: inv.sac_code || "",
          sac_label: formatSac(inv.sac_code),
          docket_count: lines.length,
          docket_nos: docketNos,
          docket_chrwt: String(sum.docket_chrwt),
          freight: fmtAmt(sum.freight), handling: fmtAmt(sum.handling), fuel_surcharge: fmtAmt(sum.fuel_surcharge),
          factory_charge: fmtAmt(sum.factory_charge), oda_charge: fmtAmt(sum.oda_charge), fov: fmtAmt(sum.fov), stationery: fmtAmt(sum.stationery),
          door_collection: fmtAmt(sum.door_collection), door_delivery: fmtAmt(sum.door_delivery),
          taxable_amt: fmtAmt(sum.taxable_amt), cgst: fmtAmt(sum.cgst), sgst: fmtAmt(sum.sgst), igst: fmtAmt(sum.igst),
          total_amt: fmtAmt(sum.total_amt),
          total_inv_amt: fmtAmt(inv.total_inv_amt ?? sum.total_amt),
          invoice_date_iso: moment(inv.invoice_date).isValid() ? moment(inv.invoice_date).format("YYYY-MM-DD") : "",
          inv_sub_date: toDate(inv.inv_sub_date),
          is_submitted: !!inv.inv_sub_date,
          cancel_flag: isCancelFlag(inv.cancel_flag) ? "Y" : "",
        });
      });
      rows.sort((a, b) => (Number(a.invoice_no) || 0) - (Number(b.invoice_no) || 0));
      setAllGridRows(rows);
      if (showLoadingSpinner) showSuccess("Data refreshed");
    } catch (e) {
      showError(e.message || "Failed to load invoice data");
    } finally {
      if (showLoadingSpinner) hideLoading();
    }
  };

  useEffect(() => {
    loadAllData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, lMap]);

  const custOpts = useMemo(() => [...new Set((allGridRows).map((r) => r.bp_name).filter(Boolean))].sort(), [allGridRows]);
  const brOpts = useMemo(() => [...new Set((allGridRows).map((r) => r.loc_label).filter(Boolean))].sort(), [allGridRows]);

  const gridRows = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    const fc = fCust.toLowerCase();
    const fb = fBranch.toLowerCase();
    const df = dFrom ? moment(dFrom, "YYYY-MM-DD") : null;
    const dt = dTo ? moment(dTo, "YYYY-MM-DD") : null;
    return allGridRows.filter((row) => {
      if (fc && !String(row.bp_name ?? "").toLowerCase().includes(fc)) return false;
      if (fb && !String(row.loc_label ?? row.loc_code ?? "").toLowerCase().includes(fb)) return false;
      if (df || dt) {
        const rd = moment(row.invoice_date, getDateFormat());
        if (rd.isValid()) {
          if (df && rd.isBefore(df, "day")) return false;
          if (dt && rd.isAfter(dt, "day")) return false;
        }
      }
      if (q && !["invoice_no","bp_name","bp_code","loc_label","loc_code","invoice_type","sac_label","sac_code","docket_nos","inv_sub_date","cancel_flag"]
        .some((k) => String(row[k] ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allGridRows, searchText, fCust, fBranch, dFrom, dTo]);

  const refresh = () => {
    setSelectedRow(null);
    loadAllData(true);
  };

  const onSelect = (sm) => {
    const ids = [...(sm?.ids ?? sm ?? [])];
    setSelectedRow(ids.length ? gridRows.find((r) => r.id === ids[ids.length - 1]) || null : null);
  };

  const clearFilters = () => {
    setSearchText(""); setFCust(""); setFBranch(""); setDFrom(""); setDTo(""); setSelectedRow(null);
  };

  const exportCsv = () => {
    if (!gridRows.length) { showError("No data to export"); return; }
    const heads = combinedColumns.map((c) => c.label);
    const rows = gridRows.map((r) => combinedColumns.map((c) => r[c.key]));
    const csv = [heads, ...rows].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice_report_${moment().format("YYYYMMDD_HHmmss")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); showSuccess("Export started");
  };

  const openInvoiceForEdit = (row) => {
    if (!row) { showError("Please select an invoice"); return; }
    const apiDate = row.invoice_date_iso
      || (moment(row.invoice_date, getDateFormat()).isValid()
        ? moment(row.invoice_date, getDateFormat()).format("YYYY-MM-DD")
        : row.invoice_date);
    navigate("/transaction/customer-bill", {
      state: {
        editInvoice: {
          invoice_no: row.invoice_no,
          invoice_date: apiDate,
          loc_code: row.loc_code,
        },
      },
    });
  };

  const handlePrint = async (withDetails) => {
    if (!selectedRow) { showError("Please select an invoice to print"); return; }
    try {
      showLoading();
      const inv = selectedRow;
      const m = moment(inv.invoice_date, getDateFormat());
      const apiDate = inv.invoice_date_iso
        || (m.isValid() ? m.format("YYYY-MM-DD") : inv.invoice_date);
      const res = await fetchInvoiceDetails(inv.invoice_no, apiDate, inv.loc_code);
      const customer = resolveBillToCustomer(
        { bp_code: inv.bp_code, bp_name: inv.bp_name, loc_code: inv.loc_code },
        partners
      );
      printInvoice({
        invoice: {
          invoice_no: inv.invoice_no,
          invoice_date: inv.invoice_date,
          bp_name: customer?.bp_name || inv.bp_name,
          bp_code: customer?.bp_grp_code || customer?.bp_code || inv.bp_code || "",
          bp_address: customer?.bp_addres || customer?.bp_address || "",
          bp_city: customer?.bp_city || "",
          bp_state: customer?.bp_state || "",
          bp_pincode: customer?.bp_pincode || "",
          bp_gstin: customer?.bp_gstin || "",
          bp_phone: customer?.bp_mobile1 || customer?.bp_mobile2 || "",
          loc_code: inv.loc_code,
          loc_label: inv.loc_label || inv.loc_code,
          invoice_type: inv.invoice_type,
          sac_code: inv.sac_code,
          sac_label: inv.sac_label || formatSac(inv.sac_code),
          total_inv_amt: inv.total_inv_amt,
        },
        details: withDetails ? (Array.isArray(res) ? res : []) : [],
        company,
        locationsMap: lMap,
        customer,
        partners,
      });
    } catch (e) { showError(e.message || "Print failed"); }
    finally { hideLoading(); }
  };

  return (
    <MainLayout>
      <PageBody title="Invoice Report">
        <style>{invoiceReportGridCss}</style>
        <div className="invoice-report-page">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} size="small" sx={{ color: "#0d6efd", "&:hover": { background: "#e3f2fd" } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <TextField
              size="small"
              placeholder="Search invoice, docket, customer..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setSelectedRow(null); }}
              sx={{
                flex: "1 1 180px",
                minWidth: 160,
                "& .MuiInputBase-input": { fontSize: 13 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" },
              }}
            />

            <Autocomplete
              size="small"
              options={custOpts}
              value={fCust || null}
              onChange={(_, v) => { setFCust(v || ""); setSelectedRow(null); }}
              slotProps={{
                popupIndicator: { sx: { padding: "1px", minWidth: 16, width: 16, "& .MuiSvgIcon-root": { fontSize: 11 } } },
                clearIndicator: { sx: { display: "none" } },
                paper: { sx: {
                  "& .MuiAutocomplete-option": { fontSize: 13, minHeight: "32px !important", padding: "4px 10px" },
                  "& .MuiAutocomplete-listbox": {
                    scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": { width: "1px" },
                    "&::-webkit-scrollbar-thumb": { background: "rgba(13,110,253,0.9)", borderRadius: "999px" },
                    "&::-webkit-scrollbar-track": { background: "#e3f2fd" },
                  },
                } },
              }}
              sx={{ flex: "1 1 150px", minWidth: 140 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Customer" sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )}
            />

            <Autocomplete
              size="small"
              options={brOpts}
              value={fBranch || null}
              onChange={(_, v) => { setFBranch(v || ""); setSelectedRow(null); }}
              slotProps={{
                popupIndicator: { sx: { padding: "1px", minWidth: 16, width: 16, "& .MuiSvgIcon-root": { fontSize: 11 } } },
                clearIndicator: { sx: { display: "none" } },
                paper: { sx: {
                  "& .MuiAutocomplete-option": { fontSize: 13, minHeight: "32px !important", padding: "4px 10px" },
                  "& .MuiAutocomplete-listbox": {
                    scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": { width: "1px" },
                    "&::-webkit-scrollbar-thumb": { background: "rgba(13,110,253,0.9)", borderRadius: "999px" },
                    "&::-webkit-scrollbar-track": { background: "#e3f2fd" },
                  },
                } },
              }}
              sx={{ flex: "1 1 150px", minWidth: 140 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Branch" sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )}
            />

            <div style={{
              position: "relative",
              display: "flex", alignItems: "center",
              border: "1.5px solid #90caf9", borderRadius: 6,
              padding: "4px 8px", background: "#fff", flex: "1 1 240px", minWidth: 220,
            }}>
              <span style={{
                position: "absolute", top: -9, left: 8,
                background: "#fff", padding: "0 4px",
                fontSize: 11, fontWeight: 600, color: "#0d6efd",
                letterSpacing: "0.3px", lineHeight: 1, whiteSpace: "nowrap",
              }}>Invoice Date Range</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                <input
                  type="date"
                  value={dFrom}
                  onChange={(e) => { setDFrom(e.target.value); setSelectedRow(null); }}
                  style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }}
                />
                <span style={{ fontSize: 12, color: "#0d6efd", fontWeight: 700, padding: "0 2px" }}>→</span>
                <input
                  type="date"
                  value={dTo}
                  onChange={(e) => { setDTo(e.target.value); setSelectedRow(null); }}
                  style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }}
                />
                {(dFrom || dTo) && (
                  <span
                    onClick={() => { setDFrom(""); setDTo(""); setSelectedRow(null); }}
                    style={{ cursor: "pointer", fontSize: 14, color: "#9ca3af", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                  >×</span>
                )}
              </div>
            </div>

            {(searchText.trim() || fCust || fBranch || dFrom || dTo) && (
              <Tooltip title="Clear Filters">
                <IconButton onClick={clearFilters} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}

            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minWidth: 52, padding: "4px 12px",
              background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9",
              lineHeight: 1.2,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0d6efd" }}>{gridRows.length}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#1976d2", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {(searchText.trim() || fCust || fBranch || dFrom || dTo) ? "filtered" : "lines"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="contained"
              startIcon={selectedRow?.inv_sub_date || isCancelFlag(selectedRow?.cancel_flag) ? <ViewIcon /> : <EditIcon />}
              onClick={() => openInvoiceForEdit(selectedRow)}
              sx={{
                background: selectedRow?.inv_sub_date || isCancelFlag(selectedRow?.cancel_flag)
                  ? "linear-gradient(135deg, #475569, #334155)"
                  : "linear-gradient(135deg, #7e22ce, #6b21a8)",
                "&:hover": {
                  background: selectedRow?.inv_sub_date || isCancelFlag(selectedRow?.cancel_flag)
                    ? "linear-gradient(135deg, #334155, #1e293b)"
                    : "linear-gradient(135deg, #6d28d9, #581c87)",
                },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              {selectedRow?.inv_sub_date || isCancelFlag(selectedRow?.cancel_flag) ? "View" : "Edit"}
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowDropDownIcon />}
              startIcon={<PrintIcon />}
              onClick={(e) => setPrintAnchor(e.currentTarget)}
              sx={{
                background: "linear-gradient(135deg, #1f6feb, #1d4ed8)",
                "&:hover": { background: "linear-gradient(135deg, #1d5ec9, #1e40af)" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Print
            </Button>
            <Menu
              anchorEl={printAnchor}
              open={Boolean(printAnchor)}
              onClose={() => setPrintAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(true); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print with Details</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(false); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 13 }}>Print Summary Only</ListItemText>
              </MenuItem>
            </Menu>
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={exportCsv}
              sx={{
                background: "linear-gradient(135deg, #1ca562, #119154)",
                "&:hover": { background: "linear-gradient(135deg, #169d56, #0f7c4b)" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Export
            </Button>
          </div>
        </div>

        {selectedRow ? (
          <div style={{ marginTop: 10, padding: "8px 14px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: "#0d6efd" }}>INV: {selectedRow.invoice_no}</strong>
            <span>{selectedRow.bp_name || "—"} → {selectedRow.loc_label || selectedRow.loc_code || "—"}</span>
            <span>{selectedRow.invoice_date}</span>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>₹ {selectedRow.total_inv_amt}</span>
            {isCancelFlag(selectedRow.cancel_flag) ? (
              <span style={{ background: "#fecaca", color: "#991b1b", padding: "2px 10px", borderRadius: 12, fontWeight: 700 }}>Cancelled</span>
            ) : null}
          </div>
        ) : (
          <div style={{ marginTop: 10, padding: "7px 14px", background: "#f9fafb", borderRadius: 8, border: "1.5px dashed #d1d5db", fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            No invoice selected — click a row to select
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <DataTable columns={combinedColumns} rows={gridRows}
            getKey={(r, i) => r.id || i}
            actions={[
              {
                label: "Edit",
                icon: <EditIcon />,
                onClick: (row) => openInvoiceForEdit(row),
              },
            ]}
            actionsPosition="left"
            compact
            rowsPerPage={50}
            autoHeight
            scroll={{ afterRows: 25, horizontal: true }}
            checkboxSelection
            disableMultipleRowSelection
            selectedRowColor="#dcfce7"
            statusKey="cancel_flag"
            rowColors={{ Y: "#fecaca" }}
            onRowSelectionModelChange={onSelect} />
        </div>
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading invoice data..." />
      </PageBody>
    </MainLayout>
  );
}

