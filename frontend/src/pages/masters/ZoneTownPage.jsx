import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { DeleteIcon, EditIcon, NoteAddIcon, ExportIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  DataTable,
  SearchBox,
} from "../../components/common/MasterPage";
import {
  TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllZones } from "../../utils/zoneMaster";
import { fetchTownsByLocation } from "../../utils/townMaster";
import {
  fetchAllZoneTowns,
  saveZoneTowns,
  updateZoneTown as updateZoneTownApi,
  deleteZoneTown as deleteZoneTownApi,
} from "../../utils/zoneTownMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

/* record_created_on / record_updated_on are DATE columns → render tenant-style dates */
const formatDate = (value) => (value ? moment(value).format("DD/MM/YYYY") : "—");

/* ── Standard labels (red asterisk = required, like the reference design) ── */
function RequiredLabel({ children }) {
  return (
    <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", mb: 0.25 }}>
      {children} <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
    </Box>
  );
}

function OptionalLabel({ children }) {
  return (
    <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", mb: 0.25 }}>
      {children}
    </Box>
  );
}

/* ── Single-select dropdown (ZonePage pattern) ── */
function MuiSelect({ label, name, value, onChange, options, disabled }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt} sx={{ fontSize: 13 }}>
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/* ── Card header band ── */
function CardHeader({ title, subtitle, right }) {
  return (
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
      <Box>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{subtitle}</p>}
      </Box>
      {right}
    </Box>
  );
}

