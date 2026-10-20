import { useEffect, useState, useRef } from "react";
import { SaveIcon, RefreshIcon, ClearIcon, NoteAddIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import {
  fetchAllLorries,
  createLorry,
  updateLorry,
  deleteLorry,
  fetchLorryByVehicleNo,
} from "../../utils/lorryMaster";
import { fetchVehicleTypeOptions } from "../../utils/vehicleType";
import { fetchVahanByVehicleNo, mapVahanToLorryForm, normalizeVehicleNo } from "../../utils/vahan";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
  Chip,
  TextField,
  InputLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 12, py: 0.75 }, "& .MuiSelect-select": { fontSize: 12, py: 0.75 }, "& .MuiInputLabel-root": { fontSize: 12 } };

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

const emptyLorryForm = {
  // ── Top Section ──
  vehicle_type: "",
  vehicle_ownership: "",

  // ── Vehicle Details ──
  vehicle_no: "",
  branch_code: "CYHO",
  chassis_no: "",
  fleet_no: "",
  owner_name: "",
  make: "",
  model: "",
  engine_no: "",
  tax_exp_date: "",
  body_type: "",
  fitness_exp_date: "",
  regis_year: "",
  regis_rto: "",
  emission_stage: "",
  puc_exp_date: "",
  driver_pay_type: "",
  financer: "",
  loan_no: "",
  hp_status: "",
  fuel_tank_capacity: "",
  fuel_ratio: "",
  def_tank_capacity: "",
  fuel_type: "",
  black_listed: "No",
  is_active: "Active",
  max_no_tyres: "",

  // ── Weight Volume Details ──
  length_mm: "",
  breadth_mm: "",
  height_mm: "",
  volume_cbm: "",
  unladen_weight_kg: "",
  carrying_capacity_kg: "",
  ground_clearence_mm: "",

  // ── Insurance Details ──
  insurance_company_name: "",
  insurance_policy_no: "",
  insurance_type: "",
  insurance_to_date: "",

  // ── Document Upload ──
  doc_permit: "",
  doc_insurance: "",
  doc_vehicle_rc: "",
  doc_fitness: "",
  doc_pollution: "",
};

const mapLorryToForm = (row) => ({
  // ── Top Section ──
  vehicle_type: row.vehicle_type ?? "",
  vehicle_ownership: row.vehicle_ownership ?? "",

  // ── Vehicle Details ──
  vehicle_no: normalizeVehicleNo(row.vehicle_no),
  branch_code: row.branch_code || "CYHO",
  chassis_no: row.chassis_no ?? "",
  fleet_no: row.fleet_no ?? "",
  owner_name: row.owner_name ?? "",
  make: row.make ?? "",
  model: row.model ?? "",
  engine_no: row.engine_no ?? "",
  tax_exp_date: row.tax_exp_date ? row.tax_exp_date.slice(0, 10) : "",
  body_type: row.body_type ?? "",
  fitness_exp_date: row.fitness_exp_date ? row.fitness_exp_date.slice(0, 10) : "",
  regis_year: row.regis_year ?? "",
  regis_rto: row.regis_rto ?? "",
  emission_stage: row.emission_stage ?? "",
  puc_exp_date: row.puc_exp_date ? row.puc_exp_date.slice(0, 10) : "",
  driver_pay_type: row.driver_pay_type ?? "",
  financer: row.financer ?? "",
  loan_no: row.loan_no ?? "",
  hp_status: row.hp_status ?? "",
  fuel_tank_capacity: row.fuel_tank_capacity ?? "",
  fuel_ratio: row.fuel_ratio ?? "",
  def_tank_capacity: row.def_tank_capacity ?? "",
  fuel_type: row.fuel_type ?? "",
  black_listed: row.black_listed ?? "No",
  is_active: row.is_active ?? "Active",
  max_no_tyres: row.max_no_tyres ?? "",

  // ── Weight Volume Details ──
  length_mm: row.length_mm ?? "",
  breadth_mm: row.breadth_mm ?? "",
  height_mm: row.height_mm ?? "",
  volume_cbm: row.volume_cbm ?? "",
  unladen_weight_kg: row.unladen_weight_kg ?? "",
  carrying_capacity_kg: row.carrying_capacity_kg ?? "",
  ground_clearence_mm: row.ground_clearence_mm ?? "",

  // ── Insurance Details ──
  insurance_company_name: row.insurance_company_name ?? "",
  insurance_policy_no: row.insurance_policy_no ?? "",
  insurance_type: row.insurance_type ?? "",
  insurance_to_date: row.insurance_to_date ? row.insurance_to_date.slice(0, 10) : "",

  // ── Document Upload ──
  doc_permit: row.doc_permit ?? "",
  doc_insurance: row.doc_insurance ?? "",
  doc_vehicle_rc: row.doc_vehicle_rc ?? "",
  doc_fitness: row.doc_fitness ?? "",
  doc_pollution: row.doc_pollution ?? "",
});

