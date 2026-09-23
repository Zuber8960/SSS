import { useEffect, useMemo, useState } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  DataTable,
} from "../../components/common/MasterPage";
import {
  TextField, FormControl, InputLabel, Select, MenuItem, Box,
} from "@mui/material";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import {
  fetchAllZones,
  saveZone as saveZoneApi,
  updateZone as updateZoneApi,
  deleteZone as deleteZoneApi,
} from "../../utils/zoneMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
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

const emptyForm = {
  record_id: null, loc_code: "", cust_code: "", cust_name: "", zone_name: "", zone_code: "",
};

/* ── Standard required-label (red asterisk like the reference design) ── */
function RequiredLabel({ children }) {
  return (
    <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", mb: 0.25 }}>
      {children} <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
    </Box>
  );
}

export default function ZonePage() {
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [originalZone, setOriginalZone] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setOriginalZone(null);
  };

  const locationOptions = useMemo(
    () => locations.map((l) => ({ value: String(l.loc_code), label: `${l.loc_code} - ${l.loc_name}` })),
    [locations]
  );
  // bp_code is often NULL on BP records (not set by the BP master form), so the
  // option key falls back to record_id which is always present and unique.
  const custKey = (p) => (p?.bp_code ?? p?.record_id ?? "");
  const customerOptions = useMemo(
    () => partners.map((p) => ({ value: String(custKey(p)), label: p.bp_name || `BP #${p.record_id}` })),
    [partners]
  );
  const locationLabel = (code) => {
    const loc = locations.find((l) => String(l.loc_code) === String(code));
    return loc ? `${loc.loc_code} - ${loc.loc_name}` : (code || "");
  };
  const customerLabel = (key) => {
    const bp = partners.find((p) => String(custKey(p)) === String(key));
    return bp ? bp.bp_name : "";
  };
  // Resolve a stored zone row back to a dropdown option (by code first, then by name)
  const resolveCustomerKey = (code, name) => {
    const byCode = partners.find((p) => code != null && String(custKey(p)) === String(code));
    if (byCode) return String(custKey(byCode));
    const byName = partners.find((p) => name && p.bp_name === name);
    if (byName) return String(custKey(byName));
    return code != null ? String(code) : "";
  };

  useEffect(() => {
    (async () => {
      try {
        const [zoneData, locData, bpData] = await Promise.all([
          fetchAllZones(), fetchAllLocations(), fetchAllBusinessPartners(),
        ]);
        setZones(zoneData);
        setLocations(locData);
        setPartners(bpData);
      } catch (err) {
        console.error("Failed to load zone data:", err);
        setError("Failed to load data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveZone = async () => {
    if (!form.loc_code) { showError("Location Code is required"); return; }
    if (!form.cust_code) { showError("Customer is required"); return; }
    if (!form.zone_name) { showError("Zone Name is required"); return; }
    const selectedCustomer = partners.find((p) => String(custKey(p)) === String(form.cust_code));
    const payload = {
      loc_code: form.loc_code,
      cust_code: selectedCustomer?.bp_code ?? form.cust_code,
      cust_name: selectedCustomer?.bp_name || form.cust_name || null,
      zone_name: form.zone_name,
      // zone_code intentionally omitted — generated by DB sequence sss.ssm_cust_zone_code_seq on insert
    };
    try {
      if (isEditing && originalZone?.record_id) {
        const updated = await updateZoneApi(originalZone.record_id, payload);
        setZones((prev) => prev.map((z) => (z.record_id === originalZone.record_id ? { ...z, ...(Array.isArray(updated) ? updated[0] : updated) } : z)));
        showSuccess("Zone updated successfully");
      } else {
        const saved = await saveZoneApi(payload);
        const savedRow = Array.isArray(saved) ? saved[0] : saved;
        if (savedRow) setZones((prev) => [...prev, savedRow]);
        showSuccess("Zone saved successfully");
      }
      clearForm();
    } catch (err) {
      console.error("Save zone failed:", err);
      showError(err.message || "Zone save failed. Please try again.");
    }
  };

  const editZone = (zone) => {
    setForm({
      record_id: zone.record_id ?? null,
      loc_code: zone.loc_code != null ? String(zone.loc_code) : "",
      cust_code: resolveCustomerKey(zone.cust_code, zone.cust_name),
      cust_name: zone.cust_name ?? "",
      zone_name: zone.zone_name ?? "",
      zone_code: zone.zone_code ?? "",
    });
    setIsEditing(true);
    setOriginalZone(zone);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteZone = (recordId) => {
    showWarning(
      "Delete Zone",
      "Are you sure you want to delete this Zone? This action cannot be undone.",
      async () => {
        try {
          await deleteZoneApi(recordId);
          setZones((prev) => prev.filter((z) => z.record_id !== recordId));
          if (originalZone?.record_id === recordId) clearForm();
          showSuccess("Zone deleted successfully");
        } catch (err) {
          console.error("Delete zone failed:", err);
          showError(err.message || "Zone delete failed. Please try again.");
        }
      }
    );
  };

  const exportZones = () => {
    const header = ["Zone Code", "Location", "Customer", "Zone Name"];
    const rows = filteredZones.map((z) => [
      z.zone_code ?? "", locationLabel(z.loc_code), z.cust_name || customerLabel(z.cust_code), z.zone_name ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "zone_master.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredZones = searchText
    ? zones.filter((z) =>
        [
          z.zone_code, z.zone_name, z.cust_name, locationLabel(z.loc_code),
        ].some((v) => String(v ?? "").toLowerCase().includes(searchText.toLowerCase()))
      )
    : zones;

  const zoneColumns = [
    { key: "zone_code", label: "Zone Code" },
    { key: "loc_code", label: "Location", render: (row) => locationLabel(row.loc_code) },
    { key: "cust_code", label: "Customer", render: (row) => row.cust_name || customerLabel(row.cust_code) },
    { key: "zone_name", label: "Zone Name" },
  ];

  return (
    <MainLayout>
      <PageBody title="Make Zone">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveZone },
            { label: "Export", icon: <ExportIcon />, onClick: exportZones },
          ]}
          search={{
            placeholder: "Search zones...",
            value: searchText,
            onChange: (val) => setSearchText(val),
          }}
        />
        {error && <div className="alertBox error">{error}</div>}
        {loading && <div className="alertBox info">Loading...</div>}

        {/* ═══════════ ZONE INFORMATION CARD ═══════════ */}
        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {/* Card header */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Zone Information</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Select the location and customer, then enter the zone name.
            </p>
          </Box>

          {/* Card body */}
          <Box sx={{ px: 2.5, py: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              <div>
                <RequiredLabel>Location Code</RequiredLabel>
                <MuiSelect label="Select Location" name="loc_code" value={form.loc_code}
                  onChange={setField} options={locationOptions} />
              </div>
              <div>
                <RequiredLabel>Customer</RequiredLabel>
                <MuiSelect label="Select Customer" name="cust_code" value={form.cust_code}
                  onChange={setField} options={customerOptions} />
              </div>
              <div>
                <RequiredLabel>Zone Name</RequiredLabel>
                <TextField size="small" fullWidth sx={fieldSx} placeholder="Enter zone name"
                  value={form.zone_name} onChange={(e) => setField("zone_name", e.target.value)} />
              </div>
              <div>
                <Box component="label" sx={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", mb: 0.25 }}>
                  Zone Code
                </Box>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <TextField size="small" fullWidth sx={fieldSx} disabled
                    placeholder="AUTO GENERATED" value={form.zone_code} />
                  <Box sx={{
                    px: 1.25, py: 0.5, borderRadius: 1.25, fontSize: 10.5, fontWeight: 600,
                    color: "#166534", background: "#dcfce7", whiteSpace: "nowrap",
                  }}>
                    DATABASE
                  </Box>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#64748b" }}>
                  Zone code will be generated automatically when the record is saved.
                </p>
              </div>
            </div>

            {/* Zone Summary */}
            <Box sx={{ mt: 2, border: "1px solid #e2e8f0", borderRadius: 2, background: "#f8fafc", px: 2, py: 1.25 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Zone Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
                {[
                  { label: "Location", value: form.loc_code ? locationLabel(form.loc_code) : "" },
                  { label: "Customer", value: customerLabel(form.cust_code) || form.cust_name || "" },
                  { label: "Zone Name", value: form.zone_name || "" },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{ margin: 0, fontSize: 11.5, color: "#64748b" }}>{s.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>
                      {s.value || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </Box>
          </Box>
        </div>

        <DataTable
          columns={zoneColumns}
          rows={filteredZones}
          getKey={(row) => row.record_id ?? row.zone_code}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editZone },
            { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deleteZone(row.record_id) },
          ]}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}

