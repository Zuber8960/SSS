import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  fetchCustomerMisData,
  fetchCustomerMisSummary,
  fetchCustomerMisCustomers,
  fetchCustomerMisDateRange,
} from "../../utils/customerMis";
import { RefreshIcon, ExportIcon } from "../../components/common/icons";
import {
  IconButton,
  Tooltip,
  TextField,
  Autocomplete,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import moment from "moment";

const PURPLE = "#7e22ce";
const PURPLE_SOFT = "#f3e8ff";
const PURPLE_LINE = "#d8b4fe";

// Shared sx for the compact filter inputs (matches the other reports).
const filterSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE_LINE },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: PURPLE },
};

const autocompletePaper = {
  "& .MuiAutocomplete-option": { fontSize: 13, minHeight: "32px !important", padding: "4px 10px" },
  "& .MuiAutocomplete-listbox": {
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": { width: "1px" },
    "&::-webkit-scrollbar-thumb": { background: "rgba(168,85,247,0.9)", borderRadius: "999px" },
    "&::-webkit-scrollbar-track": { background: "#f3e8ff" },
  },
};

const autocompleteSlots = {
  popupIndicator: { sx: { padding: "1px", minWidth: 16, width: 16, "& .MuiSvgIcon-root": { fontSize: 11 } } },
  clearIndicator: { sx: { display: "none" } },
  paper: { sx: autocompletePaper },
};

// ISO date / DB value → DD-MM-YYYY for display, matching the other reports.
const fmtDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("DD-MM-YYYY") : String(v);
};

// Turn the delivery status text into a readable badge.
const statusStyle = (raw) => {
  const s = String(raw || "").trim().toUpperCase();
  if (!s || s === "PENDING" || s === "IN TRANSIT" || s === "INTRNS")
    return { label: "IN TRANSIT", bg: "#e3f2fd", fg: "#0d6efd", border: "#90caf9" };
  if (s.includes("CANCEL") || s.includes("CENCEL") || s.includes("CNCL"))
    return { label: "CANCELLED", bg: "#fee2e2", fg: "#b91c1c", border: "#f7b5b5" };
  if (s.includes("DELIVER") || s.includes("DELVR"))
    return { label: "DELIVERED", bg: "#e8f5e9", fg: "#1b5e20", border: "#a5d6a7" };
  return { label: s, bg: "#fff7ed", fg: "#9a3412", border: "#fdba74" };
};

const StatusBadge = ({ raw }) => {
  const st = statusStyle(raw);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "78px",
        height: "22px",
        borderRadius: "4px",
        fontSize: 11,
        fontWeight: 700,
        padding: "0 8px",
        background: st.bg,
        color: st.fg,
        border: `1px solid ${st.border}`,
      }}
    >
      {st.label}
    </span>
  );
};

const columns = [
  { key: "docket_no", label: "LR No", minWidth: 150 },
  { key: "docket_date", label: "LR Date", minWidth: 100 },
  { key: "bp_name", label: "Customer Name", minWidth: 240 },
  { key: "bp_gstin", label: "Customer GSTIN", minWidth: 150 },
  { key: "docket_inv_no", label: "Invoice No", minWidth: 150 },
  { key: "from_place", label: "From", minWidth: 130 },
  { key: "to_place", label: "To", minWidth: 140 },
  { key: "from_town", label: "From Town", minWidth: 130 },
  { key: "to_town", label: "To Town", minWidth: 140 },
  { key: "docket_tot_pkgs", label: "Pkt", minWidth: 70 },
  { key: "docket_chrg_wt", label: "Charge Wt", minWidth: 100 },
  { key: "docket_act_wt", label: "Actual Wt", minWidth: 100 },
  { key: "docket_rate", label: "Rate", minWidth: 80 },
  { key: "docket_rate_uom", label: "UOM", minWidth: 80 },
  { key: "docket_tot_amt", label: "Amount", minWidth: 110 },
  { key: "docket_load_type", label: "Load Type", minWidth: 100 },
  { key: "docket_transit_type", label: "Transit Type", minWidth: 110 },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 100 },
  { key: "delivery_status", label: "Delivery Status", minWidth: 130, render: (r) => <StatusBadge raw={r.delivery_status} /> },
  { key: "actual_delivery_date", label: "Actual Delivery", minWidth: 120 },
  { key: "delay_days", label: "Delay (Days)", minWidth: 100 },
  { key: "ewb_no", label: "EWB No", minWidth: 200 },
  { key: "delivery_remarks", label: "Delivery Remarks", minWidth: 160 },
  { key: "docket_remark", label: "Remark", minWidth: 150 },
];

