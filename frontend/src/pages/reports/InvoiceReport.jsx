import { useState, useEffect, useMemo } from "react";
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
import { RefreshIcon, PrintIcon, ExportIcon, CloseIcon } from "../../components/common/icons";
import { printInvoice } from "../../components/common/InvoicePrint";
import { IconButton, Tooltip, Button, TextField, Autocomplete, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import moment from "moment";

const combinedColumns = [
  { key: "invoice_no", label: "Invoice No", minWidth: 110 },
  { key: "invoice_date", label: "Invoice Date", minWidth: 100 },
  { key: "bp_name", label: "Customer", minWidth: 140 },
  { key: "loc_label", label: "Branch", minWidth: 100 },
  { key: "invoice_type", label: "Type", minWidth: 90 },
  { key: "inv_sr_no", label: "Sr", minWidth: 50 },
  { key: "docket_no", label: "Docket No", minWidth: 110 },
  { key: "docket_date", label: "Docket Date", minWidth: 100 },
  { key: "docket_from_loc", label: "Origin", minWidth: 90 },
  { key: "docket_to_loc", label: "Destination", minWidth: 100 },
  { key: "docket_chrwt", label: "Chg Wt", minWidth: 80 },
  { key: "freight", label: "Freight", minWidth: 90 },
  { key: "loading", label: "Loading", minWidth: 85 },
  { key: "unloading", label: "Unloading", minWidth: 90 },
  { key: "detention", label: "Detention", minWidth: 90 },
  { key: "additional_toll", label: "Add Toll", minWidth: 90 },
  { key: "green_tax", label: "Green Tax", minWidth: 90 },
  { key: "other_charges", label: "Other Chg", minWidth: 90 },
  { key: "taxable_amt", label: "Taxable", minWidth: 90 },
  { key: "cgst", label: "CGST", minWidth: 80 },
  { key: "sgst", label: "SGST", minWidth: 80 },
  { key: "igst", label: "IGST", minWidth: 80 },
  { key: "total_amt", label: "Total", minWidth: 100 },
  { key: "delivery_status", label: "Delivery", minWidth: 100 },
  {
    key: "pod_flag", label: "POD", minWidth: 70,
    render: (r) => (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "48px", height: "22px", borderRadius: "4px", fontSize: 11, fontWeight: 700, padding: "0 8px",
        ...(r.pod_flag === "Y"
          ? { background: "#e8f5e9", color: "#1b5e20", border: "1px solid #a5d6a7" }
          : { background: "#ffe7e7", color: "#b91c1c", border: "1px solid #f7b5b5" }),
      }}>
        {r.pod_flag === "Y" ? "YES" : "NO"}
      </span>
    ),
  },
  { key: "total_inv_amt", label: "Inv Amount", minWidth: 100 },
  { key: "created_by", label: "Created By", minWidth: 90 },
];

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("DD-MM-YYYY") : v;
};

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const fmtNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? String(n) : "0";
};

