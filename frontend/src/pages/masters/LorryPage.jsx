import { useEffect, useState, useRef } from "react";
import { SaveIcon, RefreshIcon, ClearIcon, NoteAddIcon, EditIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  FormField,
} from "../../components/common/MasterPage";
import {
  fetchAllLorries,
  createLorry,
  updateLorry,
  deleteLorry,
  fetchLorryByVehicleNo,
} from "../../utils/lorryMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import VideocamIcon from "@mui/icons-material/Videocam";
import BuildIcon from "@mui/icons-material/Build";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SpeedIcon from "@mui/icons-material/Speed";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import AirlineSeatFlatIcon from "@mui/icons-material/AirlineSeatFlat";
import BedIcon from "@mui/icons-material/Bed";
import LuggageIcon from "@mui/icons-material/Luggage";
import EmergencyIcon from "@mui/icons-material/Emergency";

const emptyLorryForm = {
  // ── Top Section ──
  vehicle_type: "",
  vehicle_ownership: "",

  // ── Vehicle Details ──
  vehicle_no: "",
  branch_code: "",
  chassis_no: "",
  fleet_no: "",
  owner_name: "",
  make: "",
  model: "",
  engine_no: "",
  engine_power_hp: "",
  tax_token: "",
  tax_from_date: "",
  tax_exp_date: "",
  body_type: "",
  floor_type: "",
  fitness_from_date: "",
  fitness_exp_date: "",
  regis_year: "",
  regis_rto: "",
  lorry_condition: "",
  emission_stage: "",
  tax_issue_place: "",
  puc_no: "",
  puc_exp_date: "",
  fastag_provider: "",
  fastag_id: "",
  vehicle_assigned_to: "",
  vehicle_category: "",
  driver_pay_type: "",
  gps_service_provider: "",
  gps_device_id: "",
  financer: "",
  loan_no: "",
  hp_status: "",
  battery_capacity: "",
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
  laden_weight_kg: "",
  unladen_weight_kg: "",
  carrying_capacity_kg: "",
  ground_clearence_mm: "",

  // ── Insurance Details ──
  insurance_company_name: "",
  insurance_policy_no: "",
  insurance_type: "",
  insurance_cert_no: "",
  insurance_amount: "",
  insurance_from_date: "",
  insurance_to_date: "",

  // ── Permit Details ──
  permit_no: "",
  permit_date: "",
  permit_type: "",
  permit_expiry_date: "",
  num_fitted_tyre: "",
  num_stepney: "",
  tyre_size: "",

  // ── Equipment Details ──
  has_first_aid: false,
  has_fire_extinguisher: false,
  has_speed_governor: false,
  has_abs: false,
  has_rear_view_camera: false,
  has_jack: false,
  has_tool_kit: false,
  has_cabin: false,
  cabin_type: "",

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
  vehicle_no: row.vehicle_no ?? "",
  branch_code: row.branch_code ?? "",
  chassis_no: row.chassis_no ?? "",
  fleet_no: row.fleet_no ?? "",
  owner_name: row.owner_name ?? "",
  make: row.make ?? "",
  model: row.model ?? "",
  engine_no: row.engine_no ?? "",
  engine_power_hp: row.engine_power_hp ?? "",
  tax_token: row.tax_token ?? "",
  tax_from_date: row.tax_from_date ? row.tax_from_date.slice(0, 10) : "",
  tax_exp_date: row.tax_exp_date ? row.tax_exp_date.slice(0, 10) : "",
  body_type: row.body_type ?? "",
  floor_type: row.floor_type ?? "",
  fitness_from_date: row.fitness_from_date ? row.fitness_from_date.slice(0, 10) : "",
  fitness_exp_date: row.fitness_exp_date ? row.fitness_exp_date.slice(0, 10) : "",
  regis_year: row.regis_year ?? "",
  regis_rto: row.regis_rto ?? "",
  lorry_condition: row.lorry_condition ?? "",
  emission_stage: row.emission_stage ?? "",
  tax_issue_place: row.tax_issue_place ?? "",
  puc_no: row.puc_no ?? "",
  puc_exp_date: row.puc_exp_date ? row.puc_exp_date.slice(0, 10) : "",
  fastag_provider: row.fastag_provider ?? "",
  fastag_id: row.fastag_id ?? "",
  vehicle_assigned_to: row.vehicle_assigned_to ?? "",
  vehicle_category: row.vehicle_category ?? "",
  driver_pay_type: row.driver_pay_type ?? "",
  gps_service_provider: row.gps_service_provider ?? "",
  gps_device_id: row.gps_device_id ?? "",
  financer: row.financer ?? "",
  loan_no: row.loan_no ?? "",
  hp_status: row.hp_status ?? "",
  battery_capacity: row.battery_capacity ?? "",
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
  laden_weight_kg: row.laden_weight_kg ?? "",
  unladen_weight_kg: row.unladen_weight_kg ?? "",
  carrying_capacity_kg: row.carrying_capacity_kg ?? "",
  ground_clearence_mm: row.ground_clearence_mm ?? "",

  // ── Insurance Details ──
  insurance_company_name: row.insurance_company_name ?? "",
  insurance_policy_no: row.insurance_policy_no ?? "",
  insurance_type: row.insurance_type ?? "",
  insurance_cert_no: row.insurance_cert_no ?? "",
  insurance_amount: row.insurance_amount ?? "",
  insurance_from_date: row.insurance_from_date ? row.insurance_from_date.slice(0, 10) : "",
  insurance_to_date: row.insurance_to_date ? row.insurance_to_date.slice(0, 10) : "",

  // ── Permit Details ──
  permit_no: row.permit_no ?? "",
  permit_date: row.permit_date ? row.permit_date.slice(0, 10) : "",
  permit_type: row.permit_type ?? "",
  permit_expiry_date: row.permit_expiry_date ? row.permit_expiry_date.slice(0, 10) : "",
  num_fitted_tyre: row.num_fitted_tyre ?? "",
  num_stepney: row.num_stepney ?? "",
  tyre_size: row.tyre_size ?? "",

  // ── Equipment Details ──
  has_first_aid: row.has_first_aid ?? false,
  has_fire_extinguisher: row.has_fire_extinguisher ?? false,
  has_speed_governor: row.has_speed_governor ?? false,
  has_abs: row.has_abs ?? false,
  has_rear_view_camera: row.has_rear_view_camera ?? false,
  has_jack: row.has_jack ?? false,
  has_tool_kit: row.has_tool_kit ?? false,
  has_cabin: row.has_cabin ?? false,
  cabin_type: row.cabin_type ?? "",

  // ── Document Upload ──
  doc_permit: row.doc_permit ?? "",
  doc_insurance: row.doc_insurance ?? "",
  doc_vehicle_rc: row.doc_vehicle_rc ?? "",
  doc_fitness: row.doc_fitness ?? "",
  doc_pollution: row.doc_pollution ?? "",
});