/* ── Summary strip cell ── */
function SummaryCell({ label, value, bold }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: "#64748b", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: bold ? 13 : 12.5, fontWeight: bold ? 700 : 600, color: "#0f172a" }}>{value}</p>
    </div>
  );
}
export default function ZoneTownPage() {
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneTowns, setZoneTowns] = useState([]);
  const [form, setForm] = useState({ loc_code: "", cust_code: "", zone_code: "" });
  const [selectedLocCodes, setSelectedLocCodes] = useState([]);
  const [availableTowns, setAvailableTowns] = useState([]);
  const [townsLoading, setTownsLoading] = useState(false);
  const [selectedTownIds, setSelectedTownIds] = useState([]);
  const [locListOpen, setLocListOpen] = useState(false);
  const [existingSearch, setExistingSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /* ── edit (PUT /zone-town/:record_id) dialog ── */
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ loc_code: "", town_name: "", zone_code: "" });
  const [editSaving, setEditSaving] = useState(false);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  /* ── helpers ── */
  const townKey = (t) => `${t.loc_code}|${String(t.town_name).toUpperCase()}`;
  // The BP master has no bp_code column in this database, so the customer key
  // falls back to record_id (ZonePage pattern) — that key is what this screen uses.
  const custKey = (p) => (p?.bp_grp_code ?? p?.record_id ?? "");
  // Customer names are not stored identically in every table (the BP row can carry
  // a trailing space, the zone row can be a different case), so code / name
  // comparisons are normalised before matching.
  const normText = (v) => String(v ?? "").trim().toUpperCase();

  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: String(l.loc_code), label: `${l.loc_code} - ${l.loc_name}` })),
    [locations]
  );
  const locationLabel = (code) => {
    const loc = locations.find((l) => String(l.loc_code) === String(code));
    return loc ? `${loc.loc_code} - ${loc.loc_name}` : String(code ?? "");
  };
  const customerOptions = useMemo(
    () => partners.map((p) => {
      const code = custKey(p);
      const name = String(p.bp_name ?? "").trim();
      return {
        value: String(code),
        label: [code, name].filter(Boolean).join(" - ") || `BP #${p.record_id}`,
      };
    }),
    [partners]
  );
  const selectedPartner = useMemo(
    () => partners.find((p) => String(custKey(p)) === String(form.cust_code)) || null,
    [partners, form.cust_code]
  );

  /* ── zones matching the selected location + customer ── */
  const zoneOptions = useMemo(() => {
    if (!form.loc_code && !form.cust_code) return [];
    const byLocation = zones.filter((z) =>  String(z.cust_code) === String(form.cust_code));
    if (!form.cust_code) return byLocation;
    const matching = byLocation.filter((z) => {
      const byCode = z.cust_code != null && String(z.cust_code) === String(form.cust_code);
      const byName = !!selectedPartner?.bp_name && normText(z.cust_name) === normText(selectedPartner.bp_name);
      return byCode || byName;
    });
    // Imported / legacy zone rows can carry a customer code that no BP record has
    // (e.g. cust_code 1054 while the BP's key is record_id 80) and names that only
    // differ by spacing. Never leave the Zone dropdown empty because of that — fall
    // back to the location's zones (same rule the edit dialog uses).
    return matching.length ? matching : byLocation;
  }, [zones, form.loc_code, form.cust_code, selectedPartner]);

  const selectedZone = useMemo(
    () => zones.find((z) => String(z.zone_code) === String(form.zone_code)) || null,
    [zones, form.zone_code]
  );

  /* ── initial load ──
        `loading` starts as true, so every state update here happens AFTER the
        fetch resolves (never synchronously inside the mount effect). */
  const loadAll = async () => {
    try {
      const [locData, bpData, zoneData, mappingData] = await Promise.all([
        fetchAllLocations(), fetchAllBusinessPartners(), fetchAllZones(), fetchAllZoneTowns(),
      ]);
      setLocations(locData || []);
      setPartners(bpData || []);
      setZones(zoneData || []);
      setZoneTowns(mappingData || []);
      setError("");
    } catch (err) {
      console.error("Failed to load zone town mapping data:", err);
      setError("Failed to load data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── load on mount: the toolbar's Refresh button is gone — the page always
        loads its own data, and every add / edit / delete re-fetches the rows
        it changed so the grids stay in sync ── */
  useEffect(() => {
    (async () => { await loadAll(); })();
  }, []);

  /* ── towns for the selected locations (multi-location support) ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedLocCodes.length) {
        setAvailableTowns([]);
        return;
      }
      try {
        setTownsLoading(true);
        const results = await Promise.all(selectedLocCodes.map((loc) => fetchTownsByLocation(loc)));
        if (cancelled) return;
        const merged = [];
        const seen = new Set();
        for (const list of results) {
          for (const t of list || []) {
            const key = townKey(t);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push({ loc_code: t.loc_code, town_name: t.town_name });
          }
        }
        merged.sort((a, b) =>
          String(a.loc_code).localeCompare(String(b.loc_code)) ||
          String(a.town_name).localeCompare(String(b.town_name))
        );
        setAvailableTowns(merged);
      } catch (err) {
        if (!cancelled) showError(err.message || "Failed to load towns");
      } finally {
        if (!cancelled) setTownsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocCodes]);

  /* ── existing mappings for the selected zone ── */
  const zoneTownsForZone = useMemo(
    () => (selectedZone ? zoneTowns.filter((r) => String(r.zone_code) === String(selectedZone.zone_code)) : []),
    [zoneTowns, selectedZone]
  );

  const existingRows = useMemo(() => {
    if (!existingSearch) return zoneTownsForZone;
    const q = existingSearch.toLowerCase();
    return zoneTownsForZone.filter((r) =>
      [r.loc_code, r.town_name, r.zone_code, r.zone_name, r.cust_code, r.cust_name]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [zoneTownsForZone, existingSearch]);

  const existingGridRows = useMemo(() => existingRows.map((r, i) => ({ ...r, sl_no: i + 1 })), [existingRows]);

  /* ── towns still available to add (not already mapped to this zone) ── */
  const mappedKeys = useMemo(() => new Set(zoneTownsForZone.map(townKey)), [zoneTownsForZone]);
  const addableTowns = useMemo(() => availableTowns.filter((t) => !mappedKeys.has(townKey(t))), [availableTowns, mappedKeys]);

  const addableGridRows = useMemo(() => {
    if (!availableSearch) return addableTowns;
    const q = availableSearch.toLowerCase();
    return addableTowns.filter((t) => [t.loc_code, t.town_name].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [addableTowns, availableSearch]);

  const selectedTowns = useMemo(
    () => addableTowns.filter((t) => selectedTownIds.includes(townKey(t))),
    [addableTowns, selectedTownIds]
  );

  /* ── handlers ── */
  const handleSelectChange = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Zone depends on location + customer → reset it when either changes
      if (name !== "zone_code") next.zone_code = "";
      return next;
    });
    setSelectedTownIds([]);
  };

  const clearForm = () => {
    setForm({ loc_code: "", cust_code: "", zone_code: "" });
    setSelectedLocCodes([]);
    setSelectedTownIds([]);
    setAvailableTowns([]);
    setExistingSearch("");
    setAvailableSearch("");
  };

  const handleAddSelected = async () => {
    if (!selectedZone) { showError("Please select Customer Location, Customer and Zone first"); return; }
    if (selectedTowns.length === 0) { showError("Please select at least one town to add"); return; }
    setSaving(true);
    try {
      const payload = {
        cust_loc_code: form.loc_code || null,
        // Prefer the zone's own customer (same source the zone master stores);
        // only fall back to the picked BP when the zone has none.
        cust_code: selectedZone.cust_code ?? (selectedPartner ? custKey(selectedPartner) : null),
        cust_name: selectedZone.cust_name || String(selectedPartner?.bp_name ?? "").trim() || null,
        zone_code: selectedZone.zone_code,
        zone_name: selectedZone.zone_name,
        towns: selectedTowns.map((t) => ({ loc_code: t.loc_code, town_name: t.town_name })),
      };
      const added = await saveZoneTowns(payload);
      const fresh = await fetchAllZoneTowns();
      setZoneTowns(fresh || []);
      setSelectedTownIds([]);
      setAvailableSearch("");
      const n = Array.isArray(added) ? added.length : selectedTowns.length;
      showSuccess(`${n} town(s) added to zone ${selectedZone.zone_code}`);
    } catch (err) {
      console.error("Add towns failed:", err);
      showError(err.message || "Failed to add towns to zone");
    } finally {
      setSaving(false);
    }
  };

  /* ── edit dialog (PUT /zone-town/:record_id) ── */
  const editZoneOptions = useMemo(() => {
    if (!editRow) return [];
    // Zones belonging to the same customer (code first, then name) — the town rows
    // store the customer that the parent zone was created for.
    const matching = zones.filter((z) => {
      const locOk = !editRow.cust_loc_code || String(z.loc_code) === String(editRow.cust_loc_code);
      const codeOk = editRow.cust_code != null && String(z.cust_code ?? "") === String(editRow.cust_code);
      const nameOk = !!editRow.cust_name && z.cust_name === editRow.cust_name;
      return locOk && (codeOk || nameOk);
    });
    return (matching.length ? matching : zones).map((z) => ({
      value: String(z.zone_code),
      label: `${z.zone_code} - ${z.zone_name ?? ""}`,
    }));
  }, [zones, editRow]);

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      loc_code: row.loc_code ?? "",
      town_name: row.town_name ?? "",
      zone_code: row.zone_code == null ? "" : String(row.zone_code),
    });
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditForm({ loc_code: "", town_name: "", zone_code: "" });
  };

  const handleUpdateTown = async () => {
    if (!editRow) return;
    const townName = editForm.town_name.trim().toUpperCase();
    if (!editForm.loc_code) { showError("Location Code is required"); return; }
    if (!townName) { showError("Town Name is required"); return; }
    if (!editForm.zone_code) { showError("Zone is required"); return; }

    const zone = zones.find((z) => String(z.zone_code) === String(editForm.zone_code)) || null;
    setEditSaving(true);
    try {
      await updateZoneTownApi(editRow.record_id, {
        cust_loc_code: editRow.cust_loc_code ?? null,
        cust_code: editRow.cust_code ?? null,
        cust_name: editRow.cust_name ?? null,
        zone_code: Number(editForm.zone_code),
        zone_name: zone?.zone_name ?? editRow.zone_name ?? null,
        loc_code: editForm.loc_code,
        town_name: townName,
      });
      const fresh = await fetchAllZoneTowns();
      setZoneTowns(fresh || []);
      closeEdit();
      showSuccess("Town mapping updated successfully");
    } catch (err) {
      console.error("Update town mapping failed:", err);
      showError(err.message || "Failed to update town mapping");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTown = (row) => {
    showWarning(
      "Remove Town",
      `Remove town "${row.town_name}" from zone ${row.zone_code}? This action cannot be undone.`,
      async () => {
        try {
          await deleteZoneTownApi(row.record_id);
          setZoneTowns((prev) => prev.filter((z) => String(z.record_id) !== String(row.record_id)));
          showSuccess("Town removed from zone successfully");
        } catch (err) {
          console.error("Delete town mapping failed:", err);
          showError(err.message || "Failed to remove town from zone");
        }
      }
    );
  };

  const exportCsv = () => {
    if (!selectedZone) { showError("Please select a zone to export its town mapping"); return; }
    const header = ["Location Code", "Town Name", "Zone Code", "Zone Name", "Created By", "Created On"];
    const rows = existingRows.map((r) => [
      r.loc_code ?? "",
      r.town_name ?? "",
      r.zone_code ?? "",
      r.zone_name ?? "",
      r.record_created_by ?? "",
      r.record_created_on ? formatDate(r.record_created_on) : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `zone_town_${selectedZone.zone_code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* sss.ssm_town_zone: loc_code + town_name → zone_code / zone_name (+ audit) */
  const existingColumns = [
    { key: "sl_no", label: "#", minWidth: 70 },
    { key: "loc_code", label: "Location Code" },
    { key: "town_name", label: "Town Name" },
    { key: "zone_code", label: "Zone Code" },
    { key: "zone_name", label: "Zone Name" },
    { key: "record_created_by", label: "Created By", render: (row) => row.record_created_by ?? "—" },
    { key: "record_created_on", label: "Created On", render: (row) => formatDate(row.record_created_on) },
  ];

  const availableColumns = [
    { key: "loc_code", label: "Location Code" },
    { key: "town_name", label: "Town Name" },
  ];

  return (
    <MainLayout>
      <PageBody title="Zone Town Mapping">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Export", icon: <ExportIcon />, onClick: exportCsv },
          ]}
          search={{
            placeholder: "Search existing towns...",
            value: existingSearch,
            onChange: (val) => setExistingSearch(val),
          }}
        />
        {error && <div className="alertBox error">{error}</div>}
        {loading && <div className="alertBox info">Loading...</div>}

        {/* ═══════════ CARD 1: CUSTOMER & ZONE SELECTION ═══════════ */}
        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader title="Customer & Zone Selection" subtitle="Select customer and zone to view and manage assigned towns" />
          <Box sx={{ px: 2.5, py: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 24px" }}>
              <div>
                <RequiredLabel>Customer Location</RequiredLabel>
                <MuiSelect label="Select Location" name="loc_code" value={form.loc_code} onChange={handleSelectChange} options={locationOptions} />
              </div>
              <div>
                <RequiredLabel>Customer Code & Name</RequiredLabel>
                <MuiSelect label="Select Customer" name="cust_code" value={form.cust_code} onChange={handleSelectChange} options={customerOptions} />
              </div>
              <div>
                <OptionalLabel>Customer Code</OptionalLabel>
                <TextField size="small" fullWidth sx={fieldSx} disabled placeholder="Auto populated"
                  value={selectedPartner ? String(custKey(selectedPartner)) : ""} />
              </div>
              <div>
                <OptionalLabel>Customer Name</OptionalLabel>
                <TextField size="small" fullWidth sx={fieldSx} disabled placeholder="Auto populated"
                  value={String(selectedPartner?.bp_name ?? "").trim()} />
              </div>
              <div>
                <RequiredLabel>Zone Code</RequiredLabel>
                <MuiSelect label="Select Zone" name="zone_code" value={form.zone_code}
                  onChange={handleSelectChange} options={zoneOptions.map((z) => ({ value: String(z.zone_code), label: `${z.zone_code} - ${z.zone_name ?? ""}` }))}
                  disabled={zoneOptions.length === 0} />
              </div>
              <div>
                <OptionalLabel>Zone Name</OptionalLabel>
                <TextField size="small" fullWidth sx={fieldSx} disabled placeholder="Auto populated"
                  value={selectedZone?.zone_name ?? ""} />
              </div>
            </div>

            {/* Zone summary strip */}
            <Box sx={{ mt: 2, border: "1px solid #dbeafe", borderRadius: 2, background: "#f8fafc", px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, auto))", gap: 24 }}>
                <SummaryCell label="Zone Code" value={selectedZone?.zone_code ?? "—"} />
                <SummaryCell label="Zone Name" bold value={selectedZone?.zone_name ?? "Select Zone"} />
                <SummaryCell label="Existing Towns" value={zoneTownsForZone.length} />
              </div>
              <Box component="span" sx={{
                px: 1.1, py: 0.3, borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                color: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe",
              }}>
                Active Zone
              </Box>
            </Box>
          </Box>
        </div>

        {/* ═══════════ CARD 2: TOWNS ALREADY ADDED TO ZONE ═══════════ */}
        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader
            title="Towns Already Added to Zone"
            subtitle="Existing town mappings for the selected zone"
            right={
              <Box sx={{ fontSize: 12.5, fontWeight: 700, color: "#7e22ce", background: "#f3e8ff", px: 1.5, py: 0.5, borderRadius: 999 }}>
                {zoneTownsForZone.length} town(s) currently assigned
              </Box>
            }
          />
          <Box sx={{ px: 2.5, pb: 2.5, pt: 2 }}>
            {selectedZone ? (
              <DataTable
                columns={existingColumns}
                rows={existingGridRows}
                getKey={(row) => row.record_id}
                actions={[
                  { label: "Edit", icon: <EditIcon />, onClick: openEdit },
                  { label: "Delete", icon: <DeleteIcon />, onClick: handleDeleteTown },
                ]}
                isHeight={320}
              />
            ) : (
              <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2, px: 3, py: 4, textAlign: "center", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#475569" }}>Select a customer and zone to view assigned towns</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>Existing town mappings for the selected zone will appear here</p>
              </Box>
            )}
          </Box>
        </div>

        {/* ═══════════ CARD 3: ADD NEW TOWNS ═══════════ */}
        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader title="Add New Towns" subtitle="Select locations and then select towns to add to the zone" />
          <Box sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2 }}>
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Select Location & Towns</h3>
              <p style={{ margin: "2px 0 12px", fontSize: 12, color: "#64748b" }}>Multiple locations and multiple towns can be selected</p>

              <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                {/* Location multi-select list */}
                <div>
                  <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155" }}>Location Code</Box>
                  <p style={{ margin: "2px 0 6px", fontSize: 11.5, color: "#64748b" }}>Select Locations <span style={{ color: "#dc2626" }}>*</span></p>
                  <Select
                    multiple
                    size="small"
                    value={selectedLocCodes}
                    open={locListOpen}
                    onOpen={() => setLocListOpen(true)}
                    onClose={() => setLocListOpen(false)}
                    onChange={(e) => setSelectedLocCodes(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                    renderValue={(selected) => (selected.length === 0
                      ? "Select Locations"
                      : selected.length === 1
                        ? locationLabel(selected[0])
                        : `${selected.length} locations selected`)}
                    sx={{ ...fieldSx, width: "100%", background: "#fff" }}
                    MenuProps={{ PaperProps: { sx: { maxHeight: 260 } }, disableAutoFocusItem: true }}
                  >
                    {locationOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
                        <Checkbox size="small" checked={selectedLocCodes.includes(opt.value)} sx={{ p: 0.5, mr: 1 }} />
                        <ListItemText primary={opt.label} primaryTypographyProps={{ style: { fontSize: 13 } }} />
                      </MenuItem>
                    ))}
                  </Select>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>Click the checkboxes to select multiple locations</p>
                </div>

                {/* Available towns grid */}
                <div style={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 2, flexWrap: "wrap" }}>
                    <Box>
                      <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155" }}>Available Towns</Box>
                      <p style={{ margin: 0, fontSize: 11.5, color: "#64748b" }}>
                        {townsLoading ? "Loading towns..." : `${selectedTowns.length} town(s) selected`}
                      </p>
                    </Box>
                    <SearchBox placeholder="Search towns..." value={availableSearch} onChange={setAvailableSearch} />
                  </Box>
                  <DataTable
                    columns={availableColumns}
                    rows={addableGridRows}
                    getKey={(row) => `${row.loc_code}|${String(row.town_name).toUpperCase()}`}
                    checkboxSelection
                    rowSelectionModel={selectedTownIds}
                    // MUI DataGrid v9: the callback receives { type, ids: Set } — normalise to an id array
                    onRowSelectionModelChange={(model) => setSelectedTownIds([...(model?.ids ?? model ?? [])])}
                    isHeight={300}
                  />
                </div>
              </div>
            </Box>
          </Box>

          {/* Card footer actions */}
          <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            <Button variant="outlined" onClick={clearForm} sx={{ textTransform: "none", fontSize: 13, borderRadius: 2, px: 2.5 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddSelected}
              disabled={saving || !selectedZone || selectedTowns.length === 0}
              sx={{ textTransform: "none", fontSize: 13, fontWeight: 600, borderRadius: 2, px: 2.5, background: "#7c3aed", "&:hover": { background: "#6d28d9" } }}
            >
              {saving ? "Adding..." : "Add Selected Towns"}
            </Button>
          </Box>
        </div>
      </PageBody>

      {/* ── Edit mapping (PUT /zone-town/:record_id) ── */}
      <Dialog open={!!editRow} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Edit Town Mapping</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px", pt: 0.5 }}>
            <div>
              <RequiredLabel>Location Code</RequiredLabel>
              <MuiSelect
                label="Select Location"
                name="loc_code"
                value={editForm.loc_code}
                onChange={(name, value) => setEditForm((prev) => ({ ...prev, [name]: value }))}
                options={locationOptions}
              />
            </div>
            <div>
              <RequiredLabel>Zone</RequiredLabel>
              <MuiSelect
                label="Select Zone"
                name="zone_code"
                value={editForm.zone_code}
                onChange={(name, value) => setEditForm((prev) => ({ ...prev, [name]: value }))}
                options={editZoneOptions}
                disabled={editZoneOptions.length === 0}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <RequiredLabel>Town Name</RequiredLabel>
              <TextField
                size="small"
                fullWidth
                sx={fieldSx}
                value={editForm.town_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, town_name: e.target.value }))}
                placeholder="Town name"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <OptionalLabel>Customer</OptionalLabel>
              <TextField
                size="small"
                fullWidth
                disabled
                sx={fieldSx}
                value={[editRow?.cust_code, editRow?.cust_name].filter(Boolean).join(" - ")}
              />
            </div>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={closeEdit} sx={{ textTransform: "none", fontSize: 13, borderRadius: 2, px: 2.5 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateTown}
            disabled={editSaving}
            sx={{ textTransform: "none", fontSize: 13, fontWeight: 600, borderRadius: 2, px: 2.5, background: "#7c3aed", "&:hover": { background: "#6d28d9" } }}
          >
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}