export default function CustomerMIS() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [allRows, setAllRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dateBounds, setDateBounds] = useState({ min_date: null, max_date: null });
  const [summary, setSummary] = useState({
    total_shipments: 0,
    total_amount: 0,
    total_charge_wt: 0,
    total_packages: 0,
    distinct_customers: 0,
  });

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customer, setCustomer] = useState(null); // { bp_id, bp_name, bp_gstin } | null
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState(null);

  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilters, setActiveFilters] = useState(() => {
    const saved = localStorage.getItem("customerMisFilters");
    return saved
      ? JSON.parse(saved)
      : { search: true, customer: true, dateRange: true, status: false };
  });

  // Debounce the free-text box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  // The filter set sent to the API.
  const queryFilters = useMemo(() => ({
    from_date: dateFrom || null,
    to_date: dateTo || null,
    bp_id: customer?.bp_id || null,
    search: activeFilters.search ? debouncedSearch || null : null,
  }), [dateFrom, dateTo, customer, debouncedSearch, activeFilters.search]);

  // Fetch rows + summary whenever the filters change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        showLoading();
        const [rows, totals] = await Promise.all([
          fetchCustomerMisData(queryFilters),
          fetchCustomerMisSummary(queryFilters),
        ]);
        if (cancelled) return;
        setAllRows(Array.isArray(rows) ? rows : []);
        setSummary(totals);
      } catch (err) {
        if (cancelled) return;
        showError(err.message || "Failed to load Customer MIS data");
        console.error("Customer MIS load error:", err);
      } finally {
        if (!cancelled) hideLoading();
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFilters]);

  // Customers for the dropdown + the min/max LR date, loaded once.
  useEffect(() => {
    fetchCustomerMisCustomers()
      .then((c) => setCustomers(Array.isArray(c) ? c : []))
      .catch((err) => console.error("Failed to load MIS customers:", err));
    fetchCustomerMisDateRange()
      .then(setDateBounds)
      .catch((err) => console.error("Failed to load MIS date range:", err));
  }, []);

  // Format the two date columns for display.
  const mappedRows = useMemo(
    () =>
      allRows.map((r) => ({
        ...r,
        docket_date: fmtDate(r.docket_date),
        actual_delivery_date: fmtDate(r.actual_delivery_date),
      })),
    [allRows]
  );

  const statusOptions = useMemo(() => {
    const set = new Set();
    mappedRows.forEach((r) => set.add(statusStyle(r.delivery_status).label));
    return [...set].sort();
  }, [mappedRows]);

  // Status badge labels are derived client-side, so the label filter is applied
  // here rather than in SQL.
  const gridRows = useMemo(() => {
    if (!activeFilters.status || !status) return mappedRows;
    return mappedRows.filter((r) => statusStyle(r.delivery_status).label === status);
  }, [mappedRows, status, activeFilters.status]);

  // Delivered count follows the (client-side) status filter.
  const deliveredCount = useMemo(
    () => gridRows.filter((r) => statusStyle(r.delivery_status).label === "DELIVERED").length,
    [gridRows]
  );

  const handleFilterToggle = (key) => {
    const updated = { ...activeFilters, [key]: !activeFilters[key] };
    setActiveFilters(updated);
    localStorage.setItem("customerMisFilters", JSON.stringify(updated));
  };

  const handleClearFilters = () => {
    setSearchText("");
    setCustomer(null);
    setDateFrom("");
    setDateTo("");
    setStatus(null);
  };

  const handleRefresh = async () => {
    try {
      showLoading();
      const [rows, totals] = await Promise.all([
        fetchCustomerMisData(queryFilters),
        fetchCustomerMisSummary(queryFilters),
      ]);
      setAllRows(Array.isArray(rows) ? rows : []);
      setSummary(totals);
    } catch (err) {
      showError(err.message || "Failed to refresh Customer MIS data");
    } finally {
      hideLoading();
    }
  };

  const hasFilters = Boolean(searchText.trim() || customer || dateFrom || dateTo || status);

  const exportCsv = () => {
    if (!gridRows.length) {
      showError("No data to export");
      return;
    }
    const heads = columns.map((c) => c.label);
    const body = gridRows.map((r) =>
      columns.map((c) => (c.key === "delivery_status" ? statusStyle(r.delivery_status).label : r[c.key]))
    );
    const csv = [heads, ...body]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_mis_${moment().format("YYYYMMDD_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess("Export started");
  };
  const filterCheck = (key, label) => (
    <MenuItem key={key}>
      <FormControlLabel
        control={<Checkbox size="small" checked={activeFilters[key]} onChange={() => handleFilterToggle(key)} />}
        label={label}
      />
    </MenuItem>
  );

  return (
    <MainLayout>
      <PageBody title="Customer MIS">
        {/* ── Toolbar ── */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} size="small" sx={{ color: PURPLE, "&:hover": { background: PURPLE_SOFT } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Filter Options">
              <IconButton
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                size="small"
                sx={{
                  color: PURPLE,
                  border: `1.5px solid ${PURPLE_LINE}`,
                  borderRadius: 2,
                  padding: "6px",
                  "&:hover": { background: PURPLE_SOFT },
                }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              {filterCheck("search", "Search")}
              {filterCheck("customer", "Customer (Name / Code)")}
              {filterCheck("dateRange", "LR Date Range")}
              {filterCheck("status", "Shipment Status")}
            </Menu>

            {activeFilters.search && (
              <TextField
                size="small"
                placeholder="Search customer, LR no, invoice, route..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: PURPLE, fontSize: 17 }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchText ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchText("")} sx={{ padding: "2px" }}>
                          <ClearIcon fontSize="small" sx={{ fontSize: 15, color: "#9ca3af" }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{ ...filterSx, flex: "1 1 220px", minWidth: 180 }}
              />
            )}
            {/* Customer dropdown — searchable on both name and code */}
            {activeFilters.customer && (
              <Autocomplete
                size="small"
                options={customers}
                value={customer}
                onChange={(_, val) => setCustomer(val)}
                getOptionLabel={(opt) => (opt ? opt.bp_name || "" : "")}
                filterOptions={(opts, state) => {
                  const input = state.inputValue.toLowerCase();
                  return opts.filter(
                    (o) =>
                      String(o.bp_name ?? "").toLowerCase().includes(input) ||
                      String(o.bp_gstin ?? "").toLowerCase().includes(input)
                  );
                }}
                isOptionEqualToValue={(opt, val) => opt?.bp_id === val?.bp_id}
                slotProps={{
                  ...autocompleteSlots,
                  paper: { sx: { ...autocompletePaper, maxHeight: 320 } },
                }}
                renderOption={(props, opt) => (
                  <li {...props} key={opt.bp_id}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: PURPLE,
                        background: PURPLE_SOFT,
                        border: `1px solid ${PURPLE_LINE}`,
                        borderRadius: 4,
                        padding: "1px 6px",
                        minWidth: 76,
                        textAlign: "center",
                        flexShrink: 0,
                        marginRight: 8,
                      }}
                    >
                      {opt.bp_gstin || "—"}
                    </span>
                    <span style={{ fontSize: 13 }}>{opt.bp_name}</span>
                  </li>
                )}
                sx={{ flex: "1 1 260px", minWidth: 220 }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Customer (Name / Code)" sx={filterSx} />
                )}
              />
            )}
            {/* LR Date From / To */}
            {activeFilters.dateRange && (
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  border: "1.5px solid #c4b5fd",
                  borderRadius: 6,
                  padding: "4px 8px",
                  background: "#fff",
                  flex: "1 1 250px",
                  minWidth: 230,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -9,
                    left: 8,
                    background: "#fff",
                    padding: "0 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: PURPLE,
                    letterSpacing: "0.3px",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  LR Date Range
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                  <input
                    type="date"
                    value={dateFrom}
                    min={dateBounds.min_date || undefined}
                    max={dateBounds.max_date || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }}
                  />
                  <span style={{ fontSize: 12, color: PURPLE, fontWeight: 700, padding: "0 2px" }}>→</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateBounds.min_date || undefined}
                    max={dateBounds.max_date || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }}
                  />
                  {(dateFrom || dateTo) && (
                    <span
                      onClick={() => { setDateFrom(""); setDateTo(""); }}
                      style={{ cursor: "pointer", fontSize: 14, color: "#9ca3af", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                    >
                      ×
                    </span>
                  )}
                </div>
              </div>
            )}
            {activeFilters.status && (
              <Autocomplete
                size="small"
                options={statusOptions}
                value={status || null}
                onChange={(_, val) => setStatus(val || null)}
                slotProps={autocompleteSlots}
                sx={{ flex: "1 1 150px", minWidth: 140 }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Shipment Status" sx={filterSx} />
                )}
              />
            )}

            {hasFilters && (
              <Tooltip title="Clear Filters">
                <IconButton
                  onClick={handleClearFilters}
                  size="small"
                  sx={{
                    color: "#b91c1c",
                    border: "1.5px solid #f7b5b5",
                    borderRadius: 2,
                    padding: "6px",
                    "&:hover": { background: "#fee2e2" },
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Filtered / total counter */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 52,
                padding: "4px 12px",
                background: PURPLE_SOFT,
                borderRadius: 8,
                border: `1.5px solid ${PURPLE_LINE}`,
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: PURPLE }}>{gridRows.length}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {hasFilters ? "filtered" : "shipments"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tooltip title="Export CSV">
              <IconButton
                onClick={exportCsv}
                size="small"
                sx={{
                  color: "#1ca562",
                  border: "1.5px solid #a7f3d0",
                  borderRadius: 2,
                  padding: "6px",
                  "&:hover": { background: "#ecfdf5" },
                }}
              >
                <ExportIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
        {/* ── Summary strip (totals from the API for the active filters) ── */}
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ padding: "6px 14px", background: "#e8f5e9", borderRadius: 8, border: "1.5px solid #a5d6a7", fontSize: 13 }}>
            Delivered: <strong style={{ color: "#1b5e20" }}>{deliveredCount}</strong>
          </div>
          <div style={{ padding: "6px 14px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", fontSize: 13 }}>
            Shipments: <strong style={{ color: "#0d6efd" }}>{summary.total_shipments.toLocaleString("en-IN")}</strong>
          </div>
          <div style={{ padding: "6px 14px", background: "#e0f2fe", borderRadius: 8, border: "1.5px solid #81d4fa", fontSize: 13 }}>
            Charge Wt: <strong style={{ color: "#01579b" }}>{summary.total_charge_wt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ padding: "6px 14px", background: PURPLE_SOFT, borderRadius: 8, border: `1.5px solid ${PURPLE_LINE}`, fontSize: 13 }}>
            Total Amount: <strong style={{ color: PURPLE }}>₹ {summary.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
            LR Date range in data: {dateBounds.min_date ? fmtDate(dateBounds.min_date) : "—"} to {dateBounds.max_date ? fmtDate(dateBounds.max_date) : "—"}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <DataTable
            columns={columns}
            rows={gridRows}
            getKey={(r) => r.rec_id}
            actions={[]}
            autoHeight
            scroll={{ afterRows: 10, horizontal: true }}
          />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading Customer MIS data..." />
      </PageBody>
    </MainLayout>
  );
}