export default function LorryPage() {

  const [lorries, setLorries] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");

  const [form, setForm] = useState(emptyLorryForm);

  const [isEditing, setIsEditing] = useState(false);
  const [originalLorry, setOriginalLorry] = useState(null);

  const clearForm = () => {
    setForm(emptyLorryForm);
    setIsEditing(false);
    setOriginalLorry(null);
  };

  const loadLorries = async () => {
    try {
      const data = await fetchAllLorries();
      setLorries(data);
    } catch (err) {
      showError(err.message || "Failed to load lorries");
      console.error("Load lorries error:", err);
    }
  };

  const saveLorry = async () => {
    if (!form.vehicle_no) {
      showError("Vehicle Number is required");
      return;
    }

    const payload = {
      ...form,
      engine_power_hp: form.engine_power_hp ? Number(form.engine_power_hp) : null,
      battery_capacity: form.battery_capacity ? Number(form.battery_capacity) : null,
      fuel_tank_capacity: form.fuel_tank_capacity ? Number(form.fuel_tank_capacity) : null,
      fuel_ratio: form.fuel_ratio ? Number(form.fuel_ratio) : null,
      def_tank_capacity: form.def_tank_capacity ? Number(form.def_tank_capacity) : null,
      length_mm: form.length_mm ? Number(form.length_mm) : null,
      breadth_mm: form.breadth_mm ? Number(form.breadth_mm) : null,
      height_mm: form.height_mm ? Number(form.height_mm) : null,
      volume_cbm: form.volume_cbm ? Number(form.volume_cbm) : null,
      laden_weight_kg: form.laden_weight_kg ? Number(form.laden_weight_kg) : null,
      unladen_weight_kg: form.unladen_weight_kg ? Number(form.unladen_weight_kg) : null,
      carrying_capacity_kg: form.carrying_capacity_kg ? Number(form.carrying_capacity_kg) : null,
      insurance_amount: form.insurance_amount ? Number(form.insurance_amount) : null,
      num_fitted_tyre: form.num_fitted_tyre ? Number(form.num_fitted_tyre) : null,
      num_stepney: form.num_stepney ? Number(form.num_stepney) : null,
      max_no_tyres: form.max_no_tyres ? Number(form.max_no_tyres) : null,
      ground_clearence_mm: form.ground_clearence_mm ? Number(form.ground_clearence_mm) : null,
    };

    try {
      if (isEditing && originalLorry?.rec_id) {
        await updateLorry(originalLorry.rec_id, payload);
        setLorries((prev) =>
          prev.map((lorry) =>
            lorry.rec_id === originalLorry.rec_id ? { ...lorry, ...payload } : lorry
          )
        );
        showSuccess("Lorry updated successfully");
      } else {
        const created = await createLorry(payload);
        setLorries((prev) => [...prev, ...(Array.isArray(created) ? created : [created])]);
        showSuccess("Lorry created successfully");
      }
      clearForm();
    } catch (err) {
      showError(err.message || "Failed to save lorry");
      console.error("Save lorry error:", err);
    }
  };

  const editLorry = (row) => {
    setForm(mapLorryToForm(row));
    setOriginalLorry(row);
    setIsEditing(true);
  };

  const handleDeleteLorry = (rec_id) => {
    showWarning("Confirm Delete", "Delete Lorry ?",
      async () => {
        try {
          await deleteLorry(rec_id);
          setLorries((prev) => prev.filter((x) => x.rec_id !== rec_id));
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

  const handleVehicleNoKeyDown = async (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const vno = form.vehicle_no?.trim();
      if (!vno) return;
      try {
        const data = await fetchLorryByVehicleNo(vno);
        if (data) {
          setForm(mapLorryToForm(data));
          setOriginalLorry(data);
          setIsEditing(true);
          showSuccess("Lorry details loaded for editing");
        } else {
          clearForm();
          updateField("vehicle_no", vno);
          setIsEditing(false);
          showWarning("Vehicle not found. Creating new entry.");
        }
      } catch (err) {
        showError(err.message || "Failed to fetch lorry details");
        console.error("Fetch lorry by vehicle no error:", err);
      }
    }
  };

  const [, setError] = useState("");
  const [, setLoading] = useState(true);

  useEffect(() => {
    const loadLorriesAtMount = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllLorries();
        setLorries(data);
      } catch (err) {
        setError(err.message || "Failed to load lorries");
        console.error("Error loading lorries:", err);
      } finally {
        setLoading(false);
      }
    };

    loadLorriesAtMount();
  }, []);

  // Check if any Own Vehicle Extra Details field has data
  const hasOwnVehicleData = Boolean(
    form.loan_no || form.hp_status || form.battery_capacity || 
    form.fuel_tank_capacity || form.fuel_ratio || form.def_tank_capacity || 
    form.fuel_type
  );

  const sectionStyle = {
    margin: "24px 0 10px",
    color: "#1e293b",
    fontSize: "17px",
    fontWeight: 700,
    padding: "8px 0",
    borderBottom: "2px solid #a855f7",
    display: "inline-block",
  };

  // Equipment items config
  const equipmentItems = [
    { key: "has_first_aid", label: "First Aid", icon: <EmergencyIcon sx={{ fontSize: 28 }} /> },
    { key: "has_fire_extinguisher", label: "Fire Extinguisher", icon: <LocalFireDepartmentIcon sx={{ fontSize: 28 }} /> },
    { key: "has_speed_governor", label: "Speed Governor", icon: <SpeedIcon sx={{ fontSize: 28 }} /> },
    { key: "has_abs", label: "ABS", icon: <CarRepairIcon sx={{ fontSize: 28 }} /> },
    { key: "has_rear_view_camera", label: "Rear View Camera", icon: <VideocamIcon sx={{ fontSize: 28 }} /> },
    { key: "has_jack", label: "Jack", icon: <BuildIcon sx={{ fontSize: 28 }} /> },
    { key: "has_tool_kit", label: "Tool Kit", icon: <LuggageIcon sx={{ fontSize: 28 }} /> },
    { key: "has_cabin", label: "Cabin", icon: <AirlineSeatFlatIcon sx={{ fontSize: 28 }} /> },
  ];

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
  const docInputRef = useRef(null);

  const handleFileSelect = (docKey) => (event) => {
    const file = event.target.files?.[0];
    if (file) {
      updateField(docKey, file.name);
    }
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  return (
    <MainLayout>
      <PageBody title="Lorry Master">
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <Tooltip title="Create New">
            <IconButton onClick={clearForm} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit / View">
            <IconButton
              onClick={() => {
                const vno = form.vehicle_no?.trim();
                if (!vno) {
                  showError("Please enter a Vehicle Number first");
                  return;
                }
                handleVehicleNoKeyDown({ key: "Enter", preventDefault: () => {} });
              }}
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
          <Tooltip title="Save">
            <IconButton onClick={saveLorry} size="small" sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* ═══════════════════ TOP SECTION ═══════════════════ */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
            p: 2.5,
            mb: 1,
            borderRadius: "14px",
            border: "1.5px solid #e2e8f0",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <FormControl component="fieldset" size="small">
            <FormLabel sx={{ fontSize: "13px", fontWeight: 600, color: "#475569", mb: 0.5 }}>
              Vehicle Ownership
            </FormLabel>
            <FormGroup row>
              {["Market Vehicle", "Vendor Vehicle", "Own Vehicle"].map((label) => {
                const value = label === "Market Vehicle" ? "Market" : label === "Vendor Vehicle" ? "Vendor" : "Own";
                return (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={form.vehicle_ownership === value}
                        onChange={() => updateField("vehicle_ownership", form.vehicle_ownership === value ? "" : value)}
                        size="small"
                        sx={{ "&.Mui-checked": { color: "#a855f7" } }}
                      />
                    }
                    label={<span style={{ fontSize: "13px" }}>{label}</span>}
                  />
                );
              })}
            </FormGroup>
          </FormControl>

          <Tooltip title="Refresh"><IconButton size="small" onClick={loadLorries} sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}><RefreshIcon /></IconButton></Tooltip>
        </Box>

        {/* ═══════════════════ VEHICLE DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Vehicle Details</h3>
        <FormPanel>
          <FormField label="Vehicle Number" name="vehicle_no" form={form} setForm={setForm}
            inputProps={{
              onKeyDown: handleVehicleNoKeyDown,
            }}
          />
          <FormField label="Branch Code" name="branch_code" form={form} setForm={setForm} />
          <FormField label="Chassis Number" name="chassis_no" form={form} setForm={setForm} />
          <FormField label="Fleet Number" name="fleet_no" form={form} setForm={setForm} />
          <FormField label="Owner Name" name="owner_name" form={form} setForm={setForm} />
          <FormField label="Make" name="make" form={form} setForm={setForm} />
          <FormField label="Model" name="model" form={form} setForm={setForm} />
          <FormField label="Engine Number" name="engine_no" form={form} setForm={setForm} />
          <FormField label="Engine Power HP" name="engine_power_hp" form={form} setForm={setForm} type="number" />
          <FormField label="Tax Token" name="tax_token" form={form} setForm={setForm} />
          <FormField label="Tax From Date" name="tax_from_date" form={form} setForm={setForm} type="date" />
          <FormField label="Tax Exp. Date" name="tax_exp_date" form={form} setForm={setForm} type="date" />
          <FormField label="Body Type" name="body_type" form={form} setForm={setForm} options={["Open Body", "Closed Body", "Container", "Tanker", "Flat Bed", "Refrigerated", "Hydraulic"]} />
          <FormField label="Floor Type" name="floor_type" form={form} setForm={setForm} options={["Wooden", "Aluminum", "Steel", "PVC", "Rubber Mat"]} />
          <FormField label="Fitness From Date" name="fitness_from_date" form={form} setForm={setForm} type="date" />
          <FormField label="Fitness Exp. Date" name="fitness_exp_date" form={form} setForm={setForm} type="date" />
          <FormField label="Vehicle Registered Year" name="regis_year" form={form} setForm={setForm} />
          <FormField label="Registration RTO" name="regis_rto" form={form} setForm={setForm} />
          <FormField label="Lorry Condition" name="lorry_condition" form={form} setForm={setForm} options={["Excellent", "Good", "Average", "Poor"]} />
          <FormField label="Emission Stage" name="emission_stage" form={form} setForm={setForm} options={["BS3", "BS4", "BS6", "Euro 3", "Euro 4", "Euro 5", "Euro 6"]} />
          <FormField label="Tax Issue Place" name="tax_issue_place" form={form} setForm={setForm} />
          <FormField label="PUC No" name="puc_no" form={form} setForm={setForm} />
          <FormField label="PUC Exp. Date" name="puc_exp_date" form={form} setForm={setForm} type="date" />
          <FormField label="Fastag Provider" name="fastag_provider" form={form} setForm={setForm} options={["ICICI", "HDFC", "SBI", "Axis", "Paytm", "Airtel", "Other"]} />
          <FormField label="Fastag ID" name="fastag_id" form={form} setForm={setForm} />
          <FormField label="Vehicle Assigned To" name="vehicle_assigned_to" form={form} setForm={setForm} />
          <FormField label="Vehicle Category" name="vehicle_category" form={form} setForm={setForm} options={["LCV", "MCV", "HCV", "Trailer", "Tractor"]} />
          <FormField label="Driver Pay Type" name="driver_pay_type" form={form} setForm={setForm} options={["Fixed", "Per Trip", "Per Km", "Percentage"]} />
          <FormField label="GPS Service Provider" name="gps_service_provider" form={form} setForm={setForm} />
          <FormField label="GPS Device ID" name="gps_device_id" form={form} setForm={setForm} />
          <FormField label="Financer" name="financer" form={form} setForm={setForm} />
          <FormField label="Max No of Tyres" name="max_no_tyres" form={form} setForm={setForm} type="number" />
          <FormField label="Black Listed" name="black_listed" form={form} setForm={setForm} options={["No", "Yes"]} />
          <FormField label="Is Active" name="is_active" form={form} setForm={setForm} options={["Active", "Inactive"]} />
        </FormPanel>

        {/* ═══════════════════ OWN VEHICLE EXTRA DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Own Vehicle Extra Details</h3>
        <FormPanel>
          <FormField label="Loan No" name="loan_no" form={form} setForm={setForm} />
          <FormField label="HP Status" name="hp_status" form={form} setForm={setForm} options={["Active", "Closed", "None"]} />
          <FormField label="Battery Capacity" name="battery_capacity" form={form} setForm={setForm} type="number" />
          <FormField label="Fuel Tank Capacity" name="fuel_tank_capacity" form={form} setForm={setForm} type="number" />
          <FormField label="Fuel Ratio" name="fuel_ratio" form={form} setForm={setForm} type="number" />
          <FormField label="DEF Tank Capacity" name="def_tank_capacity" form={form} setForm={setForm} type="number" />
          <FormField label="Fuel Type" name="fuel_type" form={form} setForm={setForm} options={["Diesel", "Petrol", "CNG", "LNG", "Electric", "Hybrid"]} />
        </FormPanel>

        {/* ═══════════════════ WEIGHT VOLUME DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Weight Volume Details</h3>
        <FormPanel>
          <FormField label="Length (mm)" name="length_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Breadth (mm)" name="breadth_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Height (mm)" name="height_mm" form={form} setForm={setForm} type="number" />
          <FormField label="Volume (CBM)" name="volume_cbm" form={form} setForm={setForm} type="number" />
          <FormField label="Laden Weight (Kg)" name="laden_weight_kg" form={form} setForm={setForm} type="number" />
          <FormField label="UnLaden Weight (Kg)" name="unladen_weight_kg" form={form} setForm={setForm} type="number" />
          <FormField label="Carrying Capacity (Kg)" name="carrying_capacity_kg" form={form} setForm={setForm} type="number" />
          <FormField label="Ground Clearance (mm)" name="ground_clearence_mm" form={form} setForm={setForm} type="number" />
        </FormPanel>

        {/* ═══════════════════ INSURANCE DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Insurance Details</h3>
        <FormPanel>
          <FormField label="Insurance Company Name" name="insurance_company_name" form={form} setForm={setForm} />
          <FormField label="Insurance Policy No" name="insurance_policy_no" form={form} setForm={setForm} />
          <FormField label="Insurance Type" name="insurance_type" form={form} setForm={setForm} options={["Comprehensive", "Third Party", "Own Damage", "Liability Only"]} />
          <FormField label="Insurance Certificate No." name="insurance_cert_no" form={form} setForm={setForm} />
          <FormField label="Insurance Amount" name="insurance_amount" form={form} setForm={setForm} type="number" />
          <FormField label="Insurance From Date" name="insurance_from_date" form={form} setForm={setForm} type="date" />
          <FormField label="To Date" name="insurance_to_date" form={form} setForm={setForm} type="date" />
        </FormPanel>

        {/* ═══════════════════ PERMIT DETAILS ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Permit Details</h3>
        <FormPanel>
          <FormField label="Permit No" name="permit_no" form={form} setForm={setForm} />
          <FormField label="Permit Date" name="permit_date" form={form} setForm={setForm} type="date" />
          <FormField label="Permit Type" name="permit_type" form={form} setForm={setForm} options={["National", "State", "Local", "Temporary"]} />
          <FormField label="Permit Expiry Date" name="permit_expiry_date" form={form} setForm={setForm} type="date" />
          <FormField label="Number of Fitted Tyre" name="num_fitted_tyre" form={form} setForm={setForm} type="number" />
          <FormField label="Number Of Stepney" name="num_stepney" form={form} setForm={setForm} type="number" />
          <FormField label="Tyre Size" name="tyre_size" form={form} setForm={setForm} />
        </FormPanel>

        {/* ═══════════════════ EQUIPMENT DETAILS ═══════════════════ */}
        <h3 style={{
          ...sectionStyle,
          opacity: hasOwnVehicleData ? 1 : 0.4,
        }}>🔹 Equipment Details {!hasOwnVehicleData && <span style={{fontSize: 12, fontWeight: 400, color: '#94a3b8'}}>(Fill Own Vehicle Extra Details first)</span>}</h3>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "14px",
            border: "1.5px solid #e2e8f0",
            background: "#fafafa",
            mb: 2,
            opacity: hasOwnVehicleData ? 1 : 0.4,
            pointerEvents: hasOwnVehicleData ? "auto" : "none",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
              gap: 2,
            }}
          >
            {equipmentItems.map((item) => (
              <Paper
                key={item.key}
                elevation={0}
                onClick={() => updateField(item.key, !form[item.key])}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  p: 2,
                  borderRadius: "12px",
                  cursor: "pointer",
                  border: form[item.key] ? "2px solid #a855f7" : "2px solid #e2e8f0",
                  background: form[item.key]
                    ? "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
                    : "#ffffff",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: form[item.key] ? "#9333ea" : "#cbd5e1",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <Box
                  sx={{
                    color: form[item.key] ? "#a855f7" : "#94a3b8",
                    transition: "color 0.2s",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: form[item.key] ? "#7e22ce" : "#64748b",
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Typography>
                {form[item.key] && (
                  <CheckCircleIcon sx={{ fontSize: 16, color: "#a855f7" }} />
                )}
              </Paper>
            ))}
          </Box>

          {/* Cabin Type - shown when Cabin is checked */}
          {form.has_cabin && (
            <Box sx={{ mt: 2, maxWidth: 320 }}>
              <FormField label="Cabin Type" name="cabin_type" form={form} setForm={setForm} options={["Day Cabin", "Sleeper Cabin", "Double Sleeper", "Crew Cabin"]} />
            </Box>
          )}
        </Paper>

        {/* ═══════════════════ DOCUMENT UPLOAD ═══════════════════ */}
        <h3 style={sectionStyle}>🔹 Document Upload</h3>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "14px",
            border: "1.5px solid #e2e8f0",
            background: "#fafafa",
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
              gap: 2,
            }}
          >
            {docItems.map((doc) => (
              <Paper
                key={doc.key}
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2.5,
                  borderRadius: "12px",
                  border: form[doc.key] ? "2px solid #a855f7" : "2px dashed #d1d5db",
                  background: form[doc.key]
                    ? "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
                    : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#a855f7",
                    background: "#faf5ff",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(168,85,247,0.12)",
                  },
                }}
                onClick={() => {
                  fileInputRefs.current[doc.key]?.click();
                }}
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 36,
                    color: form[doc.key] ? "#a855f7" : "#94a3b8",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: form[doc.key] ? "#7e22ce" : "#64748b",
                    textAlign: "center",
                  }}
                >
                  {doc.label}
                </Typography>
                {form[doc.key] ? (
                  <Chip
                    label="Uploaded"
                    size="small"
                    icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      background: "#f3e8ff",
                      color: "#7e22ce",
                      fontWeight: 600,
                      fontSize: "11px",
                      "& .MuiChip-icon": { color: "#a855f7" },
                    }}
                  />
                ) : (
                  <Chip
                    label="Upload"
                    size="small"
                    sx={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      fontWeight: 500,
                      fontSize: "11px",
                    }}
                  />
                )}
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[doc.key] = el; }}
                  onChange={handleFileSelect(doc.key)}
                  style={{ display: "none" }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </Paper>
            ))}
          </Box>
        </Paper>

      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}