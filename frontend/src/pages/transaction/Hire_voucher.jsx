import { useEffect, useMemo, useRef, useState } from "react";
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
import { fetchLorryOwners, fetchOwnerByVehicle } from "../../utils/lorryOwnerVehicle";
import { fetchLorryBrokers } from "../../utils/businessPartner";
import { getSessionLocCode } from "../../utils/authService";
import { fetchAllLocations, fetchLocationTowns } from "../../utils/locationMaster";
import {
  fetchHireVoucherByVhvNo,
  createHireVoucher,
  updateHireVoucher,
  fetchUncoveredManifests,
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

function MuiSelect({ label, name, value, onChange, options, disabled = false, sx }) {
  return (
    <FormControl fullWidth size="small" sx={{ ...fieldSx, ...sx }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        sx={{ fontSize: 13 }}
        MenuProps={{ PaperProps: { sx: { minWidth: 320, maxWidth: 520 } } }}
      >
        {options.map((opt) => (
          <MenuItem
            key={typeof opt === "object" ? opt.value : opt}
            value={typeof opt === "object" ? opt.value : opt}
            sx={{ fontSize: 13, whiteSpace: "normal", lineHeight: 1.3 }}
          >
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

function calcHireAmt(rateUom, rate, gtdWt) {
  const r = num(rate);
  const w = num(gtdWt);
  const uom = Number(rateUom);
  if (uom === 2) return Number((r * w).toFixed(2));
  if (uom === 3) return Number(((r * w) / 1000).toFixed(2));
  return Number(r.toFixed(2));
}

function extraOption(opts, value) {
  const v = String(value || "").trim();
  if (v && !opts.some((o) => String(o.value) === v)) opts.push({ value: v, label: v });
  return opts;
}

function sameLoc(a, b) {
  return String(a || "").replace(/\s+/g, "").toUpperCase() === String(b || "").replace(/\s+/g, "").toUpperCase();
}

function uniqueTownOptions(towns, extra) {
  const seen = new Set();
  const opts = [];
  for (const t of towns || []) {
    const name = String(t?.town_name || t?.town_code || t?.name || t || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    opts.push({ value: name, label: name });
  }
  return extraOption(opts, extra);
}

function matchBp(list, code, name) {
  const codeKey = String(code || "").trim();
  const nameKey = String(name || "").trim().toLowerCase();
  if (codeKey) {
    const byCode = (list || []).find((x) => String(x.bp_grp_code || "").trim() === codeKey);
    if (byCode) return { code: byCode.bp_grp_code || codeKey, name: byCode.bp_name || name || "" };
  }
  if (nameKey) {
    const byName = (list || []).find((x) => String(x.bp_name || "").trim().toLowerCase() === nameKey);
    if (byName) return { code: byName.bp_grp_code || codeKey, name: byName.bp_name || name || "" };
  }
  return { code: codeKey, name: name || "" };
}

const emptyVoucherForm = {
  // ── sss.sst_vha_hdr columns ──
  vha_no: "",                 // Voucher No (auto generated)
  vha_date: "",               // Voucher Date
  vha_type: "",               // Vehicle Ownership (Own / Market / Vendor)
  vha_sub_type: "",           // Vehicle Type
  vehicle_regis_no: "",       // Vehicle No
  vendor_name: "",            // Owner
  vendor_code: "",            // Owner bp_grp_code
  broker_name: "",            // Broker
  broker_code: "",            // Broker bp_grp_code
  vha_adv_paid_to: "",        // Payment To

  vha_loc: "",                // From Location
  vha_from_town: "",          // From Town
  vha_to_loc: "",             // To Location
  vha_to_loc_town: "",        // To Town
  vha_via_loc_1: "",          // Via 1
  vha_via_loc_2: "",          // Via 2
  vha_via_loc_3: "",          // Via 3
  vha_via_loc_4: "",          // Via 4
  dwb_actual_weight: "",      // Actual Weight (Kg)
  vha_guarantee_weight: "",   // Guaranteed Weight (Kg)
  vha_rate_uom: 1,            // Rate Type (numeric UOM code: 1=Fixed, 2=Per Kg, 3=Per Ton)
  vha_rate_per_uom: "",       // Rate (₹)

  vha_hire_amt: "",           // Total Hire (₹)
  vha_loading_amt: "",        // Loading (₹)
  vha_dc_amt: "",             // Other Charges (₹)
  vha_advance_total: "",      // Advance (₹)
  vha_tds_amt: "",            // TDS (₹)

  vha_advance_diesel: "",     // Advance Diesel (₹)
  vha_dtn_amt: "",            // Detention Charge (₹)
  vha_dd_amt: "",             // Settlement Other Charge (₹)
  vha_advance_cash: "",       // Advance Cash (₹)
  vha_final_pay_date: "",     // Final payment done on
  vha_settle_tds_amt: "",     // Settlement TDS (₹)
  vha_settled: "",            // Y after settlement; one-time only

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

const newManifestRow = (overrides = {}) => ({
  ...emptyManifestRow,
  id: `mnf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  ...overrides,
});


// Voucher date is auto generated (creation date)
const today = () => new Date().toISOString().slice(0, 10);

export default function HireVoucherPage() {
  const sessionLoc = getSessionLocCode();
  // Voucher date is auto-generated (creation date) — seed it once at mount
  // instead of setting it from an effect.
  const [form, setForm] = useState(() => ({
    ...emptyVoucherForm,
    vha_date: today(),
    vha_loc: sessionLoc,
  }));
  const [manifestRows, setManifestRows] = useState([]);
  const [originalVoucher, setOriginalVoucher] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lorryBrokers, setLorryBrokers] = useState([]);
  const [lorryOwners, setLorryOwners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [fromTowns, setFromTowns] = useState([]);
  const [toTowns, setToTowns] = useState([]);
  const [selectedManifestIds, setSelectedManifestIds] = useState(() => new Set());
  const gtdTouchedRef = useRef(false);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearForm = () => {
    gtdTouchedRef.current = false;
    setForm({ ...emptyVoucherForm, vha_date: today(), vha_loc: getSessionLocCode() });
    setManifestRows([]);
    setSelectedManifestIds(new Set());
    setOriginalVoucher(null);
    setIsEditing(false);
  };

  // Load lookup lists at mount. Voucher no is assigned only on save.
  useEffect(() => {
    let active = true;
    fetchLorryBrokers()
      .then((rows) => {
        if (!active) return;
        setLorryBrokers(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => console.error("Fetch lorry brokers error:", err));
    fetchLorryOwners()
      .then((rows) => {
        if (!active) return;
        setLorryOwners(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => console.error("Fetch lorry owners error:", err));
    fetchAllLocations()
      .then((rows) => {
        if (!active) return;
        setLocations(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => console.error("Fetch locations error:", err));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!form.vha_loc) {
      setFromTowns([]);
      return undefined;
    }
    fetchLocationTowns(form.vha_loc)
      .then((rows) => { if (active) setFromTowns(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setFromTowns([]); });
    return () => { active = false; };
  }, [form.vha_loc]);

  useEffect(() => {
    let active = true;
    if (!form.vha_to_loc) {
      setToTowns([]);
      return undefined;
    }
    fetchLocationTowns(form.vha_to_loc)
      .then((rows) => { if (active) setToTowns(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setToTowns([]); });
    return () => { active = false; };
  }, [form.vha_to_loc]);

  // ── Derived (sss.sst_vha_hdr computed columns) ──
  const hireAmt = calcHireAmt(form.vha_rate_uom, form.vha_rate_per_uom, form.vha_guarantee_weight);
  const totalHire = hireAmt + num(form.vha_loading_amt) + num(form.vha_dc_amt);
  const advancePayable = num(form.vha_advance_total);
  const tdsAmt = num(form.vha_tds_amt);
  const netAdvance = advancePayable + tdsAmt;
  const balance = totalHire - netAdvance;
  const detentionAmt = num(form.vha_dtn_amt);
  const settleOtherAmt = num(form.vha_dd_amt);
  const settleTdsAmt = num(form.vha_settle_tds_amt);
  const grossPayable = balance + detentionAmt + settleOtherAmt;
  const netPayable = grossPayable - settleTdsAmt;
  const isVoucherSettled = String(form.vha_settled || "").trim().toUpperCase() === "Y";

  const selectedManifests = useMemo(
    () => manifestRows.filter((r) => selectedManifestIds.has(String(r.id)) && String(r.mnf_no || "").trim()),
    [manifestRows, selectedManifestIds]
  );
  const selectedActualWeight = useMemo(
    () => selectedManifests.reduce((sum, r) => sum + num(r.mnf_act_weight), 0),
    [selectedManifests]
  );

  useEffect(() => {
    if (gtdTouchedRef.current) return;
    const next = selectedActualWeight ? String(selectedActualWeight) : "";
    setForm((prev) => (
      String(prev.vha_guarantee_weight) === next ? prev : { ...prev, vha_guarantee_weight: next }
    ));
  }, [selectedActualWeight]);

  const applyUncoveredManifests = (list) => {
    const loaded = (Array.isArray(list) ? list : []).map((m) => newManifestRow({
      mnf_no: m.mnf_no ?? "",
      mnf_date: m.mnf_date ? String(m.mnf_date).slice(0, 10) : "",
      mnf_loc: m.mnf_loc ?? "",
      mnf_act_weight: m.mnf_actual_wt ?? "",
      mnf_cns_no: m.mnf_no_of_dwb ?? "",
      mnf_pkgs_no: m.mnf_no_of_pkgs ?? "",
    }));
    gtdTouchedRef.current = false;
    setManifestRows(loaded);
    setSelectedManifestIds(new Set());
    return loaded;
  };

  const fillFromVehicleNo = async () => {
    const vno = form.vehicle_regis_no?.trim();
    if (!vno) return;
    try {
      const currentVha = isEditing ? form.vha_no : "";
      const fromLoc = form.vha_loc?.trim();
      const [lorry, mapped, uncovered] = await Promise.all([
        fetchLorryByVehicleNo(vno).catch(() => null),
        fetchOwnerByVehicle(vno).catch(() => null),
        fromLoc
          ? fetchUncoveredManifests(vno, currentVha, fromLoc).catch(() => [])
          : Promise.resolve([]),
      ]);
      const matching = (Array.isArray(uncovered) ? uncovered : []).filter((m) => sameLoc(m.mnf_loc, fromLoc));
      if (!lorry && !mapped && matching.length === 0) {
        showError(fromLoc
          ? "Vehicle not found, or no uncovered manifests for this From Loc"
          : "Vehicle not found in Lorry Master");
        return;
      }
      const owner = matchBp(
        lorryOwners,
        mapped?.owner_code,
        mapped?.owner_name || lorry?.owner_name
      );
      setForm((prev) => ({
        ...prev,
        vehicle_regis_no: lorry?.vehicle_no || mapped?.lry_regis_no || vno,
        vha_type: lorry?.vehicle_ownership || prev.vha_type,
        vha_sub_type: lorry?.vehicle_type || "",
        vendor_name: owner.name || prev.vendor_name,
        vendor_code: owner.code || prev.vendor_code,
        vha_to_loc: prev.vha_to_loc || matching[0]?.mnf_to_loc || "",
      }));
      if (!fromLoc) {
        applyUncoveredManifests([]);
        showSuccess("Vehicle details loaded. Select From Loc to list matching manifests");
        return;
      }
      applyUncoveredManifests(matching);
      if (matching.length) {
        showSuccess(`${matching.length} uncovered manifest(s) loaded for From Loc ${fromLoc}`);
      } else if (mapped?.owner_name) {
        showSuccess("Owner loaded. No uncovered manifests for this From Loc");
      } else {
        showSuccess("Vehicle details loaded. No uncovered manifests for this From Loc");
      }
    } catch (err) {
      showError(err.message || "Failed to fetch lorry details");
      console.error("Fetch lorry by vehicle no error:", err);
    }
  };

  const handleVehicleNoKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") fillFromVehicleNo();
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
        setOriginalVoucher(null);
        return;
      }
      const hdr = data.header;
      gtdTouchedRef.current = true;
      const owner = matchBp(lorryOwners, hdr.vendor_code, hdr.vendor_name);
      const broker = matchBp(lorryBrokers, hdr.broker_code, hdr.broker_name);
      setForm((prev) => ({
        ...prev,
        vha_no: hdr.vha_no ?? vno,
        vha_date: hdr.vha_date ? String(hdr.vha_date).slice(0, 10) : "",
        vha_type: hdr.vha_type ?? "",
        vha_sub_type: hdr.vha_sub_type ?? "",
        vehicle_regis_no: hdr.vehicle_regis_no ?? "",
        vendor_name: owner.name,
        vendor_code: owner.code,
        broker_name: broker.name,
        broker_code: broker.code,
        vha_adv_paid_to: hdr.vha_adv_paid_to ?? "",
        vha_loc: hdr.vha_loc ?? "",
        vha_from_town: hdr.vha_from_town ?? "",
        vha_to_loc: hdr.vha_to_loc ?? "",
        vha_to_loc_town: hdr.vha_to_loc_town ?? "",
        vha_via_loc_1: hdr.vha_via_loc_1 ?? "",
        vha_via_loc_2: hdr.vha_via_loc_2 ?? "",
        vha_via_loc_3: hdr.vha_via_loc_3 ?? "",
        vha_via_loc_4: hdr.vha_via_loc_4 ?? "",
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
        vha_dd_amt: hdr.vha_dd_amt ?? "",
        vha_advance_cash: hdr.vha_advance_cash ?? "",
        vha_final_pay_date: hdr.vha_final_pay_date ? String(hdr.vha_final_pay_date).slice(0, 10) : "",
        vha_settle_tds_amt: hdr.vha_settle_tds_amt ?? "",
        vha_settled: hdr.vha_settled ?? "",
        vha_remarks: hdr.vha_remarks ?? "",
      }));
      const loaded = (Array.isArray(data.details) ? data.details : []).map((d) => newManifestRow({
        mnf_no: d.mnf_no ?? "",
        mnf_date: d.mnf_date ? String(d.mnf_date).slice(0, 10) : "",
        mnf_loc: d.mnf_loc ?? "",
        mnf_act_weight: d.mnf_act_weight ?? "",
        mnf_cns_no: d.mnf_cns_no ?? "",
        mnf_pkgs_no: d.mnf_pkgs_no ?? "",
      }));
      setManifestRows(loaded);
      setSelectedManifestIds(new Set(loaded.map((r) => r.id)));
      setOriginalVoucher(hdr);
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
      vha_no: isEditing ? form.vha_no : null,
      vha_date: form.vha_date || null,
      vha_type: form.vha_type || null,
      vha_sub_type: form.vha_sub_type || null,
      vehicle_regis_no: form.vehicle_regis_no,
      vendor_name: form.vendor_name || null,
      vendor_code: form.vendor_code || null,
      broker_name: form.broker_name || null,
      broker_code: form.broker_code || null,
      vha_adv_paid_to: form.vha_adv_paid_to || null,
      vha_loc: form.vha_loc,
      vha_from_town: form.vha_from_town || null,
      vha_to_loc: form.vha_to_loc || "",
      vha_to_loc_town: form.vha_to_loc_town || null,
      vha_to_loc_state: "",           // NOT NULL column — defaulted
      vha_via_loc_1: form.vha_via_loc_1 || null,
      vha_via_loc_2: form.vha_via_loc_2 || null,
      vha_via_loc_3: form.vha_via_loc_3 || null,
      vha_via_loc_4: form.vha_via_loc_4 || null,
      dwb_actual_weight: selectedActualWeight,
      vha_guarantee_weight: form.vha_guarantee_weight ? Number(form.vha_guarantee_weight) : null,
      vha_rate_uom: num(form.vha_rate_uom) || null,
      vha_rate_per_uom: form.vha_rate_per_uom ? Number(form.vha_rate_per_uom) : null,
      vha_hire_amt: hireAmt,
      vha_loading_amt: num(form.vha_loading_amt),
      vha_dc_amt: num(form.vha_dc_amt),
      vha_total_amt: totalHire,
      vha_advance_diesel: num(form.vha_advance_diesel),
      vha_dtn_amt: detentionAmt,
      vha_dd_amt: settleOtherAmt,
      vha_advance_cash: num(form.vha_advance_cash),
      vha_advance_total: num(form.vha_advance_total),
      vha_tds_amt: num(form.vha_tds_amt),
      vha_advance_net: netAdvance,
      vha_balance_amt: balance,
      vha_final_pay_date: form.vha_final_pay_date || null,
      vha_settle_tds_amt: settleTdsAmt,
      vha_gross_payable: grossPayable,
      vha_net_payable: netPayable,
      vha_remarks: form.vha_remarks || null,
    };

    // ── Details: only ticked manifests ──
    const selectedRows = selectedManifests;
    if (selectedRows.length === 0) {
      showError("Please select at least one manifest");
      return;
    }
    const locMismatch = selectedRows.filter((r) => !sameLoc(r.mnf_loc, form.vha_loc));
    if (locMismatch.length) {
      showError("Selected manifest From Loc must match Hire Voucher From Loc");
      return;
    }
    const details = selectedRows.map((r) => ({
      mnf_no: r.mnf_no || null,
      mnf_date: r.mnf_date || null,
      mnf_loc: r.mnf_loc || null,
      mnf_act_weight: r.mnf_act_weight ? Number(r.mnf_act_weight) : null,
      mnf_cns_no: r.mnf_cns_no ? Number(r.mnf_cns_no) : null,
      mnf_pkgs_no: r.mnf_pkgs_no ? Number(r.mnf_pkgs_no) : null,
    }));

    try {
      if (isEditing && originalVoucher?.vha_no) {
        const keys = {
          vha_no: originalVoucher.vha_no,
          vha_loc: originalVoucher.vha_loc,
          vha_date: originalVoucher.vha_date ? String(originalVoucher.vha_date).slice(0, 10) : form.vha_date,
        };
        await updateHireVoucher(keys.vha_no, keys.vha_loc, keys.vha_date, header, details);
        if (form.vha_final_pay_date) {
          setForm((prev) => ({ ...prev, vha_settled: "Y" }));
        }
        showSuccess(form.vha_final_pay_date && !isVoucherSettled
          ? "Hire voucher settled successfully"
          : "Hire voucher updated successfully");
      } else {
        const res = await createHireVoucher(header, details);
        // The server generates vha_no itself and may return a DIFFERENT number
        // than the one shown in the form (e.g. another user saved in between).
        // Always trust the server value, otherwise the next Update would target
        // a voucher that does not exist.
        const savedNo = res?.data?.vha_no ?? header.vha_no;
        setOriginalVoucher({ ...header, vha_no: savedNo, vha_loc: header.vha_loc, vha_date: header.vha_date });
        setForm((prev) => ({
          ...prev,
          vha_no: savedNo,
          vha_settled: form.vha_final_pay_date ? "Y" : prev.vha_settled,
        }));
        setIsEditing(true);
        showSuccess(`Hire voucher saved successfully (No: ${savedNo})`);
      }
    } catch (err) {
      showError(err.message || "Failed to save hire voucher");
      console.error("Save voucher error:", err);
    }
  };

  // ── Manifest rows handlers ──
  // ── Manifest rows handlers ──
  const addManifestRow = () => {
    const row = newManifestRow();
    setManifestRows((prev) => [...prev, row]);
    setSelectedManifestIds((prev) => new Set([...prev, row.id]));
  };

  const handleManifestSelectionChange = (model) => {
    const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
    setSelectedManifestIds(new Set([...ids].map(String)));
  };

  const updateManifestRow = async (id, field, value) => {
    const matches = (r, i) => String(r.id ?? i) === String(id);
    // Auto-fill: when user commits a Manifest No (Enter/Tab), fetch it from
    // sst_mnf_hdr and fill the row; the updated row is returned so the grid
    // and local state stay in sync. Manifest No is saved to sst_vha_dtl on Save.
    if (field === "mnf_no" && value?.trim()) {
      try {
        const data = await fetchManifestByNo(value.trim());
        const hdr = data?.header || data;
        if (hdr) {
          const current = manifestRows.find((r, i) => matches(r, i)) || {};
          if (form.vha_loc && !sameLoc(hdr.mnf_loc, form.vha_loc)) {
            showError(`Manifest ${value} From Loc (${hdr.mnf_loc || "-"}) does not match voucher From Loc (${form.vha_loc})`);
            return current;
          }
          const filledRow = {
            ...current,
            mnf_no: value,
            mnf_date: hdr.mnf_date ? String(hdr.mnf_date).slice(0, 10) : "",
            mnf_loc: hdr.mnf_loc ?? "",
            mnf_act_weight: hdr.mnf_actual_wt ?? "",
            mnf_cns_no: hdr.mnf_no_of_dwb ?? "",
            mnf_pkgs_no: hdr.mnf_no_of_pkgs ?? "",
          };
          setManifestRows((prev) => prev.map((r, i) => (matches(r, i) ? filledRow : r)));
          showSuccess("Manifest details filled from Manifest Master");
          return filledRow;
        }
        showError(`Manifest No "${value}" not found`);
      } catch (err) {
        showError(err.message || "Failed to fetch manifest details");
        console.error("Fetch manifest error:", err);
      }
    }
    setManifestRows((prev) => prev.map((r, i) => (matches(r, i) ? { ...r, [field]: value } : r)));
  };

  const deleteManifestRow = (row) => {
    showWarning("Confirm Delete", "Remove this manifest row?",
      () => {
        setManifestRows((prev) => prev.filter((r) => r.id !== row.id));
        setSelectedManifestIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    );
  };

  const selectionIds = useMemo(() => [...selectedManifestIds], [selectedManifestIds]);

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
      <PageBody title="Hire Voucher">
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

        {/* ═══════════ 1. VOUCHER DETAILS (vehicle, trip, hire) ═══════════ */}
        <h3 style={{ ...sectionStyle, margin: "4px 0 4px" }}>1. Voucher Details</h3>
        <Box
          sx={{
            "& .formPanel": { padding: "8px 10px", marginBottom: "10px", borderRadius: "8px" },
            "& .formGrid": { gap: "6px 8px", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))" },
            "& .MuiFormControl-root": { minHeight: "auto" },
            "& .MuiInputBase-input": { fontSize: "12px !important", py: "7px" },
            "& .MuiSelect-select": { fontSize: "12px !important", py: "7px" },
            "& .MuiInputLabel-root": { fontSize: "12px !important" },
          }}
        >
        <FormPanel>
          <TextField size="small" label="Voucher No" fullWidth sx={fieldSx}
            value={form.vha_no}
            placeholder="Auto generated on save"
            disabled />
          <FormField label="Voucher Date" name="vha_date" form={form} setForm={setForm} type="date" disabled />
          <TextField size="small" label="Vehicle No" fullWidth sx={fieldSx}
            value={form.vehicle_regis_no} onChange={(e) => updateField("vehicle_regis_no", e.target.value.toUpperCase().replace(/\s+/g, ""))}
            onKeyDown={handleVehicleNoKeyDown} onBlur={fillFromVehicleNo} placeholder="e.g. HR55AB1234" />
          <MuiSelect label="Ownership" name="vha_type" value={form.vha_type}
            onChange={updateField} options={["Own", "Market", "Vendor"]} />
          <TextField size="small" label="Veh Type" fullWidth sx={fieldSx} disabled
            value={form.vha_sub_type}
            placeholder="From Lorry Master" />
          <MuiSelect
            label="Owner"
            name="vendor_code"
            sx={{ gridColumn: "span 2", minWidth: 280 }}
            value={form.vendor_code}
            onChange={(name, value) => {
              const bp = lorryOwners.find((o) => String(o.bp_grp_code ?? "") === String(value));
              setForm((prev) => ({
                ...prev,
                vendor_code: value,
                vendor_name: bp?.bp_name || prev.vendor_name,
              }));
            }}
            options={(() => {
              const opts = lorryOwners
                .filter((o) => o.bp_grp_code)
                .map((o) => ({
                  value: o.bp_grp_code,
                  label: `${o.bp_grp_code} - ${o.bp_name || ""}`.trim(),
                }));
              if (form.vendor_code && !opts.some((o) => o.value === form.vendor_code)) {
                opts.push({
                  value: form.vendor_code,
                  label: `${form.vendor_code}${form.vendor_name ? ` - ${form.vendor_name}` : ""}`,
                });
              }
              return opts;
            })()}
          />
          <MuiSelect
            label="Broker"
            name="broker_code"
            sx={{ gridColumn: "span 2", minWidth: 280 }}
            value={form.broker_code}
            onChange={(name, value) => {
              const bp = lorryBrokers.find((b) => String(b.bp_grp_code ?? "") === String(value));
              setForm((prev) => ({
                ...prev,
                broker_code: value,
                broker_name: bp?.bp_name || prev.broker_name,
              }));
            }}
            options={(() => {
              const opts = lorryBrokers
                .filter((b) => b.bp_grp_code)
                .map((b) => ({
                  value: b.bp_grp_code,
                  label: `${b.bp_grp_code} - ${b.bp_name || ""}`.trim(),
                }));
              if (form.broker_code && !opts.some((o) => o.value === form.broker_code)) {
                opts.push({
                  value: form.broker_code,
                  label: `${form.broker_code}${form.broker_name ? ` - ${form.broker_name}` : ""}`,
                });
              }
              return opts;
            })()}
          />
          <MuiSelect label="Pay To" name="vha_adv_paid_to" value={form.vha_adv_paid_to}
            onChange={updateField} options={["Owner", "Broker"]} />
          <MuiSelect
            label="From Loc"
            name="vha_loc"
            value={form.vha_loc}
            disabled
            onChange={updateField}
            options={extraOption(
              locations.map((loc) => ({
                value: loc.loc_code,
                label: `${loc.loc_code}${loc.loc_name ? ` - ${loc.loc_name}` : ""}`,
              })),
              form.vha_loc
            )}
          />
          <MuiSelect
            label="From Town"
            name="vha_from_town"
            value={form.vha_from_town}
            onChange={updateField}
            options={extraOption(
              fromTowns.map((t) => ({
                value: t.town_name,
                label: t.town_name,
              })).filter((o) => o.value),
              form.vha_from_town
            )}
          />
          <MuiSelect
            label="To Loc"
            name="vha_to_loc"
            value={form.vha_to_loc}
            onChange={(name, value) => setForm((prev) => ({ ...prev, vha_to_loc: value, vha_to_loc_town: "" }))}
            options={extraOption(
              locations.map((loc) => ({
                value: loc.loc_code,
                label: `${loc.loc_code}${loc.loc_name ? ` - ${loc.loc_name}` : ""}`,
              })),
              form.vha_to_loc
            )}
          />
          <MuiSelect
            label="To Town"
            name="vha_to_loc_town"
            value={form.vha_to_loc_town}
            onChange={updateField}
            options={extraOption(
              toTowns.map((t) => ({
                value: t.town_name,
                label: t.town_name,
              })).filter((o) => o.value),
              form.vha_to_loc_town
            )}
          />
          <MuiSelect label="Via 1" name="vha_via_loc_1" value={form.vha_via_loc_1}
            onChange={updateField} options={uniqueTownOptions([...fromTowns, ...toTowns], form.vha_via_loc_1)} />
          <MuiSelect label="Via 2" name="vha_via_loc_2" value={form.vha_via_loc_2}
            onChange={updateField} options={uniqueTownOptions([...fromTowns, ...toTowns], form.vha_via_loc_2)} />
          <MuiSelect label="Via 3" name="vha_via_loc_3" value={form.vha_via_loc_3}
            onChange={updateField} options={uniqueTownOptions([...fromTowns, ...toTowns], form.vha_via_loc_3)} />
          <MuiSelect label="Via 4" name="vha_via_loc_4" value={form.vha_via_loc_4}
            onChange={updateField} options={uniqueTownOptions([...fromTowns, ...toTowns], form.vha_via_loc_4)} />
          <TextField size="small" label="Act Wt (Kg)" fullWidth sx={fieldSx} disabled
            value={selectedActualWeight ? String(selectedActualWeight) : ""}
            placeholder="Sum of selected manifests" />
          <TextField size="small" label="Gtd Wt (Kg)" fullWidth sx={fieldSx} type="number"
            value={form.vha_guarantee_weight}
            onChange={(e) => {
              gtdTouchedRef.current = true;
              updateField("vha_guarantee_weight", e.target.value);
            }} />
          <MuiSelect label="Rate Type" name="vha_rate_uom" value={form.vha_rate_uom}
            onChange={updateField} options={[
              { value: 1, label: "Fixed" },
              { value: 2, label: "Per Kg" },
              { value: 3, label: "Per Ton" },
            ]} />
          <FormField label="Rate (₹)" name="vha_rate_per_uom" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Hire (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(hireAmt)}`} />
          <FormField label="Loading (₹)" name="vha_loading_amt" form={form} setForm={setForm} type="number" />
          <FormField label="Other (₹)" name="vha_dc_amt" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Total Hire (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(totalHire)}`} />
          <FormField label="Advance Payable (₹)" name="vha_advance_total" form={form} setForm={setForm} type="number" />
          <FormField label="TDS (₹)" name="vha_tds_amt" form={form} setForm={setForm} type="number" />
          <TextField size="small" label="Net Advance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(netAdvance)}`} />
          <TextField size="small" label="Balance (₹)" fullWidth sx={fieldSx} disabled
            value={`₹ ${fmt(balance)}`} />
          <TextField size="small" label="Loading Remarks" fullWidth sx={{ ...fieldSx, gridColumn: "1 / -1" }}
            value={form.vha_remarks} onChange={(e) => updateField("vha_remarks", e.target.value)}
            inputProps={{ maxLength: 100 }}
            placeholder="Loading remarks" />
        </FormPanel>
        </Box>

        {/* ═══════════ 2. MANIFEST / SHIPMENT DETAILS ═══════════ */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: "10px" }}>
          <h3 style={{ ...sectionStyle, margin: 0 }}>2. Manifest / Shipment Details</h3>
          <Tooltip title="Add manifest row">
            <IconButton onClick={addManifestRow} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <AddRowIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <DataTable
          columns={manifestColumns}
          rows={manifestRows}
          getKey={(row, index) => row.id || index}
          checkboxSelection
          rowSelectionModel={selectionIds}
          onRowSelectionModelChange={handleManifestSelectionChange}
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


        {/* ═══════════ 5. SETTLEMENT SUMMARY ═══════════ */}
        <h3 style={sectionStyle}>
          3. Settlement Summary
          {isVoucherSettled ? " (Settled — cannot settle again)" : ""}
        </h3>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Hire</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(totalHire)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Advance Payable</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(advancePayable)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>TDS</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(tdsAmt)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx()}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Net Advance</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>₹ {fmt(netAdvance)}</Typography>
          </Paper>
          <Paper elevation={0} sx={summaryCardSx(true)}>
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Balance</Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 700, color: "#7e22ce" }}>₹ {fmt(balance)}</Typography>
          </Paper>
        </Box>
        <Box
          sx={{
            "& .formPanel": { padding: "8px 10px", marginBottom: "10px", borderRadius: "8px" },
            "& .formGrid": { gap: "6px 8px", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" },
            "& .MuiInputBase-input": { fontSize: "12px !important", py: "7px" },
            "& .MuiInputLabel-root": { fontSize: "12px !important" },
          }}
        >
          <FormPanel>
            <FormField label="Final Payment Done On" name="vha_final_pay_date" form={form} setForm={setForm} type="date" disabled={isVoucherSettled} />
            <FormField label="Detention Charge (₹)" name="vha_dtn_amt" form={form} setForm={setForm} type="number" disabled={isVoucherSettled} />
            <FormField label="Other Charge (₹)" name="vha_dd_amt" form={form} setForm={setForm} type="number" disabled={isVoucherSettled} />
            <TextField size="small" label="Gross Payable (₹)" fullWidth sx={fieldSx} disabled
              value={`₹ ${fmt(grossPayable)}`} />
            <FormField label="TDS (₹)" name="vha_settle_tds_amt" form={form} setForm={setForm} type="number" disabled={isVoucherSettled} />
            <TextField size="small" label="Net Payable (₹)" fullWidth sx={fieldSx} disabled
              value={`₹ ${fmt(netPayable)}`} />
          </FormPanel>
        </Box>
      </PageBody>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </MainLayout>
  );
}


