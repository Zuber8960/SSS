import { useState } from "react";
import { SaveIcon, RefreshIcon, ClearIcon, NoteAddIcon, EditIcon, DeleteIcon, AddRowIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import {
  fetchLorryByVehicleNo,
  createLorry,
  updateLorry,
} from "../../utils/lorryMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import {
  Box,
  FormControl,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  TextField,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options, disabled = false }) {
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

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyLorryForm = {
  // ── 1. Vehicle & Ownership ──
  vehicle_no: "",
  vehicle_ownership: "Own",
  vehicle_type: "",
  vehicle_capacity: "",
  owner_name: "",
  broker_name: "",
  payment_to: "",
  voucher_no: "",

  // ── 2. Trip & Route ──
  from_location: "",
  to_location: "",
  via_1: "",
  via_2: "",
  actual_weight: "",
  guaranteed_weight: "",
  rate_type: "Fixed",
  rate: "",

  // ── 3. Hire Calculation ──
  total_hire: "",
  loading: "",
  other_charges: "",
  advance: "",
  tds: "",

  // ── 4. Trip Expense / Advance ──
  estimated_diesel: "",
  estimated_other_charges: "",
  exp_loading: "",
  exp_other_charges: "",
  advance_diesel: "",
  advance_cash: "",

  // ── 5. Loading Remarks ──
  loading_remarks: "",

  // ── Signatures ──
  prepared_by: "",
  checked_by: "",
  approved_by: "",
  owner_driver_ack: "",
};

const emptyManifestRow = {
  manifest_no: "",
  manifest_date: "",
  from_loc: "",
  from_town: "",
  to_loc: "",
  to_town: "",
  actual_wt: "",
  no_of_cns: "",
  no_of_pkgs: "",
};


export default function LorryPage() {
  const [form, setForm] = useState(emptyLorryForm);
  const [manifestRows, setManifestRows] = useState([]);
  const [originalLorry, setOriginalLorry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    setForm(emptyLorryForm);
    setManifestRows([]);
    setOriginalLorry(null);
    setIsEditing(false);
  };

  // ── Derived: 3. Hire Calculation ──
  const grossAmount = num(form.total_hire) + num(form.loading) + num(form.other_charges);
  const balance = grossAmount - num(form.advance);
  const netAdvance = num(form.advance) - num(form.tds);

  // ── Derived: 4. Trip Expense / Advance ──
  const totalTripAmount = num(form.estimated_diesel) + num(form.estimated_other_charges);
  const expGrossAmount = num(form.exp_loading) + num(form.exp_other_charges);

  // ── Derived: 7. Settlement Summary ──
  const totalAdvance = num(form.advance_diesel) + num(form.advance_cash);
  const totalDeductions = num(form.tds);
  const netPayable = grossAmount - totalAdvance - totalDeductions;

  const handleVehicleNoKeyDown = async (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const vno = form.vehicle_no?.trim();
      if (!vno) return;
      try {
        const data = await fetchLorryByVehicleNo(vno);
        if (data) {
          setForm((prev) => ({
            ...prev,
            vehicle_no: data.vehicle_no ?? vno,
            vehicle_ownership: data.vehicle_ownership ?? prev.vehicle_ownership,
            vehicle_type: data.vehicle_type ?? prev.vehicle_type,
            vehicle_capacity: data.carrying_capacity_kg ?? prev.vehicle_capacity,
            owner_name: data.owner_name ?? prev.owner_name,
          }));
          setOriginalLorry(data);
          setIsEditing(true);
          showSuccess("Lorry details loaded from Lorry Master");
        } else {
          setIsEditing(false);
          setOriginalLorry(null);
        }
      } catch (err) {
        showError(err.message || "Failed to fetch lorry details");
        console.error("Fetch lorry by vehicle no error:", err);
      }
    }
  };

  const saveForm = async () => {
    if (!form.vehicle_no?.trim()) {
      showError("Vehicle Number is required");
      return;
    }
    const sharedPayload = {
      vehicle_no: form.vehicle_no,
      vehicle_ownership: form.vehicle_ownership,
      vehicle_type: form.vehicle_type,
      owner_name: form.owner_name,
      carrying_capacity_kg: form.vehicle_capacity ? Number(form.vehicle_capacity) : null,
    };
    try {
      if (isEditing && originalLorry?.rec_id) {
        await updateLorry(originalLorry.rec_id, sharedPayload);
        showSuccess("Lorry details updated successfully");
      } else {
        const created = await createLorry(sharedPayload);
        const row = Array.isArray(created) ? created[0] : created;
        setOriginalLorry(row);
        setIsEditing(true);
        showSuccess("Lorry details saved successfully");
      }
    } catch (err) {
      showError(err.message || "Failed to save lorry details");
      console.error("Save lorry error:", err);
    }
  };

  // ── Manifest rows handlers ──
  // ── Manifest rows handlers ──
  const addManifestRow = () => setManifestRows((prev) => [...prev, { ...emptyManifestRow }]);

  const updateManifestRow = (idx, field, value) =>
    setManifestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const deleteManifestRow = (row) => {
    showWarning("Confirm Delete", "Remove this manifest row?",
      () => setManifestRows((prev) => prev.filter((r) => r !== row))
    );
  };

  const manifestColumns = [
    { key: "manifest_no", label: "Manifest No.", minWidth: 120, editable: true },
    { key: "manifest_date", label: "Manifest Date", minWidth: 130, editable: true, type: "string", isDate: true },
    { key: "from_loc", label: "Form Loc", minWidth: 110, editable: true },
    { key: "from_town", label: "From Town", minWidth: 120, editable: true },
    { key: "to_loc", label: "To Loc", minWidth: 110, editable: true },
    { key: "to_town", label: "To Town", minWidth: 120, editable: true },
    { key: "actual_wt", label: "Actual Wt.", minWidth: 110, editable: true, type: "number" },
    { key: "no_of_cns", label: "No. of CNs", minWidth: 100, editable: true, type: "number" },
    { key: "no_of_pkgs", label: "No. of Pkgs", minWidth: 110, editable: true, type: "number" },
  ];

  const sectionStyle = {
    margin: "10px 0 6px",
    color: "#1e293b",
    fontSize: "16px",
    fontWeight: 700,
    padding: "6px 0",
    borderBottom: "2px solid #a855f7",
    display: "inline-block",
  };

  const summaryCardSx = (highlight = false) => ({
    p: 2,
    borderRadius: "12px",
    border: highlight ? "2px solid #a855f7" : "1.5px solid #e2e8f0",
    background: highlight ? "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)" : "#ffffff",
  });

  return (
    <MainLayout>
      <PageBody title="Lorry">
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
            <IconButton onClick={saveForm} size="small" sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => showSuccess("Data refreshed")} sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* ═══════════ 1. VEHICLE & OWNERSHIP DETAILS ═══════════ */}
        <h3 style={sectionStyle}>1. Vehicle &amp; Ownership Details</h3>
        <FormPanel columns={4}>
          <TextField size="small" label="Vehicle No" fullWidth sx={fieldSx}
            value={form.vehicle_no} onChange={(e) => updateField("vehicle_no", e.target.value)}
            onKeyDown={handleVehicleNoKeyDown} placeholder="e.g. HR 55 AB 1234" />
          <MuiSelect label="Vehicle Ownership" name="vehicle_ownership" value={form.vehicle_ownership}
            onChange={updateField} options={["Own", "Market", "Vendor"]} />
          <MuiSelect label="Vehicle Type" name="vehicle_type" value={form.vehicle_type}
            onChange={updateField} options={["Truck / Trailer / LCV", "Truck", "Trailer", "LCV", "Tipper", "Container"]} />
          <FormField label="Vehicle Capacity" name="vehicle_capacity" form={form} setForm={setForm} />
          <FormField label="Owner" name="owner_name" form={form} setForm={setForm} />
          <FormField label="Broker" name="broker_name" form={form} setForm={setForm} />
          <MuiSelect label="Payment To" name="payment_to" value={form.payment_to}
            onChange={updateField} options={["Owner / Broker / Vendor", "Owner", "Broker", "Vendor"]} />
          <FormField label="Voucher No (Auto generated)" name="voucher_no" form={form} setForm={setForm} disabled />
        </FormPanel>

        {/* ═══════════ 2. TRIP & ROUTE DETAILS ═══════════ */}
        <h3 style={sectionStyle}>2. Trip &amp; Route Details</h3>
        <FormPanel columns={4}>
          <FormField label="From Location" name="from_location" form={form} setForm={setForm} />
          <FormField label="To Location" name="to_location" form={form} setForm={setForm} />
          <FormField label="Via 1" name="via_1" form={form} setForm={setForm} />
          <FormField label="Via 2" name="via_2" form={form} setForm={setForm} />
          <FormField label="Actual Weight (Kg)" name="actual_weight" form={form} setForm={setForm} type="number" />
          <FormField label="Guaranteed Weight (Kg)" name="guaranteed_weight" form={form} setForm={setForm} type="number" />
          <MuiSelect label="Rate Type" name="rate_type" value={form.rate_type}
            onChange={updateField} options={["Fixed", "Per Kg", "Per Ton", "Per Trip"]} />
          <FormField label="Rate (₹)" name="rate" form={form} setForm={setForm} type="number" />
        </FormPanel>


        {/* ═══════════ 3. HIRE CALCULATION ═══════════ */}
        <h3 style={sectionStyle}>3. Hire Calculation</h3>
        <FormPanel columns={4}>
          <FormField label="Total Hire (₹)" name="total_hire" form={form} setForm={setForm} type="number" />
          <FormField label="Loading (₹)" name="loading" form={form} setForm={setForm} type="number" />
          <FormField label="Other Charges (₹)" name="other_charges" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Gross Amount (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(grossAmount)}`} />
          <FormField label="Advance (₹)" name="advance" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Balance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(balance)}`} />
          <FormField label="TDS (₹)" name="tds" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Net Advance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(netAdvance)}`} />
        </FormPanel>

        {/* ═══════════ 4. TRIP EXPENSE / ADVANCE DETAILS ═══════════ */}
        <h3 style={sectionStyle}>4. Trip Expense / Advance Details</h3>
        <FormPanel columns={4}>
          <FormField label="Estimated Diesel (₹)" name="estimated_diesel" form={form} setForm={setForm} type="number" />
          <FormField label="Estimated Other Charges (₹)" name="estimated_other_charges" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Total Trip Amount (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(totalTripAmount)}`} />
          <FormField label="Loading (₹)" name="exp_loading" form={form} setForm={setForm} type="number" />
          <FormField label="Other Charges (₹)" name="exp_other_charges" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Gross Amount (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(expGrossAmount)}`} />
          <FormField label="Advance Diesel (₹)" name="advance_diesel" form={form} setForm={setForm} type="number" />
          <FormField label="Advance Cash (₹)" name="advance_cash" form={form} setForm={setForm} type="number" />
        </FormPanel>

        {/* ═══════════ 5. LOADING REMARKS ═══════════ */}
        <h3 style={sectionStyle}>5. Loading Remarks</h3>
        <FormPanel>
          <TextField size="small" label="Loading Remarks" fullWidth multiline rows={3} sx={fieldSx}
            value={form.loading_remarks} onChange={(e) => updateField("loading_remarks", e.target.value)}
            placeholder="Enter loading instructions, vehicle condition, special instructions, deductions or remarks..." />
        </FormPanel>


        {/* ═══════════ 6. MANIFEST / SHIPMENT DETAILS ═══════════ */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: "10px" }}>
          <h3 style={{ ...sectionStyle, margin: 0 }}>6. Manifest / Shipment Details</h3>
          <Tooltip title="Add manifest row">
            <IconButton onClick={addManifestRow} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <AddRowIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <DataTable
          columns={manifestColumns}
          rows={manifestRows}
          getKey={(row, index) => index}
          actions={[
            {
              label: "Delete",
              icon: <DeleteIcon />,
              onClick: deleteManifestRow,
            },
          ]}
          editable
          singleClick
          autoHeight
          onCellChange={(rowIndex, key, value) => updateManifestRow(rowIndex, key, value)}
        />


        {/* ═══════════ 7. SETTLEMENT SUMMARY ═══════════ */}
        <h3 style={sectionStyle}>7. Settlement Summary</h3>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Lorry Hire</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(grossAmount)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Advance</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(totalAdvance)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Deductions / TDS</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(totalDeductions)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx(true)}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Net Payable</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#7e22ce" }}>₹ {fmt(netPayable)}</Typography>
          </Paper>
        </Box>

        {/* ═══════════ SIGNATURES ═══════════ */}
        <FormPanel columns={4}>
          <FormField label="Prepared By" name="prepared_by" form={form} setForm={setForm} />
          <FormField label="Checked By" name="checked_by" form={form} setForm={setForm} />
          <FormField label="Approved By" name="approved_by" form={form} setForm={setForm} />
          <FormField label="Owner / Driver Acknowledgment" name="owner_driver_ack" form={form} setForm={setForm} />
        </FormPanel>
      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}


