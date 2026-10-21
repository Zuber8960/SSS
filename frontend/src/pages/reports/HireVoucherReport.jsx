import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllHireVouchers } from "../../utils/hireVoucher";
import { fetchAllLocations } from "../../utils/locationMaster";
import { hireVoucherReportColumns, mapHireVoucherRow, buildHireVoucherTotalRow, filterHireVoucherRows, exportHireVouchersExcel } from "../../utils/hireVoucherList";
import { RefreshIcon, ExportIcon, CloseIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Button, TextField, Autocomplete } from "@mui/material";
import moment from "moment";
import { getDateFormat } from "../../utils/tenantService";

export default function HireVoucherReport() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();

  const [raw, setRaw] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [fFromLoc, setFFromLoc] = useState("");
  const [fToLoc, setFToLoc] = useState("");
  const [fStatus, setFStatus] = useState("Both");
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");
  const [gridFiltered, setGridFiltered] = useState(null);

  const load = () => {
    fetchAllHireVouchers()
      .then((d) => setRaw(Array.isArray(d) ? d : []))
      .catch((e) => showError(e.message || "Failed to fetch hire vouchers"));
  };

  useEffect(() => {
    load();
    fetchAllLocations().then((d) => setLocations(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lMap = useMemo(() => {
    const m = {};
    (locations || []).forEach((l) => { if (l.loc_code) m[l.loc_code] = l; });
    return m;
  }, [locations]);

  const refresh = () => {
    setSelectedRow(null);
    load();
  };

  const gridRows = useMemo(() => filterHireVoucherRows(
    raw.map((r) => mapHireVoucherRow(r, lMap)),
    { searchText, fFromLoc, fToLoc, fStatus, dFrom, dTo }
  ), [raw, searchText, fFromLoc, fToLoc, fStatus, dFrom, dTo, lMap]);

  useEffect(() => { setGridFiltered(null); }, [gridRows]);
  const totalSource = gridFiltered ?? gridRows;
  const totalRow = useMemo(() => buildHireVoucherTotalRow(totalSource), [totalSource]);
  const displayRows = useMemo(
    () => (gridRows.length ? [...gridRows, totalRow] : []),
    [gridRows, totalRow]
  );

  const fromOpts = useMemo(() => [...new Set(raw.map((m) => m.vha_loc).filter(Boolean))].sort(), [raw]);
  const toOpts = useMemo(() => [...new Set(raw.map((m) => m.vha_to_loc).filter(Boolean))].sort(), [raw]);
  const statusOpts = ["Both", "Open", "Settled"];

  const onSelect = (sm) => {
    const ids = [...(sm?.ids ?? sm ?? [])];
    const last = ids[ids.length - 1];
    if (!last || last === "__total__") {
      setSelectedRow(null);
      return;
    }
    setSelectedRow(gridRows.find((r) => r.id === last) || null);
  };

  const clearFilters = () => {
    setSearchText(""); setFFromLoc(""); setFToLoc(""); setFStatus("Both"); setDFrom(""); setDTo(""); setSelectedRow(null);
  };

  const exportExcel = () => {
    if (!gridRows.length) { showError("No data to export"); return; }
    exportHireVouchersExcel(
      totalSource.length ? [...totalSource, totalRow] : [],
      `hire_voucher_report_${moment().format("YYYYMMDD_HHmmss")}.xls`
    );
    showSuccess("Excel export started");
  };

  const autocompleteSlotProps = {
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
  };

  return (
    <MainLayout>
      <PageBody title="Hire Voucher Report">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} size="small" sx={{ color: "#0d6efd", "&:hover": { background: "#e3f2fd" } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <TextField size="small" placeholder="Search voucher, vehicle, owner..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setSelectedRow(null); }}
              sx={{ flex: "1 1 180px", minWidth: 160, "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
            <Autocomplete
              size="small"
              options={fromOpts}
              value={fFromLoc || null}
              onChange={(_, v) => { setFFromLoc(v || ""); setSelectedRow(null); }}
              slotProps={autocompleteSlotProps}
              sx={{ flex: "1 1 140px", minWidth: 130 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="From Loc"
                  sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )} />
            <Autocomplete
              size="small"
              options={toOpts}
              value={fToLoc || null}
              onChange={(_, v) => { setFToLoc(v || ""); setSelectedRow(null); }}
              slotProps={autocompleteSlotProps}
              sx={{ flex: "1 1 140px", minWidth: 130 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="To Loc"
                  sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )} />
            <Autocomplete
              size="small"
              options={statusOpts}
              value={fStatus || "Both"}
              disableClearable
              onChange={(_, v) => { setFStatus(v || "Both"); setSelectedRow(null); }}
              slotProps={autocompleteSlotProps}
              sx={{ flex: "1 1 130px", minWidth: 120 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Status"
                  sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1.5px solid #90caf9", borderRadius: 6, padding: "4px 8px", background: "#fff", flex: "1 1 240px", minWidth: 220 }}>
              <span style={{ position: "absolute", top: -9, left: 8, background: "#fff", padding: "0 4px", fontSize: 11, fontWeight: 600, color: "#0d6efd", letterSpacing: "0.3px", lineHeight: 1, whiteSpace: "nowrap" }}>Voucher Date Range</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                <input type="date" value={dFrom} onChange={(e) => { setDFrom(e.target.value); setSelectedRow(null); }}
                  style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }} />
                <span style={{ fontSize: 12, color: "#0d6efd", fontWeight: 700, padding: "0 2px" }}>→</span>
                <input type="date" value={dTo} onChange={(e) => { setDTo(e.target.value); setSelectedRow(null); }}
                  style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%", colorScheme: "light" }} />
                {(dFrom || dTo) && (
                  <span onClick={() => { setDFrom(""); setDTo(""); setSelectedRow(null); }}
                    style={{ cursor: "pointer", fontSize: 14, color: "#9ca3af", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</span>
                )}
              </div>
            </div>
            {(searchText.trim() || fFromLoc || fToLoc || (fStatus && fStatus !== "Both") || dFrom || dTo) && (
              <Tooltip title="Clear Filters">
                <IconButton onClick={clearFilters} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 52, padding: "4px 12px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", lineHeight: 1.2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0d6efd" }}>{gridRows.length}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#1976d2", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {(searchText.trim() || fFromLoc || fToLoc || (fStatus && fStatus !== "Both") || dFrom || dTo) ? "filtered" : "vouchers"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="contained" startIcon={<ExportIcon />} onClick={exportExcel}
              sx={{ background: "linear-gradient(135deg, #1ca562, #119154)", "&:hover": { background: "linear-gradient(135deg, #169d56, #0f7c4b)" }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Export
            </Button>
          </div>
        </div>

        {selectedRow ? (
          <div style={{ marginTop: 10, padding: "8px 14px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: "#0d6efd" }}>VHA: {selectedRow.vha_no}</strong>
            <span>{selectedRow.from_label || "—"} → {selectedRow.to_label || "—"}</span>
            <span>{selectedRow.vha_date}</span>
            <span>{selectedRow.vehicle_regis_no}</span>
            <span>{selectedRow.vendor_name}</span>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
              Hire {selectedRow.vha_hire_amt} | Adv {selectedRow.vha_advance_total} | Bal {selectedRow.vha_balance_amt}
            </span>
            {selectedRow.vha_final_pay_date && (
              <span>Settled on {selectedRow.vha_final_pay_date} | Paid Net {selectedRow.vha_net_payable}</span>
            )}
            <span style={{ padding: "2px 10px", borderRadius: 12, fontWeight: 600, background: selectedRow.settled_label === "Settled" ? "#dcfce7" : "#fff7ed", color: selectedRow.settled_label === "Settled" ? "#15803d" : "#ea580c" }}>
              {selectedRow.settled_label}
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 10, padding: "7px 14px", background: "#f9fafb", borderRadius: 8, border: "1.5px dashed #d1d5db", fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            No voucher selected — click a row to select
          </div>
        )}

        <div style={{ marginTop: 10, padding: "8px 14px", background: "#faf5ff", borderRadius: 8, border: "1.5px solid #d8b4fe", fontSize: 12, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontWeight: 700, color: "#6d28d9" }}>
          <span>Totals ({totalSource.length})</span>
          <span>Hire ₹ {totalRow.vha_hire_amt}</span>
          <span>Advance ₹ {totalRow.vha_advance_total}</span>
          <span>TDS ₹ {totalRow.vha_tds_amt}</span>
          <span>Net Adv ₹ {totalRow.vha_advance_net}</span>
          <span>Balance ₹ {totalRow.vha_balance_amt}</span>
          <span>Paid Detention ₹ {totalRow.vha_dtn_amt}</span>
          <span>Paid Others ₹ {totalRow.vha_dd_amt}</span>
          <span>Paid Gross ₹ {totalRow.vha_gross_payable}</span>
          <span>Paid TDS ₹ {totalRow.vha_settle_tds_amt}</span>
          <span>Paid Net ₹ {totalRow.vha_net_payable}</span>
        </div>

        <div style={{ marginTop: 10 }}>
          <DataTable columns={hireVoucherReportColumns} rows={displayRows}
            getKey={(r, i) => r.id || i}
            actions={[]} autoHeight scroll={{ afterRows: 10, horizontal: true }}
            checkboxSelection disableMultipleRowSelection onRowSelectionModelChange={onSelect}
            statusKey="row_tone"
            rowColors={{ Settled: "#7CFC00", Total: "#f3e8ff" }}
            onFilteredRowsChange={setGridFiltered}
          />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </PageBody>
    </MainLayout>
  );
}
