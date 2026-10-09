import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchAllManifests, fetchManifestByNo } from "../../utils/manifest";
import { fetchAllLocations } from "../../utils/locationMaster";
import { printManifest } from "../../components/common/ManifestPrint";
import { RefreshIcon, PrintIcon, ExportIcon, CloseIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Button, TextField, Autocomplete, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import moment from "moment";

const manifestColumns = [
  { key: "mnf_no", label: "Manifest No", minWidth: 110 },
  { key: "mnf_date", label: "Manifest Date", minWidth: 100 },
  { key: "from_label", label: "From", minWidth: 140 },
  { key: "to_label", label: "To", minWidth: 140 },
  { key: "mnf_type_label", label: "Type", minWidth: 90 },
  { key: "desp_veh_no", label: "Vehicle No", minWidth: 120 },
  { key: "loaded_by", label: "Driver", minWidth: 110 },
  { key: "driver_mobile", label: "Mobile", minWidth: 110 },
  { key: "mnf_no_of_dwb", label: "Dockets", minWidth: 80 },
  { key: "mnf_no_of_pkgs", label: "Packages", minWidth: 90 },
  { key: "mnf_actual_wt", label: "Weight (KG)", minWidth: 100 },
  { key: "mnf_from_town", label: "From Town", minWidth: 120 },
  { key: "mnf_to_town", label: "To Town", minWidth: 120 },
  { key: "aud_user", label: "Remarks", minWidth: 150 },
  {
    key: "manifest_status", label: "Status", minWidth: 100,
    render: (r) => (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "60px", height: "22px", borderRadius: "4px", fontSize: 11, fontWeight: 700, padding: "0 8px",
        ...(r.manifest_status === "Arrived"
          ? { background: "#e8f5e9", color: "#1b5e20", border: "1px solid #a5d6a7" }
          : { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }),
      }}>
        {r.manifest_status}
      </span>
    ),
  },
];

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("DD-MM-YYYY") : v;
};

const fmtNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? String(n) : "0";
};

const fmtWt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const manifestTypeLabels = { lp: "Local Pickup", lh: "Long Haul", ld: "Local Delivery" };