export default function InvoiceReport() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [invoicesRaw, setInvoicesRaw] = useState([]);
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
    fetchAllInvoices().then((d) => setInvoicesRaw(Array.isArray(d) ? d : [])).catch((e) => showError(e.message || "Failed to fetch invoices"));
    fetchAllBusinessPartners().then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllLocations().then((d) => setLocations(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllCompanies().then((d) => { if (Array.isArray(d) && d.length) setCompany(d[0]); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pMap = useMemo(() => {
    const m = {};
    (partners || []).forEach((p) => { if (p.bp_code) m[p.bp_code] = p; });
    return m;
  }, [partners]);

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
      setInvoicesRaw(list);

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

      // Flatten: one row per docket detail line, with header info repeated
      const rows = [];
      results.forEach(({ inv, details }) => {
        const p = pMap[inv.bp_code] || {};
        const loc = lMap[inv.loc_code] || {};
        const invDate = toDate(inv.invoice_date);
        const bpName = inv.bp_name || p.bp_name || "";
        const locLabel = loc.loc_name ? `${loc.loc_code} - ${loc.loc_name}` : inv.loc_code || "";
        const typeLabel = inv.invoice_type === "CM" ? "Complimentary" : inv.invoice_type === "C" ? "Regular" : inv.invoice_type || "";
        const invAmt = fmtAmt(inv.total_inv_amt);

        if (!details.length) {
          // Invoice with no details - show header row only
          rows.push({
            id: inv.invoice_no + "_" + (inv.invoice_date || "") + "_hdr_" + rows.length,
            invoice_no: inv.invoice_no || "",
            invoice_date: invDate,
            bp_name: bpName,
            loc_code: inv.loc_code || "",
            loc_label: locLabel,
            invoice_type: typeLabel,
            inv_sr_no: "",
            docket_no: "",
            docket_date: "",
            docket_from_loc: "",
            docket_to_loc: "",
            docket_chrwt: "",
            freight: "", loading: "", unloading: "", detention: "", additional_toll: "", green_tax: "", other_charges: "",
            taxable_amt: "", cgst: "", sgst: "", igst: "", total_amt: "",
            delivery_status: "", pod_flag: "N",
            total_inv_amt: invAmt,
            created_by: inv.created_by || "",
          });
        } else {
          details.forEach((d, i) => {
            rows.push({
              ...d,
              id: inv.invoice_no + "_" + (inv.invoice_date || "") + "_" + (d.docket_no || i) + "_" + rows.length,
              invoice_no: inv.invoice_no || "",
              invoice_date: invDate,
              bp_name: bpName,
              loc_code: inv.loc_code || "",
              loc_label: locLabel,
              invoice_type: typeLabel,
              inv_sr_no: d.inv_sr_no ?? i + 1,
              docket_no: d.docket_no || "",
              docket_date: toDate(d.docket_date),
              docket_from_loc: d.docket_from_loc || "",
              docket_to_loc: d.docket_to_loc || "",
              docket_chrwt: fmtNum(d.docket_chrwt),
              freight: fmtAmt(d.freight), loading: fmtAmt(d.loading), unloading: fmtAmt(d.unloading),
              detention: fmtAmt(d.detention), additional_toll: fmtAmt(d.additional_toll), green_tax: fmtAmt(d.green_tax), other_charges: fmtAmt(d.other_charges),
              taxable_amt: fmtAmt(d.taxable_amt), cgst: fmtAmt(d.cgst), sgst: fmtAmt(d.sgst), igst: fmtAmt(d.igst),
              total_amt: fmtAmt(d.total_amt),
              delivery_status: d.delivery_status || "Pending",
              pod_flag: d.pod_flag || "N",
              total_inv_amt: invAmt,
              created_by: inv.created_by || "",
            });
          });
        }
      });
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
  }, [pMap, lMap]);

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
        const rd = moment(row.invoice_date, "DD-MM-YYYY");
        if (rd.isValid()) {
          if (df && rd.isBefore(df, "day")) return false;
          if (dt && rd.isAfter(dt, "day")) return false;
        }
      }
      if (q && !["invoice_no","bp_name","loc_label","loc_code","invoice_type","docket_no","docket_from_loc","docket_to_loc","delivery_status","created_by"]
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

  const handlePrint = async (withDetails) => {
    if (!selectedRow) { showError("Please select an invoice to print"); return; }
    try {
      showLoading();
      const inv = selectedRow;
      const m = moment(inv.invoice_date, "DD-MM-YYYY");
      const apiDate = m.isValid() ? m.format("YYYY-MM-DD") : inv.invoice_date;
      const res = await fetchInvoiceDetails(inv.invoice_no, apiDate, inv.loc_code);
      printInvoice({
        invoice: {
          invoice_no: inv.invoice_no,
          invoice_date: inv.invoice_date,
          bp_name: inv.bp_name,
          bp_code: inv.bp_code || "",
          loc_code: inv.loc_code,
          loc_label: inv.loc_label || inv.loc_code,
          invoice_type: inv.invoice_type,
          total_inv_amt: inv.total_inv_amt,
        },
        details: withDetails ? (Array.isArray(res) ? res : []) : [],
        company,
        locationsMap: lMap,
      });
    } catch (e) { showError(e.message || "Print failed"); }
    finally { hideLoading(); }
  };

  return (
    <MainLayout>
      <PageBody title="Invoice Report">
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
          </div>
        ) : (
          <div style={{ marginTop: 10, padding: "7px 14px", background: "#f9fafb", borderRadius: 8, border: "1.5px dashed #d1d5db", fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            No invoice selected — click a row to select
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <DataTable columns={combinedColumns} rows={gridRows}
            getKey={(r, i) => r.id || i}
            actions={[]} autoHeight scroll={{ afterRows: 10, horizontal: true }}
            checkboxSelection disableMultipleRowSelection onRowSelectionModelChange={onSelect} />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading invoice data..." />
      </PageBody>
    </MainLayout>
  );
}