export default function LorryPage() {

  const [lorries, setLorries] = useState([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);
  const [bodyTypeOptions, setBodyTypeOptions] = useState([
    "Open Body", "Closed Body", "Container", "Tanker", "Flat Bed", "Refrigerated", "Hydraulic",
  ]);
  const [fuelTypeOptions, setFuelTypeOptions] = useState([
    "Diesel", "Petrol", "CNG", "LNG", "Electric", "Hybrid",
  ]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const [form, setForm] = useState(emptyLorryForm);
  // Newly picked documents, keyed by doc field name. Kept out of `form` because
  // a File cannot be serialised into the form state used for editing.
  const [files, setFiles] = useState({});

  const [isEditing, setIsEditing] = useState(false);
  const [originalLorry, setOriginalLorry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastVehicleLookupRef = useRef("");

  const clearForm = () => {
    setForm(emptyLorryForm);
    setFiles({});
    setIsEditing(false);
    setOriginalLorry(null);
    lastVehicleLookupRef.current = "";
  };

  const loadLorries = async () => {
    try {
      const data = await fetchAllLorries();
      setLorries(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err.message || "Failed to load lorries");
      console.error("Load lorries error:", err);
    }
  };

  const saveLorry = async () => {
    const vehicleNo = normalizeVehicleNo(form.vehicle_no);
    if (!vehicleNo) {
      showError("Vehicle Number is required");
      return;
    }
    if (!String(form.vehicle_type || "").trim()) {
      showError("Vehicle Type is required");
      return;
    }
    if (!String(form.vehicle_ownership || "").trim()) {
      showError("Vehicle Ownership is required");
      return;
    }

    const payload = {
      ...form,
      vehicle_no: vehicleNo,
      branch_code: "CYHO",
      fuel_tank_capacity: form.fuel_tank_capacity ? Number(form.fuel_tank_capacity) : null,
      fuel_ratio: form.fuel_ratio ? Number(form.fuel_ratio) : null,
      def_tank_capacity: form.def_tank_capacity ? Number(form.def_tank_capacity) : null,
      length_mm: form.length_mm ? Number(form.length_mm) : null,
      breadth_mm: form.breadth_mm ? Number(form.breadth_mm) : null,
      height_mm: form.height_mm ? Number(form.height_mm) : null,
      volume_cbm: form.volume_cbm ? Number(form.volume_cbm) : null,
      unladen_weight_kg: form.unladen_weight_kg ? Number(form.unladen_weight_kg) : null,
      carrying_capacity_kg: form.carrying_capacity_kg ? Number(form.carrying_capacity_kg) : null,
      max_no_tyres: form.max_no_tyres ? Number(form.max_no_tyres) : null,
      ground_clearence_mm: form.ground_clearence_mm ? Number(form.ground_clearence_mm) : null,
    };

    try {
      setIsSaving(true);
      if (isEditing && originalLorry?.rec_id) {
        await updateLorry(originalLorry.rec_id, payload, files);
        showSuccess("Lorry updated successfully");
      } else {
        await createLorry(payload, files);
        showSuccess("Lorry created successfully");
      }
      // Reload from the server instead of patching local state: the response is
      // the mapped DB row (rec_id, mapped column names) and local `payload`
      // uses frontend field names, so merging them would corrupt the list.
      await loadLorries();
      clearForm();
    } catch (err) {
      showError(err.message || "Failed to save lorry");
      console.error("Save lorry error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const editLorry = (row) => {
    setForm(mapLorryToForm(row));
    setFiles({});
    setOriginalLorry(row);
    setIsEditing(true);
    showSuccess(`Loaded ${row.vehicle_no || "lorry"} for editing`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteLorry = (row) => {
    showWarning("Confirm Delete", `Delete lorry "${row.vehicle_no || row.rec_id}"? This cannot be undone.`,
      async () => {
        try {
          await deleteLorry(row.rec_id);
          // Drop it from the grid immediately, and stop editing it if it was open.
          setLorries((prev) => prev.filter((x) => x.rec_id !== row.rec_id));
          if (originalLorry?.rec_id === row.rec_id) clearForm();
          showSuccess("Lorry deleted successfully");
        } catch (err) {
          showError(err.message || "Failed to delete lorry");
          console.error("Delete lorry error:", err);
        }
      }
    );
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const fillFromVahan = async (vno, baseForm) => {
    try {
      const { vehicle: vahan, error: vahanError } = await fetchVahanByVehicleNo(vno);
      const mapped = mapVahanToLorryForm(vahan);
      const { _vahanClass, ...fields } = mapped;
      const typeOpts = vehicleTypeOptions.length ? vehicleTypeOptions : ["LCV", "MCV", "HCV", "Trailer", "Tractor"];
      const classText = String(_vahanClass || "");
      const typeMatch = typeOpts.find((o) => o.toLowerCase() === classText.toLowerCase())
        || typeOpts.find((o) => classText.toUpperCase().includes(String(o).toUpperCase()));
      if (vahan && Object.keys(fields).some((k) => fields[k])) {
        if (fields.body_type) {
          setBodyTypeOptions((prev) =>
            prev.some((o) => o.toLowerCase() === String(fields.body_type).toLowerCase())
              ? prev
              : [...prev, fields.body_type]
          );
        }
        if (fields.fuel_type) {
          setFuelTypeOptions((prev) =>
            prev.some((o) => o.toLowerCase() === String(fields.fuel_type).toLowerCase())
              ? prev
              : [...prev, fields.fuel_type]
          );
        }
        const filled = Object.fromEntries(
          Object.entries(fields).filter(([, val]) => val !== "" && val != null)
        );
        setForm({
          ...baseForm,
          ...filled,
          vehicle_no: vno,
          vehicle_type: typeMatch || baseForm.vehicle_type,
        });
        showSuccess("Details filled from Vahan");
        return true;
      }
      showWarning(vahanError || "Vahan returned no details.");
      return false;
    } catch (err) {
      console.error("Vahan lookup error:", err);
      showWarning(err.message || "Vahan lookup failed.");
      return false;
    }
  };

  // Always call Vahan after vehicle no Enter/Tab/blur (or the Edit button).
  // Existing lorry stays in edit mode; Vahan fields replace previous RC data.
  const handleVehicleNoLookup = async (e, { force } = {}) => {
    if (e?.key && e.key !== "Enter" && e.key !== "Tab") return;
    e?.preventDefault?.();
    const vno = normalizeVehicleNo(form.vehicle_no);
    if (!vno) {
      if (e?.type === "blur") return;
      showError("Please enter a Vehicle Number first");
      return;
    }
    if (!force && lastVehicleLookupRef.current === vno) return;
    lastVehicleLookupRef.current = vno;
    setForm((prev) => ({ ...prev, vehicle_no: vno }));
    try {
      const data = await fetchLorryByVehicleNo(vno);
      if (data) {
        setFiles({});
        setOriginalLorry(data);
        setIsEditing(true);
      } else {
        setFiles({});
        setOriginalLorry(null);
        setIsEditing(false);
      }
      const baseForm = data ? mapLorryToForm(data) : { ...emptyLorryForm, vehicle_no: vno };
      await fillFromVahan(vno, baseForm);
    } catch (err) {
      lastVehicleLookupRef.current = "";
      showError(err.message || "Failed to fetch lorry details");
      console.error("Fetch lorry by vehicle no error:", err);
    }
  };

  // Initial fetch of the lorry list. The async call is intentionally NOT awaited
  // here — state is only set once the request resolves, so this does not trigger
  // the "setState synchronously in an effect" cascading-render warning.
  useEffect(() => {
    fetchVehicleTypeOptions()
      .then((data) => setVehicleTypeOptions(Array.isArray(data) ? data.filter(Boolean) : []))
      .catch((err) => console.error("Load vehicle types error:", err));

    const controller = new AbortController();
    fetchAllLorries()
      .then((data) => {
        if (!controller.signal.aborted) setLorries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          showError(err.message || "Failed to load lorries");
          console.error("Load lorries error:", err);
        }
      });
    return () => { controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionStyle = {
    margin: "8px 0 4px",
    color: "#1e293b",
    fontSize: "14px",
    fontWeight: 700,
    padding: "2px 0",
    borderBottom: "2px solid #a855f7",
    display: "inline-block",
  };

  // Document upload config
  const docItems = [
    { key: "doc_permit", label: "Permit" },
    { key: "doc_insurance", label: "Insurance" },
    { key: "doc_vehicle_rc", label: "Vehicle RC" },
    { key: "doc_fitness", label: "Fitness" },
    { key: "doc_pollution", label: "Pollution" },
  ];

  // Refs for hidden file inputs
  const fileInputRefs = useRef({});

  // Hold the real File object for upload; `form[docKey]` only stores the file
  // NAME for display, and the backend replaces the path only when a file is sent.
  const handleFileSelect = (docKey) => (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // 5 MB limit mirrors the multer config in backend/middleware/upload.js
      if (file.size > 5 * 1024 * 1024) {
        showError(`${file.name} is larger than 5 MB`);
        event.target.value = "";
        return;
      }
      setFiles((prev) => ({ ...prev, [docKey]: file }));
      updateField(docKey, file.name);
    }
    // Reset input so the same file can be selected again
    event.target.value = "";
  };

  // A doc tile is "filled" when a file was just picked OR the saved record
  // already has a stored path for it.
  const docName = (docKey) => files[docKey]?.name || form[docKey] || "";
  const docLabel = (docKey) => {
    const raw = docName(docKey);
    if (!raw) return "";
    const base = String(raw).replace(/\\/g, "/").split("/").pop();
    return base.length > 22 ? `${base.slice(0, 10)}…${base.slice(-8)}` : base;
  };
  const docUrl = (docKey) => {
    if (files[docKey]) return "";
    const raw = form[docKey];
    if (!raw) return "";
    const base = String(raw).replace(/\\/g, "/").split("/").pop();
    const api = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    return `${api}/public/lorry-file/${encodeURIComponent(base)}`;
  };

  // Columns for the Lorry list grid (read-only; editing happens in the form above)
  const lorryListColumns = [
    { key: "vehicle_no", label: "Vehicle No", minWidth: 150, flex: 0.9 },
    { key: "owner_name", label: "Owner", minWidth: 280, flex: 1.6 },
    { key: "vehicle_ownership", label: "Ownership", minWidth: 120, flex: 0.7 },
    { key: "vehicle_type", label: "Type", minWidth: 130, flex: 0.8 },
    { key: "make", label: "Make", minWidth: 140, flex: 0.9 },
    { key: "model", label: "Model", minWidth: 160, flex: 1 },
    { key: "carrying_capacity_kg", label: "Capacity (Kg)", minWidth: 130, type: "number", flex: 0.7 },
    { key: "is_active", label: "Status", minWidth: 100, flex: 0.5 },
  ];

  return (
    <MainLayout>
      <PageBody title="Lorry Master">
        <Box
          sx={{
            "& .pageToolbar": { mb: "8px !important" },
            "& .formPanel": { padding: "8px 10px", marginBottom: "8px", borderRadius: "8px" },
            "& .formGrid": { gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))" },
            "& .MuiFormControl-root": { minHeight: "auto" },
            "& .MuiFormControlLabel-root": { mr: 1, ml: 0, my: 0 },
          }}
        >
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <Tooltip title="Create New">
            <IconButton onClick={clearForm} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit / View">
            <IconButton
              onClick={() => handleVehicleNoLookup(undefined, { force: true })}
              size="small"
              sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton onClick={clearForm} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh List">
            <IconButton onClick={loadLorries} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={isEditing ? "Update" : "Save"}>
            <span>
              <IconButton
                onClick={saveLorry}
                disabled={isSaving}
                size="small"
                sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}
              >
                <SaveIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>

        {/* ═══════════════════ TOP SECTION ═══════════════════ */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            px: 1,
            py: 0.25,
            mb: 0.5,
            minHeight: 0,
            borderRadius: "8px",
            border: "1.5px solid #e2e8f0",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <Box sx={{ minWidth: 180, maxWidth: 220 }}>
            <MuiSelect
              label="Vehicle Type *"
              name="vehicle_type"
              value={form.vehicle_type}
              onChange={updateField}
              options={vehicleTypeOptions.length ? vehicleTypeOptions : ["LCV", "MCV", "HCV", "Trailer", "Tractor"]}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
              Vehicle Ownership *
            </Typography>
            <FormGroup row sx={{ flexWrap: "nowrap" }}>
              {["Market Vehicle", "Own Vehicle"].map((label) => {
                const value = label === "Market Vehicle" ? "Market" : "Own";
                return (
                  <FormControlLabel
                    key={value}
                    sx={{ mr: 1, ml: 0, my: 0 }}
                    control={
                      <Checkbox
                        checked={form.vehicle_ownership === value}
                        onChange={() => updateField("vehicle_ownership", form.vehicle_ownership === value ? "" : value)}
                        size="small"
                        sx={{ p: 0.25, "&.Mui-checked": { color: "#a855f7" } }}
                      />
                    }
                    label={<span style={{ fontSize: "12px" }}>{label}</span>}
                  />
                );
              })}
            </FormGroup>
          </Box>

          <Tooltip title="Refresh"><IconButton size="small" onClick={loadLorries} sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}><RefreshIcon /></IconButton></Tooltip>
        </Box>

        {/* ═══════════════════ VEHICLE DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Vehicle Details</h3>
        <FormPanel>
          <TextField size="small" label="Vehicle Number" fullWidth sx={fieldSx}
            value={form.vehicle_no}
            onChange={(e) => updateField("vehicle_no", normalizeVehicleNo(e.target.value))}
            onKeyDown={handleVehicleNoLookup}
            onBlur={handleVehicleNoLookup}
            slotProps={{ htmlInput: { maxLength: 20, autoCapitalize: "characters", spellCheck: false, style: { textTransform: "uppercase" } } }} />
          <TextField size="small" label="Owner Name" fullWidth
            sx={{ ...fieldSx, gridColumn: "span 2", minWidth: 320 }}
            value={form.owner_name} onChange={(e) => updateField("owner_name", e.target.value)} />
          <TextField size="small" label="Make" fullWidth sx={fieldSx}
            value={form.make} onChange={(e) => updateField("make", e.target.value)} />
          <TextField size="small" label="Model" fullWidth sx={fieldSx}
            value={form.model} onChange={(e) => updateField("model", e.target.value)} />
          <TextField size="small" label="Engine Number" fullWidth sx={fieldSx}
            value={form.engine_no} onChange={(e) => updateField("engine_no", e.target.value)} />
          <TextField size="small" label="Chassis Number" fullWidth sx={fieldSx}
            value={form.chassis_no} onChange={(e) => updateField("chassis_no", e.target.value)} />
          <MuiSelect label="Fuel Type" name="fuel_type" value={form.fuel_type} onChange={updateField}
            options={fuelTypeOptions} />
          <FormField label="Tax Exp. Date" name="tax_exp_date" form={form} setForm={setForm} type="date" />
          <MuiSelect label="Body Type" name="body_type" value={form.body_type} onChange={updateField}
            options={bodyTypeOptions} />
          <FormField label="Fitness Exp. Date" name="fitness_exp_date" form={form} setForm={setForm} type="date" />
          <TextField size="small" label="Vehicle Registered Year" fullWidth sx={fieldSx}
            value={form.regis_year} onChange={(e) => updateField("regis_year", e.target.value)} />
          <TextField size="small" label="Registration RTO" fullWidth sx={fieldSx}
            value={form.regis_rto} onChange={(e) => updateField("regis_rto", e.target.value)} />
          <MuiSelect label="Emission Stage" name="emission_stage" value={form.emission_stage} onChange={updateField}
            options={["BS3", "BS4", "BS6", "Euro 3", "Euro 4", "Euro 5", "Euro 6"]} />
          <FormField label="PUC Exp. Date" name="puc_exp_date" form={form} setForm={setForm} type="date" />
          <TextField size="small" label="Financer" fullWidth sx={fieldSx}
            value={form.financer} onChange={(e) => updateField("financer", e.target.value)} />
          <MuiSelect label="Black Listed" name="black_listed" value={form.black_listed} onChange={updateField}
            options={["No", "Yes"]} />
          <MuiSelect label="Is Active" name="is_active" value={form.is_active} onChange={updateField}
            options={["Active", "Inactive"]} />
          <FormField label="Insurance Company Name" name="insurance_company_name" form={form} setForm={setForm} />
          <FormField label="Insurance Policy No" name="insurance_policy_no" form={form} setForm={setForm} />
          <FormField label="Insurance Type" name="insurance_type" form={form} setForm={setForm} options={["Comprehensive", "Third Party", "Own Damage", "Liability Only"]} />
          <FormField label="Insurance To Date" name="insurance_to_date" form={form} setForm={setForm} type="date" />
          <FormField label="UnLaden Weight (Kg)" name="unladen_weight_kg" form={form} setForm={setForm} type="number" />
          <FormField label="Carrying Capacity (Kg)" name="carrying_capacity_kg" form={form} setForm={setForm} type="number" />
        </FormPanel>

        {/* ═══════════════════ OWN VEHICLE EXTRA DETAILS ═══════════════════ */}
        <h3 style={{
          ...sectionStyle,
          opacity: form.vehicle_ownership === "Own" ? 1 : 0.45,
        }}>
          🔹 Own Vehicle Extra Details
          {form.vehicle_ownership !== "Own" && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}> (Select Own Vehicle)</span>
          )}
        </h3>
        <Box sx={{
          opacity: form.vehicle_ownership === "Own" ? 1 : 0.45,
          pointerEvents: form.vehicle_ownership === "Own" ? "auto" : "none",
        }}>
        <FormPanel>
          <TextField size="small" label="Fleet Number" fullWidth sx={fieldSx}
            value={form.fleet_no} onChange={(e) => updateField("fleet_no", e.target.value)} />
          <MuiSelect label="Driver Pay Type" name="driver_pay_type" value={form.driver_pay_type} onChange={updateField}
            options={["Fixed", "Per Trip", "Per Km", "Percentage"]} />
          <TextField size="small" label="Max No of Tyres" fullWidth sx={fieldSx} type="number"
            value={form.max_no_tyres} onChange={(e) => updateField("max_no_tyres", e.target.value)} />
          <FormField label="Loan No" name="loan_no" form={form} setForm={setForm} />
          <FormField label="HP Status" name="hp_status" form={form} setForm={setForm} options={["Active", "Closed", "None"]} />
          <FormField label="Fuel Tank Capacity" name="fuel_tank_capacity" form={form} setForm={setForm} type="number" />
          <FormField label="Fuel Ratio" name="fuel_ratio" form={form} setForm={setForm} type="number" />
          <FormField label="DEF Tank Capacity" name="def_tank_capacity" form={form} setForm={setForm} type="number" />
          <FormField label="Length (ft)" name="length_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Breadth (ft)" name="breadth_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Height (ft)" name="height_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Volume (CBM)" name="volume_cbm" form={form} setForm={setForm} type="number" />
          <FormField label="Ground Clearance (mm)" name="ground_clearence_mm" form={form} setForm={setForm} type="number" />
        </FormPanel>
        </Box>

        {/* ═══════════════════ DOCUMENT UPLOAD ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Document Upload</h3>
        <Paper
          elevation={0}
          sx={{
            p: 1,
            borderRadius: "8px",
            border: "1.5px solid #e2e8f0",
            background: "#fafafa",
            mb: 1,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 1,
            }}
          >
            {docItems.map((doc) => (
              <Paper
                key={doc.key}
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  minHeight: 44,
                  borderRadius: "8px",
                  border: docName(doc.key) ? "1.5px solid #a855f7" : "1.5px dashed #d1d5db",
                  background: docName(doc.key)
                    ? "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
                    : "#ffffff",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "#a855f7",
                    background: "#faf5ff",
                  },
                }}
                onClick={() => {
                  fileInputRefs.current[doc.key]?.click();
                }}
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 20,
                    flexShrink: 0,
                    color: docName(doc.key) ? "#a855f7" : "#94a3b8",
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: docName(doc.key) ? "#7e22ce" : "#64748b", lineHeight: 1.2 }}>
                    {doc.label}
                  </Typography>
                  <Typography noWrap title={docName(doc.key)} sx={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.2 }}>
                    {docLabel(doc.key) || "Click to upload"}
                  </Typography>
                </Box>
                {docUrl(doc.key) && (
                  <Chip
                    label="View"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(docUrl(doc.key), "_blank", "noopener,noreferrer");
                    }}
                    sx={{ height: 20, fontSize: "10px", fontWeight: 600, background: "#ede9fe", color: "#6d28d9" }}
                  />
                )}
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[doc.key] = el; }}
                  onChange={handleFileSelect(doc.key)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: "none" }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </Paper>
            ))}
          </Box>
        </Paper>
        </Box>

        {/* ═══════════════════ LORRY LIST (Read / Edit / Delete) ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Lorry List</h3>
        <DataTable
          columns={lorryListColumns}
          rows={lorries}
          getKey={(row) => row.rec_id}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editLorry },
            { label: "Delete", icon: <DeleteIcon />, onClick: handleDeleteLorry },
          ]}
          isHeight={260}
        />

      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}