import { useEffect, useState } from "react";
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
} from "../../utils/lorryMaster";
import {
  fetchNextHireVoucherNo,
  fetchHireVoucherByVhvNo,
  createHireVoucher,
  updateHireVoucher,
} from "../../utils/hireVoucher";
import { fetchManifestByNo } from "../../utils/manifest";
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
  // ── sss.sst_vha_hdr columns ──
  vha_no: "",                 // Voucher No (auto generated)
  vha_date: "",               // Voucher Date
  vha_type: "",               // Vehicle Ownership (Own / Market / Vendor)
  vha_sub_type: "",           // Vehicle Type
  vehicle_regis_no: "",       // Vehicle No
  vendor_name: "",            // Owner
  broker_name: "",            // Broker
  vha_adv_paid_to: "",        // Payment To

  vha_loc: "",                // From Location
  vha_to_loc: "",             // To Location
  vha_via_loc_1: "",          // Via 1
  vha_via_loc_2: "",          // Via 2
  dwb_actual_weight: "",      // Actual Weight (Kg)
  vha_guarantee_weight: "",   // Guaranteed Weight (Kg)
  vha_rate_uom: 1,            // Rate Type (numeric UOM code: 1=Fixed, 2=Per Kg, 3=Per Ton, 4=Per Trip)
  vha_rate_per_uom: "",       // Rate (₹)

  vha_hire_amt: "",           // Total Hire (₹)
  vha_loading_amt: "",        // Loading (₹)
  vha_dc_amt: "",             // Other Charges (₹)
  vha_advance_total: "",      // Advance (₹)
  vha_tds_amt: "",            // TDS (₹)

  vha_advance_diesel: "",     // Advance Diesel (₹)
  vha_dtn_amt: "",            // Other Charges (₹)
  vha_advance_cash: "",       // Advance Cash (₹)

  vha_remarks: "",            // Loading Remarks
};

