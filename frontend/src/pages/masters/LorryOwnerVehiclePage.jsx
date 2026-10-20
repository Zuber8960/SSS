import { useEffect, useMemo, useState } from "react";
import { AddIcon, DeleteIcon, NoteAddIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  DataTable,
  SearchBox,
} from "../../components/common/MasterPage";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { formatDateDisplay } from "../../utils/tenantService";
import {
  fetchLorryOwners,
  fetchAttachedVehicles,
  fetchAvailableVehicles,
  attachVehicles,
  detachVehicles,
} from "../../utils/lorryOwnerVehicle";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

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

function selectionIds(model) {
  return [...(model?.ids ?? model ?? [])].map(String);
}

export default function LorryOwnerVehiclePage() {
  const [owners, setOwners] = useState([]);
  const [ownerId, setOwnerId] = useState("");
  const [attached, setAttached] = useState([]);
  const [available, setAvailable] = useState([]);
  const [attachedSearch, setAttachedSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [selectedAttached, setSelectedAttached] = useState([]);
  const [selectedAvailable, setSelectedAvailable] = useState([]);
  const [loading, setLoading] = useState(false);
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

  const selectedOwner = useMemo(
    () => owners.find((o) => String(o.record_id) === String(ownerId)) || null,
    [owners, ownerId]
  );

  const ownerOptions = useMemo(
    () => owners.map((o) => ({
      value: String(o.record_id),
      label: [o.bp_name, o.bp_pan_no, o.bp_city].filter(Boolean).join(" — "),
      row: o,
    })),
    [owners]
  );

  const loadOwners = async () => {
    try {
      const [ownerData, avail] = await Promise.all([
        fetchLorryOwners(),
        fetchAvailableVehicles(),
      ]);
      setOwners(Array.isArray(ownerData) ? ownerData : []);
      setAvailable(Array.isArray(avail) ? avail : []);
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Failed to load lorry owners");
    }
  };

  const loadLists = async (id) => {
    if (!id) {
      setAttached([]);
      setAvailable([]);
      setSelectedAttached([]);
      setSelectedAvailable([]);
      return;
    }
    setLoading(true);
    try {
      const [att, avail] = await Promise.all([
        fetchAttachedVehicles(id),
        fetchAvailableVehicles(id),
      ]);
      setAttached(Array.isArray(att) ? att : []);
      setAvailable(Array.isArray(avail) ? avail : []);
      setSelectedAttached([]);
      setSelectedAvailable([]);
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const onOwnerChange = (id) => {
    setOwnerId(id || "");
    loadLists(id);
  };

  const clearForm = () => {
    setOwnerId("");
    setAttached([]);
    setAvailable([]);
    setAttachedSearch("");
    setAvailableSearch("");
    setSelectedAttached([]);
    setSelectedAvailable([]);
  };

  const attachSelected = async () => {
    if (!ownerId) { showError("Please select a lorry owner"); return; }
    if (!selectedAvailable.length) { showError("Please select at least one vehicle to attach"); return; }
    try {
      const data = await attachVehicles({
        owner_bp_id: Number(ownerId),
        vehicle_rec_ids: selectedAvailable.map((id) => Number(id)),
      });
      setAttached(Array.isArray(data) ? data : []);
      const avail = await fetchAvailableVehicles(ownerId);
      setAvailable(Array.isArray(avail) ? avail : []);
      setSelectedAvailable([]);
      showSuccess("Vehicle(s) attached");
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Failed to attach vehicles");
    }
  };

  const detachSelected = async () => {
    if (!ownerId) { showError("Please select a lorry owner"); return; }
    if (!selectedAttached.length) { showError("Please select at least one vehicle to detach"); return; }
    try {
      const data = await detachVehicles({
        owner_bp_id: Number(ownerId),
        rec_ids: selectedAttached.map((id) => Number(id)),
      });
      setAttached(Array.isArray(data) ? data : []);
      const avail = await fetchAvailableVehicles(ownerId);
      setAvailable(Array.isArray(avail) ? avail : []);
      setSelectedAttached([]);
      showSuccess("Vehicle(s) detached");
    } catch (err) {
      showError(err.response?.data?.message || err.message || "Failed to detach vehicles");
    }
  };

  const matchText = (row, q) => {
    const hay = [row.lry_regis_no, row.vehicle_type, row.make, row.model, row.vehicle_ownership]
      .join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const attachedRows = (attachedSearch
    ? attached.filter((r) => matchText(r, attachedSearch))
    : attached
  ).map((r) => ({ ...r, id: String(r.rec_id) }));

  const availableRows = (availableSearch
    ? available.filter((r) => matchText(r, availableSearch))
    : available
  ).map((r) => ({ ...r, id: String(r.vehicle_rec_id) }));

  const vehicleColumns = [
    { key: "lry_regis_no", label: "Vehicle No" },
    { key: "vehicle_type", label: "Type" },
    { key: "make", label: "Make" },
    { key: "model", label: "Model" },
    { key: "vehicle_ownership", label: "Ownership" },
  ];

  const attachedColumns = [
    ...vehicleColumns,
    { key: "attached_on", label: "Attached On", render: (row) => formatDateDisplay(row.attached_on) },
  ];

  return (
    <MainLayout>
      <PageBody title="Lorry Owner Vehicle Mapping">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Attach", icon: <AddIcon />, onClick: attachSelected },
            { label: "Detach", icon: <DeleteIcon />, onClick: detachSelected, color: "error" },
          ]}
        />

        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader title="Lorry Owner" subtitle="Only Business Partners with Supplier Type Lorry Owner" />
          <Box sx={{ px: 2.5, py: 2, display: "grid", gridTemplateColumns: "minmax(280px, 1.4fr) repeat(3, 1fr)", gap: "12px 24px" }}>
            <MuiSelect
              label="Lorry Owner"
              value={ownerId}
              onChange={onOwnerChange}
              options={[{ value: "", label: "Select Lorry Owner" }, ...ownerOptions]}
            />
            <TextField size="small" label="PAN No" value={selectedOwner?.bp_pan_no || ""} disabled sx={fieldSx} />
            <TextField size="small" label="Mobile" value={selectedOwner?.bp_mobile1 || ""} disabled sx={fieldSx} />
            <TextField size="small" label="Location" value={selectedOwner?.loc_code || ""} disabled sx={fieldSx} />
          </Box>
        </div>

        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader
            title="Attached Vehicles"
            subtitle="Vehicles currently linked to this lorry owner"
            right={
              <Box sx={{ fontSize: 12.5, fontWeight: 700, color: "#7e22ce", background: "#f3e8ff", px: 1.5, py: 0.5, borderRadius: 999 }}>
                {attached.length} attached
              </Box>
            }
          />
          <Box sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, gap: 2, flexWrap: "wrap" }}>
              <SearchBox placeholder="Search attached..." value={attachedSearch} onChange={setAttachedSearch} />
            </Box>
            {ownerId ? (
              <DataTable
                columns={attachedColumns}
                rows={attachedRows}
                getKey={(row) => String(row.rec_id)}
                checkboxSelection
                rowSelectionModel={selectedAttached}
                onRowSelectionModelChange={(model) => setSelectedAttached(selectionIds(model))}
                isHeight={280}
              />
            ) : (
              <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2, px: 3, py: 4, textAlign: "center", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#475569" }}>Select a lorry owner to view attached vehicles</p>
              </Box>
            )}
          </Box>
          <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={detachSelected}
              sx={{ textTransform: "none", fontSize: 13, fontWeight: 600, borderRadius: 2, px: 2.5 }}
            >
              Detach
            </Button>
          </Box>
        </div>

        <div className="formPanel" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <CardHeader
            title="Available Vehicles"
            subtitle="Lorry Master vehicles that are not attached to any owner"
            right={
              <Box sx={{ fontSize: 12.5, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", px: 1.5, py: 0.5, borderRadius: 999 }}>
                {available.length} available
              </Box>
            }
          />
          <Box sx={{ px: 2.5, py: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, gap: 2, flexWrap: "wrap" }}>
              <SearchBox placeholder="Search available..." value={availableSearch} onChange={setAvailableSearch} />
            </Box>
            <DataTable
              columns={vehicleColumns}
              rows={availableRows}
              getKey={(row) => String(row.vehicle_rec_id)}
              checkboxSelection
              rowSelectionModel={selectedAvailable}
              onRowSelectionModelChange={(model) => setSelectedAvailable(selectionIds(model))}
              isHeight={280}
            />
          </Box>
          <Box sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={attachSelected}
              disabled={loading}
              sx={{ textTransform: "none", fontSize: 13, fontWeight: 600, borderRadius: 2, px: 2.5, background: "#7c3aed", "&:hover": { background: "#6d28d9" } }}
            >
              Attach
            </Button>
          </Box>
        </div>
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