export default function ManifestReport() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [manifestRaw, setManifestRaw] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [printAnchor, setPrintAnchor] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [fFromLoc, setFFromLoc] = useState("");
  const [fToLoc, setFToLoc] = useState("");
  const [fType, setFType] = useState("");
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");

  useEffect(() => {
    fetchAllManifests().then((d) => setManifestRaw(Array.isArray(d) ? d : [])).catch((e) => showError(e.message || "Failed to fetch manifests"));
    fetchAllLocations().then((d) => setLocations(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lMap = useMemo(() => {
    const m = {};
    (locations || []).forEach((l) => { if (l.loc_code) m[l.loc_code] = l; });
    return m;
  }, [locations]);

  const locLabel = (code) => {
    if (!code) return "";
    const loc = lMap[code];
    return loc?.loc_name ? `${code} - ${loc.loc_name}` : code;
  };

  const refresh = () => {
    setSelectedRow(null);
    fetchAllManifests().then((d) => setManifestRaw(Array.isArray(d) ? d : [])).catch((e) => showError(e.message || "Failed to fetch manifests"));
  };

  const gridRows = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    const ff = fFromLoc.toLowerCase();
    const ft = fToLoc.toLowerCase();
    const fty = fType.toLowerCase();
    const df = dFrom ? moment(dFrom, "YYYY-MM-DD") : null;
    const dt = dTo ? moment(dTo, "YYYY-MM-DD") : null;

    return manifestRaw
      .map((m) => ({
        ...m,
        id: (m.mnf_no || "") + "_" + (m.mnf_loc || "") + "_" + (m.mnf_date || ""),
        mnf_date: toDate(m.mnf_date),
        mnf_no_of_dwb: fmtNum(m.mnf_no_of_dwb),
        mnf_no_of_pkgs: fmtNum(m.mnf_no_of_pkgs),
        mnf_actual_wt: fmtWt(m.mnf_actual_wt),
        from_label: locLabel(m.mnf_loc),
        to_label: locLabel(m.mnf_to_loc),
        mnf_type_label: manifestTypeLabels[m.mnf_type] || m.mnf_type || "",
        manifest_status: m.mnf_arrival_time ? "Arrived" : "In Transit",
      }))
      .filter((row) => {
        if (ff && !String(row.from_label ?? "").toLowerCase().includes(ff)) return false;
        if (ft && !String(row.to_label ?? "").toLowerCase().includes(ft)) return false;
        if (fty && !String(row.mnf_type_label ?? "").toLowerCase().includes(fty)) return false;
        if (df || dt) {
          const rd = moment(row.mnf_date, "DD-MM-YYYY");
          if (rd.isValid()) {
            if (df && rd.isBefore(df, "day")) return false;
            if (dt && rd.isAfter(dt, "day")) return false;
          }
        }
        if (q && !["mnf_no","from_label","to_label","mnf_type_label","desp_veh_no","loaded_by","driver_mobile","mnf_from_town","mnf_to_town","aud_user"]
          .some((k) => String(row[k] ?? "").toLowerCase().includes(q))) return false;
        return true;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestRaw, searchText, fFromLoc, fToLoc, fType, dFrom, dTo, lMap]);

  const fromOpts = useMemo(() => [...new Set(manifestRaw.map((m) => m.mnf_loc).filter(Boolean))].sort(), [manifestRaw]);
  const toOpts = useMemo(() => [...new Set(manifestRaw.map((m) => m.mnf_to_loc).filter(Boolean))].sort(), [manifestRaw]);
  const typeOpts = useMemo(() => [...new Set(manifestRaw.map((m) => manifestTypeLabels[m.mnf_type] || m.mnf_type).filter(Boolean))].sort(), [manifestRaw]);

  const onSelect = (sm) => {
    const ids = [...(sm?.ids ?? sm ?? [])];
    setSelectedRow(ids.length ? gridRows.find((r) => r.id === ids[ids.length - 1]) || null : null);
  };

  const clearFilters = () => {
    setSearchText(""); setFFromLoc(""); setFToLoc(""); setFType(""); setDFrom(""); setDTo(""); setSelectedRow(null);
  };

  const exportCsv = () => {
    if (!gridRows.length) { showError("No data to export"); return; }
    const heads = manifestColumns.map((c) => c.label);
    const rows = gridRows.map((r) => manifestColumns.map((c) => r[c.key]));
    const csv = [heads, ...rows].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `manifest_report_${moment().format("YYYYMMDD_HHmmss")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); showSuccess("Export started");
  };

  const handlePrint = async (withDetails) => {
    if (!selectedRow) { showError("Please select a manifest to print"); return; }
    try {
      showLoading();
      const data = await fetchManifestByNo(selectedRow.mnf_no);
      if (!data?.header) { showError("Manifest not found"); return; }
      printManifest({
        header: data.header,
        details: withDetails ? (data.details || []) : [],
        locationsMap: lMap,
      });
    } catch (e) {
      showError(e.message || "Print failed");
    } finally {
      hideLoading();
    }
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
      <PageBody title="Manifest Report">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} size="small" sx={{ color: "#0d6efd", "&:hover": { background: "#e3f2fd" } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <TextField size="small" placeholder="Search manifest, vehicle, driver..."
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
              options={typeOpts}
              value={fType || null}
              onChange={(_, v) => { setFType(v || ""); setSelectedRow(null); }}
              slotProps={autocompleteSlotProps}
              sx={{ flex: "1 1 150px", minWidth: 140 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Type"
                  sx={{ "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#0d6efd" } }} />
              )} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1.5px solid #90caf9", borderRadius: 6, padding: "4px 8px", background: "#fff", flex: "1 1 240px", minWidth: 220 }}>
              <span style={{ position: "absolute", top: -9, left: 8, background: "#fff", padding: "0 4px", fontSize: 11, fontWeight: 600, color: "#0d6efd", letterSpacing: "0.3px", lineHeight: 1, whiteSpace: "nowrap" }}>Manifest Date Range</span>
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
            {(searchText.trim() || fFromLoc || fToLoc || fType || dFrom || dTo) && (
              <Tooltip title="Clear Filters">
                <IconButton onClick={clearFilters} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 52, padding: "4px 12px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", lineHeight: 1.2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0d6efd" }}>{gridRows.length}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#1976d2", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {(searchText.trim() || fFromLoc || fToLoc || fType || dFrom || dTo) ? "filtered" : "manifests"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="contained"
              endIcon={<ArrowDropDownIcon />}
              startIcon={<PrintIcon />}
              onClick={(e) => setPrintAnchor(e.currentTarget)}
              sx={{ background: "linear-gradient(135deg, #1f6feb, #1d4ed8)", "&:hover": { background: "linear-gradient(135deg, #1d5ec9, #1e40af)" }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Print
            </Button>
            <Menu anchorEl={printAnchor} open={Boolean(printAnchor)} onClose={() => setPrintAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }}>
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(true); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 10 }}>Print with Details</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setPrintAnchor(null); handlePrint(false); }}>
                <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 10 }}>Print Summary Only</ListItemText>
              </MenuItem>
            </Menu>
            <Button variant="contained" startIcon={<ExportIcon />} onClick={exportCsv}
              sx={{ background: "linear-gradient(135deg, #1ca562, #119154)", "&:hover": { background: "linear-gradient(135deg, #169d56, #0f7c4b)" }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Export
            </Button>
          </div>
        </div>

        {selectedRow ? (
          <div style={{ marginTop: 10, padding: "8px 14px", background: "#e3f2fd", borderRadius: 8, border: "1.5px solid #90caf9", fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: "#0d6efd" }}>MNF: {selectedRow.mnf_no}</strong>
            <span>{selectedRow.from_label || "—"} → {selectedRow.to_label || "—"}</span>
            <span>{selectedRow.mnf_date}</span>
            <span>{selectedRow.desp_veh_no}</span>
            <span>👤 {selectedRow.loaded_by}</span>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
              {selectedRow.mnf_no_of_dwb} Dockets | {selectedRow.mnf_no_of_pkgs} Pkgs | {selectedRow.mnf_actual_wt} KG
            </span>
            <span style={{ padding: "2px 10px", borderRadius: 12, fontWeight: 600, background: selectedRow.manifest_status === "Arrived" ? "#dcfce7" : "#fff7ed", color: selectedRow.manifest_status === "Arrived" ? "#15803d" : "#ea580c" }}>
              {selectedRow.manifest_status}
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 10, padding: "7px 14px", background: "#f9fafb", borderRadius: 8, border: "1.5px dashed #d1d5db", fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            No manifest selected — click a row to select
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <DataTable columns={manifestColumns} rows={gridRows}
            getKey={(r, i) => r.id || i}
            actions={[]} autoHeight scroll={{ afterRows: 10, horizontal: true }}
            checkboxSelection disableMultipleRowSelection onRowSelectionModelChange={onSelect} />
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Loading manifest data..." />
      </PageBody>
    </MainLayout>
  );
}