const emptyManifestRow = {
  mnf_no: "",          // Manifest No
  mnf_date: "",        // Manifest Date
  mnf_loc: "",         // Manifest Loc
  mnf_act_weight: "",  // Actual Weight
  mnf_cns_no: "",      // No. of CNs
  mnf_pkgs_no: "",     // No. of Pkgs
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
    setForm({ ...emptyLorryForm, vha_date: today() });
    setManifestRows([]);
    setOriginalLorry(null);
    setIsEditing(false);
  };

  // Voucher date is auto generated (creation date)
  const today = () => new Date().toISOString().slice(0, 10);

  // Load next voucher no + today's date at mount (both auto generated)
  useEffect(() => {
    setForm((prev) => ({ ...prev, vha_date: prev.vha_date || today() }));
    fetchNextHireVoucherNo()
      .then((next) => {
        const nextNo = next?.vha_no ?? next?.hv_no ?? "";
        if (nextNo) setForm((prev) => (prev.vha_no ? prev : { ...prev, vha_no: nextNo }));
      })
      .catch((err) => console.error("Fetch next voucher no error:", err));
  }, []);

  // ── Derived (sss.sst_vha_hdr computed columns) ──
  const grossAmount = num(form.vha_hire_amt) + num(form.vha_loading_amt) + num(form.vha_dc_amt);
  const balance = grossAmount - num(form.vha_advance_total);
  const netAdvance = num(form.vha_advance_total) - num(form.vha_tds_amt);

  const totalAdvance = num(form.vha_advance_diesel) + num(form.vha_advance_cash);
  const totalDeductions = num(form.vha_tds_amt);
  const netPayable = grossAmount - totalAdvance - totalDeductions;

  // Autofill owner/vendor info from Vehicle Master (sss.ssm_vehicle_master)
  const handleVehicleNoKeyDown = async (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const vno = form.vehicle_regis_no?.trim();
      if (!vno) return;
      try {
        const data = await fetchLorryByVehicleNo(vno);
        if (data) {
          setForm((prev) => ({
            ...prev,
            vehicle_regis_no: data.vehicle_no ?? vno,
            vha_type: data.vehicle_ownership ?? prev.vha_type,
            vha_sub_type: data.vehicle_type ?? prev.vha_sub_type,
            vendor_name: data.owner_name ?? prev.vendor_name,
          }));
          setOriginalLorry(data);
          showSuccess("Owner details loaded from Lorry Master");
        }
      } catch (err) {
        showError(err.message || "Failed to fetch lorry details");
        console.error("Fetch lorry by vehicle no error:", err);
      }
    }
  };

  // Edit / View: load hire voucher by vha_no
  const handleEditView = async () => {
    const vno = form.vha_no?.trim();
    if (!vno) {
      showError("Please enter a Voucher Number first");
      return;
    }
    try {
      const data = await fetchHireVoucherByVhvNo(vno);
      if (!data?.header) {
        showWarning("Voucher not found. Creating a new entry.");
        setIsEditing(false);
        setOriginalLorry(null);
        return;
      }
      const hdr = data.header;
      setForm((prev) => ({
        ...prev,
        vha_no: hdr.vha_no ?? vno,
        vha_date: hdr.vha_date ? String(hdr.vha_date).slice(0, 10) : "",
        vha_type: hdr.vha_type ?? "",
        vha_sub_type: hdr.vha_sub_type ?? "",
        vehicle_regis_no: hdr.vehicle_regis_no ?? "",
        vendor_name: hdr.vendor_name ?? "",
        broker_name: hdr.broker_name ?? "",
        vha_adv_paid_to: hdr.vha_adv_paid_to ?? "",
        vha_loc: hdr.vha_loc ?? "",
        vha_to_loc: hdr.vha_to_loc ?? "",
        vha_via_loc_1: hdr.vha_via_loc_1 ?? "",
        vha_via_loc_2: hdr.vha_via_loc_2 ?? "",
        dwb_actual_weight: hdr.dwb_actual_weight ?? "",
        vha_guarantee_weight: hdr.vha_guarantee_weight ?? "",
        vha_rate_uom: hdr.vha_rate_uom ?? 1,
        vha_rate_per_uom: hdr.vha_rate_per_uom ?? "",
        vha_hire_amt: hdr.vha_hire_amt ?? "",
        vha_loading_amt: hdr.vha_loading_amt ?? "",
        vha_dc_amt: hdr.vha_dc_amt ?? "",
        vha_advance_total: hdr.vha_advance_total ?? "",
        vha_tds_amt: hdr.vha_tds_amt ?? "",
        vha_advance_diesel: hdr.vha_advance_diesel ?? "",
        vha_dtn_amt: hdr.vha_dtn_amt ?? "",
        vha_advance_cash: hdr.vha_advance_cash ?? "",
        vha_remarks: hdr.vha_remarks ?? "",
      }));
      setManifestRows(
        (Array.isArray(data.details) ? data.details : []).map((d) => ({
          mnf_no: d.mnf_no ?? "",
          mnf_date: d.mnf_date ? String(d.mnf_date).slice(0, 10) : "",
          mnf_loc: d.mnf_loc ?? "",
          mnf_act_weight: d.mnf_act_weight ?? "",
          mnf_cns_no: d.mnf_cns_no ?? "",
          mnf_pkgs_no: d.mnf_pkgs_no ?? "",
        }))
      );
      setOriginalLorry(hdr);
      setIsEditing(true);
      showSuccess("Voucher details loaded for editing");
    } catch (err) {
      showError(err.message || "Failed to fetch voucher details");
      console.error("Fetch voucher error:", err);
    }
  };

  const saveForm = async () => {
    if (!form.vehicle_regis_no?.trim()) {
      showError("Vehicle Number is required");
      return;
    }
    if (!form.vha_loc?.trim() || !form.vha_date) {
      showError("From Location and Voucher Date are required");
      return;
    }

    // ── Header: exact DB columns of sss.sst_vha_hdr ──
    const header = {
      vha_no: form.vha_no,
      vha_date: form.vha_date || null,
      vha_type: form.vha_type || null,
      vha_sub_type: form.vha_sub_type || null,
      vehicle_regis_no: form.vehicle_regis_no,
      vendor_name: form.vendor_name || null,
      broker_name: form.broker_name || null,
      vha_adv_paid_to: form.vha_adv_paid_to || null,
      vha_loc: form.vha_loc,
      vha_to_loc: form.vha_to_loc || "",
      vha_to_loc_state: "",           // NOT NULL column — defaulted
      vha_via_loc_1: form.vha_via_loc_1 || null,
      vha_via_loc_2: form.vha_via_loc_2 || null,
      dwb_actual_weight: form.dwb_actual_weight ? Number(form.dwb_actual_weight) : null,
      vha_guarantee_weight: form.vha_guarantee_weight ? Number(form.vha_guarantee_weight) : null,
      vha_rate_uom: num(form.vha_rate_uom) || null,
      vha_rate_per_uom: form.vha_rate_per_uom ? Number(form.vha_rate_per_uom) : null,
      vha_hire_amt: num(form.vha_hire_amt),
      vha_loading_amt: num(form.vha_loading_amt),
      vha_dc_amt: num(form.vha_dc_amt),
      vha_total_amt: grossAmount,
      vha_advance_diesel: num(form.vha_advance_diesel),
      vha_dtn_amt: num(form.vha_dtn_amt),
      vha_advance_cash: num(form.vha_advance_cash),
      vha_advance_total: totalAdvance || num(form.vha_advance_total),
      vha_tds_amt: num(form.vha_tds_amt),
      vha_advance_net: netAdvance,
      vha_balance_amt: balance,
      vha_remarks: form.vha_remarks || null,
    };

    // ── Details: exact DB columns of sss.sst_vha_dtl ──
    const details = manifestRows.map((r) => ({
      mnf_no: r.mnf_no || null,
      mnf_date: r.mnf_date || null,
      mnf_loc: r.mnf_loc || null,
      mnf_act_weight: r.mnf_act_weight ? Number(r.mnf_act_weight) : null,
      mnf_cns_no: r.mnf_cns_no ? Number(r.mnf_cns_no) : null,
      mnf_pkgs_no: r.mnf_pkgs_no ? Number(r.mnf_pkgs_no) : null,
    }));

    try {
      if (isEditing && originalLorry) {
        const keys = {
          vha_no: originalLorry.vha_no,
          vha_loc: originalLorry.vha_loc,
          vha_date: originalLorry.vha_date ? String(originalLorry.vha_date).slice(0, 10) : form.vha_date,
        };
        await updateHireVoucher(keys.vha_no, keys.vha_loc, keys.vha_date, header, details);
        showSuccess("Lorry hire voucher updated successfully");
      } else {
        await createHireVoucher(header, details);
        setOriginalLorry(header);
        setIsEditing(true);
        showSuccess("Lorry hire voucher saved successfully");
      }
    } catch (err) {
      showError(err.message || "Failed to save lorry hire voucher");
      console.error("Save voucher error:", err);
    }
  };

  // ── Manifest rows handlers ──
  // ── Manifest rows handlers ──
  const addManifestRow = () => setManifestRows((prev) => [...prev, { ...emptyManifestRow }]);

  const updateManifestRow = async (idx, field, value) => {
    // Auto-fill: when user commits a Manifest No (Enter/Tab), fetch it from
    // sst_mnf_hdr and fill the row; the updated row is returned so the grid
    // and local state stay in sync. Manifest No is saved to sst_vha_dtl on Save.
    if (field === "mnf_no" && value?.trim()) {
      try {
        const data = await fetchManifestByNo(value.trim());
        const hdr = data?.header || data;
        if (hdr) {
          const filledRow = {
            ...manifestRows[idx],
            mnf_no: value,
            mnf_date: hdr.mnf_date ? String(hdr.mnf_date).slice(0, 10) : "",
            mnf_loc: hdr.mnf_loc ?? "",
            mnf_act_weight: hdr.mnf_actual_wt ?? "",
            mnf_cns_no: hdr.mnf_no_of_dwb ?? "",
            mnf_pkgs_no: hdr.mnf_no_of_pkgs ?? "",
          };
          setManifestRows((prev) => prev.map((r, i) => (i === idx ? filledRow : r)));
          showSuccess("Manifest details filled from Manifest Master");
          return filledRow;
        }
        showError(`Manifest No "${value}" not found`);
      } catch (err) {
        showError(err.message || "Failed to fetch manifest details");
        console.error("Fetch manifest error:", err);
      }
    }
    setManifestRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const deleteManifestRow = (row) => {
    showWarning("Confirm Delete", "Remove this manifest row?",
      () => setManifestRows((prev) => prev.filter((r) => r !== row))
    );
  };

  const manifestColumns = [
    { key: "mnf_no", label: "Manifest No.", minWidth: 120, editable: true },
    { key: "mnf_date", label: "Manifest Date", minWidth: 130, editable: true, type: "string", isDate: true },
    { key: "mnf_loc", label: "Form Loc", minWidth: 110, editable: true },
    { key: "mnf_act_weight", label: "Actual Wt.", minWidth: 110, editable: true, type: "number" },
    { key: "mnf_cns_no", label: "No. of CNs", minWidth: 100, editable: true, type: "number" },
    { key: "mnf_pkgs_no", label: "No. of Pkgs", minWidth: 110, editable: true, type: "number" },
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
              onClick={handleEditView}
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
            value={form.vehicle_regis_no} onChange={(e) => updateField("vehicle_regis_no", e.target.value)}
            onKeyDown={handleVehicleNoKeyDown} placeholder="e.g. HR 55 AB 1234" />
          <MuiSelect label="Vehicle Ownership" name="vha_type" value={form.vha_type}
            onChange={updateField} options={["Own", "Market", "Vendor"]} />
          <MuiSelect label="Vehicle Type" name="vha_sub_type" value={form.vha_sub_type}
            onChange={updateField} options={["Truck / Trailer / LCV", "Truck", "Trailer", "LCV", "Tipper", "Container"]} />
          <FormField label="Owner" name="vendor_name" form={form} setForm={setForm} />
          <FormField label="Broker" name="broker_name" form={form} setForm={setForm} />
          <MuiSelect label="Payment To" name="vha_adv_paid_to" value={form.vha_adv_paid_to}
            onChange={updateField} options={["Owner / Broker / Vendor", "Owner", "Broker", "Vendor"]} />
          <FormField label="Voucher No (Auto generated)" name="vha_no" form={form} setForm={setForm} disabled />
          <FormField label="Voucher Date (Auto)" name="vha_date" form={form} setForm={setForm} type="date" disabled />
        </FormPanel>

        {/* ═══════════ 2. TRIP & ROUTE DETAILS ═══════════ */}
        <h3 style={sectionStyle}>2. Trip &amp; Route Details</h3>
        <FormPanel columns={4}>
          <FormField label="From Location" name="vha_loc" form={form} setForm={setForm} />
          <FormField label="To Location" name="vha_to_loc" form={form} setForm={setForm} />
          <FormField label="Via 1" name="vha_via_loc_1" form={form} setForm={setForm} />
          <FormField label="Via 2" name="vha_via_loc_2" form={form} setForm={setForm} />
          <FormField label="Actual Weight (Kg)" name="dwb_actual_weight" form={form} setForm={setForm} type="number" />
          <FormField label="Guaranteed Weight (Kg)" name="vha_guarantee_weight" form={form} setForm={setForm} type="number" />
          <MuiSelect label="Rate Type" name="vha_rate_uom" value={form.vha_rate_uom}
            onChange={updateField} options={[
              { value: 1, label: "Fixed" },
              { value: 2, label: "Per Kg" },
              { value: 3, label: "Per Ton" },
              { value: 4, label: "Per Trip" },
            ]} />
          <FormField label="Rate (₹)" name="vha_rate_per_uom" form={form} setForm={setForm} type="number" />
        </FormPanel>


        {/* ═══════════ 3. HIRE CALCULATION ═══════════ */}
        <h3 style={sectionStyle}>3. Hire Calculation</h3>
        <FormPanel columns={4}>
          <FormField label="Total Hire (₹)" name="vha_hire_amt" form={form} setForm={setForm} type="number" />
          <FormField label="Loading (₹)" name="vha_loading_amt" form={form} setForm={setForm} type="number" />
          <FormField label="Other Charges (₹)" name="vha_dc_amt" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Gross Amount (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(grossAmount)}`} />
          <FormField label="Advance (₹)" name="vha_advance_total" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Balance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(balance)}`} />
          <FormField label="TDS (₹)" name="vha_tds_amt" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Net Advance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(netAdvance)}`} />
        </FormPanel>

        {/* ═══════════ 4. TRIP EXPENSE / ADVANCE DETAILS ═══════════ */}
        <h3 style={sectionStyle}>4. Trip Expense / Advance Details</h3>
        <FormPanel columns={4}>
          <FormField label="Advance Diesel (₹)" name="vha_advance_diesel" form={form} setForm={setForm} type="number" />
          <FormField label="Other Charges (₹)" name="vha_dtn_amt" form={form} setForm={setForm} type="number" />
          <FormField label="Advance Cash (₹)" name="vha_advance_cash" form={form} setForm={setForm} type="number" />
        </FormPanel>

        {/* ═══════════ 5. LOADING REMARKS ═══════════ */}
        <h3 style={sectionStyle}>5. Loading Remarks</h3>
        <FormPanel>
          <TextField size="small" label="Loading Remarks" fullWidth multiline rows={3} sx={fieldSx}
            value={form.vha_remarks} onChange={(e) => updateField("vha_remarks", e.target.value)}
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


