import { useState, useMemo, useRef, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";

import {
  DataTable,
  FormPanel,
  PageBody,
} from "../../components/common/MasterPage";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

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

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { fetchDocketByDocketNo } from "../../utils/docket";
import { fetchAllLocations, fetchLocationTowns } from "../../utils/locationMaster";
import { AddIcon, DeleteIcon, EditIcon, SaveIcon, NoteAddIcon, ResetIcon, PrintIcon } from "../../components/common/icons";
import { IconButton, Tooltip } from "@mui/material";
import { getTenantConfig } from "../../utils/tenantService";
import logoImgFallback from "../../images/logo.png";
import {
  createManifest,
  fetchManifestByNo,
  updateManifest,
} from "../../utils/manifest";
import { fetchLorryByVehicleNo } from "../../utils/lorryMaster";
import {
  validateLocalPickup,
  validateLongHaul,
  validateLocalDelivery,
} from "../../utils/cnsValidation";

// ✅ Detail Table Columns (Dockets inside Manifest)
// Only docket_no is editable; all other columns are read-only (auto-filled from API)
const detailColumns = [
  { key: "docket_no", label: "Docket No", editable: true },
  { key: "from_loc", label: "From", editable: false },
  { key: "to_loc", label: "To", editable: false },
  { key: "packages", label: "Packages", editable: false },
  { key: "weight", label: "Weight", editable: false },
];

const emptyForm = {
  manifest_no: "",
  manifest_date: "",
  from_loc: "",
  from_town: "",
  to_loc: "",
  to_town: "",
  vehicle_no: "",
  driver_name: "",
  driver_mobile: "",
  manifest_type: "",
  no_of_docket: "",
  consignor: "",
  consignee: "",
  total_wt: "",
  total_pkgs: "",
  remarks: "",
};

export default function ManifestPage() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [form, setForm] = useState({ ...emptyForm });
  const [details, setDetails] = useState([]);
  const [docketCache, setDocketCache] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [townOptions, setTownOptions] = useState({ from: [], to: [] });

  // Build location dropdown options
  const locationOptions = locations.map((loc) => ({
    label: `${loc.loc_code} - ${loc.loc_name}`,
    value: loc.loc_code,
  }));

  // Build town dropdown options
  const townFieldOptions = useMemo(() => ({
    from: townOptions.from.map((town) => ({
      label: town.town_name || town.town_code || town.loc_code || town.name,
      value: town.town_name || town.town_code || town.loc_code || town.name,
    })),
    to: townOptions.to.map((town) => ({
      label: town.town_name || town.town_code || town.loc_code || town.name,
      value: town.town_name || town.town_code || town.loc_code || town.name,
    })),
  }), [townOptions]);

  // Load locations on mount
  useEffect(() => {
    fetchAllLocations()
      .then((data) => setLocations(data))
      .catch((err) => console.error("Failed to load locations:", err));
  }, []);

  // Load towns when from_loc changes
  useEffect(() => {
    const loadTowns = async () => {
      if (!form.from_loc) {
        setTownOptions((prev) => ({ ...prev, from: [] }));
        return;
      }
      try {
        const towns = await fetchLocationTowns(form.from_loc);
        setTownOptions((prev) => ({ ...prev, from: towns || [] }));
      } catch (err) {
        console.error("Failed to load from towns:", err);
        setTownOptions((prev) => ({ ...prev, from: [] }));
      }
    };
    loadTowns();
  }, [form.from_loc]);

  // Load towns when to_loc changes
  useEffect(() => {
    const loadTowns = async () => {
      if (!form.to_loc) {
        setTownOptions((prev) => ({ ...prev, to: [] }));
        return;
      }
      try {
        const towns = await fetchLocationTowns(form.to_loc);
        setTownOptions((prev) => ({ ...prev, to: towns || [] }));
      } catch (err) {
        console.error("Failed to load to towns:", err);
        setTownOptions((prev) => ({ ...prev, to: [] }));
      }
    };
    loadTowns();
  }, [form.to_loc]);

  // Mode: "create" | "edit"
  const [mode, setMode] = useState("create");
  // When true, manifest_no field becomes enabled for typing search number
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Store original composite key for updates
  const originalKey = useRef(null);

  // ✅ Compute totals from detail rows
  const computedTotals = useMemo(() => {
    let totalWt = 0;
    let totalPkgs = 0;
    let totalDockets = 0;
    details.forEach((row) => {
      totalWt += parseFloat(row.weight) || 0;
      totalPkgs += parseFloat(row.packages) || 0;
      if (row.docket_no && row.docket_no.trim() !== "") {
        totalDockets++;
      }
    });
    return { total_wt: totalWt, total_pkgs: totalPkgs, total_dockets: totalDockets };
  }, [details]);


  // ✅ Add Row
  const addRow = () => {
    setDetails([
      ...details,
      {
        docket_no: "",
        from_loc: "",
        to_loc: "",
        packages: "",
        weight: "",
      },
    ]);
  };

  // ✅ Delete selected rows
  const deleteSelectedRows = () => {
    const ids = Array.from(selectedRows);
    if (!ids.length) {
      showError("Please select at least one row to delete");
      return;
    }
    showWarning(
      "Delete Rows",
      `Are you sure you want to delete ${ids.length} selected row(s)?`,
      () => {
        setDetails((prev) => prev.filter((_, idx) => !ids.includes(idx)));
        setSelectedRows([]);
      }
    );
  };

  // ✅ Update Row
  const updateRow = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);
  };

  // ✅ CNS Validation: check if docket can be added to this manifest based on manifest type
  const validateDocketForManifest = async (docketNo, docketData) => {
    const manifestType = form.manifest_type;
    if (!manifestType) {
      showError("Please select Manifest Type before adding dockets");
      return false;
    }

    const fromLoc = form.from_loc;
    const fromTown = form.from_town;
    const toLoc = form.to_loc;
    const toTown = form.to_town;

    if (!fromLoc) {
      showError("Please select From Location before adding dockets");
      return false;
    }

    try {
      if (manifestType === "lp") {
        // LOCAL PICKUP: Check from sst_docket
        // DOCKET FROM LOC = MANIFEST FROM LOC
        // DOCKET FROM TOWN = MANIFEST FROM TOWN
        // AND (TOT_PKGS - DESP_PKGS) > 0
        const result = await validateLocalPickup(docketNo, fromLoc, fromTown);
        if (!result?.valid) {
          showError(result?.message || `Docket ${docketNo} is not valid for Local Pickup at location ${fromLoc}`);
          return false;
        }
        return true;
      } else if (manifestType === "lh") {
        // LONG HAUL:
        // a) Check from sst_docket: DOCKET FROM LOC = MANIFEST FROM LOC, DOCKET FROM TOWN = MANIFEST FROM TOWN, (TOT_PKGS - DESP_PKGS) > 0
        // b) Check from sst_unloading_dtl: unld_loc_code = MANIFEST FROM LOC and (pkgs_received - desp_pkgs) > 0
        const result = await validateLongHaul(docketNo, fromLoc, fromTown);
        if (!result?.valid) {
          showError(result?.message || `Docket ${docketNo} is not valid for Long Haul at location ${fromLoc}`);
          return false;
        }
        return true;
      } else if (manifestType === "ld") {
        // LOCAL DELIVERY: Check from sst_unloading_dtl
        // unld_loc_code = MANIFEST FROM LOC and (pkgs_received - desp_pkgs) > 0
        // docket_to_loc = manifest_from_loc and manifest_to_town = docket_to_town
        if (!toLoc || !toTown) {
          showError("Please select To Location and To Town for Local Delivery validation");
          return false;
        }
        const result = await validateLocalDelivery(docketNo, fromLoc, toLoc, toTown);
        if (!result?.valid) {
          showError(result?.message || `Docket ${docketNo} is not valid for Local Delivery at location ${fromLoc}`);
          return false;
        }
        return true;
      } else {
        // No manifest type selected or unknown type - skip CNS validation
        return true;
      }
    } catch (err) {
      showError(`CNS Validation failed: ${err.message || "Unknown error"}`);
      console.error("CNS Validation error:", err);
      return false;
    }
  };

  // ✅ When docket_no changes, fetch details from API, validate CNS, and auto-fill the row
  const fetchAndFillDocket = async (index, docketNo) => {
    if (!docketNo) return;
    try {
      showLoading();
      let docketData = docketCache[docketNo];
      if (!docketData) {
        docketData = await fetchDocketByDocketNo(docketNo);
        if (docketData) {
          setDocketCache((prev) => ({ ...prev, [docketNo]: docketData }));
        }
      }
      if (docketData) {
        // ✅ Run CNS validation before filling the row
        const isValid = await validateDocketForManifest(docketNo, docketData);
        if (!isValid) {
          // Clear the row's auto-filled fields since validation failed
          setDetails((prev) => {
            const upd = [...prev];
            if (upd[index]) {
              upd[index] = {
                ...upd[index],
                from_loc: "",
                to_loc: "",
                packages: "",
                weight: "",
                docket_date: "",
              };
            }
            return upd;
          });
          return;
        }

        setDetails((prev) => {
          const upd = [...prev];
          if (upd[index]) {
            upd[index] = {
              ...upd[index],
              from_loc: docketData.docket_loc || "",
              to_loc: docketData.docket_to_loc || "",
              packages: docketData.docket_tot_pkgs ?? "",
              weight: docketData.docket_act_wt ?? "",
              docket_date: docketData.docket_date ? docketData.docket_date.substring(0, 10) : "",
            };
          }
          return upd;
        });
      } else {
        // Docket not found in API — clear the row's auto-filled fields
        setDetails((prev) => {
          const upd = [...prev];
          if (upd[index]) {
            upd[index] = {
              ...upd[index],
              from_loc: "",
              to_loc: "",
              packages: "",
              weight: "",
              docket_date: "",
            };
          }
          return upd;
        });
        showError(`Docket No "${docketNo}" not found`);
      }
    } catch (err) {
      // On error, clear the row's auto-filled fields
      setDetails((prev) => {
        const upd = [...prev];
        if (upd[index]) {
          upd[index] = {
            ...upd[index],
            from_loc: "",
            to_loc: "",
            packages: "",
            weight: "",
            docket_date: "",
          };
        }
        return upd;
      });
      showError(err.message || "Failed to fetch docket details");
      console.error("Fetch docket error:", err);
    } finally {
      hideLoading();
    }
  };

  // ✅ Validate vehicle number against Lorry Master
  const validateVehicleNo = async (vehicleNo) => {
    if (!vehicleNo) return;
    try {
      const lorryData = await fetchLorryByVehicleNo(vehicleNo);
      if (!lorryData) {
        showError(`Vehicle No "${vehicleNo}" not found in Lorry Master`);
      }
    } catch (err) {
      showError(err.message || "Failed to validate vehicle number");
      console.error("Validate vehicle no error:", err);
    }
  };

  // ✅ Handle vehicle_no field change – convert to uppercase
  const handleVehicleNoChange = (value) => {
    const upperValue = value.toUpperCase();
    setForm((prev) => ({ ...prev, vehicle_no: upperValue }));
  };

  // ✅ Handle vehicle_no field blur/Enter – validate against Lorry Master
  const handleVehicleNoValidate = () => {
    const vno = form.vehicle_no?.trim();
    if (vno) {
      validateVehicleNo(vno);
    }
  };

  // ✅ Cell change handler (fires only when value actually changes)
  const handleCellChange = (rowIndex, key, value) => {
    updateRow(rowIndex, key, value);
    if (key === "docket_no") {
      fetchAndFillDocket(rowIndex, value);
    }
  };

  // ✅ Cell edit stop handler (fires when user finishes editing, even if value didn't change)
  // This allows re-entering the same docket number after a failed fetch/validation
  const handleCellEditStop = (params, event) => {
    const { id, field, reason } = params;
    if (field === "docket_no" && (reason === "cellFocusOut" || reason === "escapeKeyDown")) {
      const rowIndex = id;
      const docketNo = details[rowIndex]?.docket_no?.trim();
      if (docketNo) {
        fetchAndFillDocket(rowIndex, docketNo);
      }
    }
  };

  // ✅ Map form fields to DB header columns
  const mapFormToHeader = () => ({
    division_code: localStorage.getItem("division_code") || "",
    mnf_loc: form.from_loc,
    mnf_date: form.manifest_date || null,
    mnf_to_loc: form.to_loc,
    mnf_from_town: form.from_town || "",
    mnf_to_town: form.to_town || "",
    desp_veh_no: form.vehicle_no,
    loaded_by: form.driver_name,
    driver_mobile: form.driver_mobile || "",
    mnf_type: form.manifest_type || "",
    mnf_no_of_pkgs: computedTotals.total_pkgs,
    mnf_actual_wt: computedTotals.total_wt,
    mnf_no_of_dwb: computedTotals.total_dockets,
    aud_user: form.remarks || "",
    aud_loc: form.from_loc || "",
  });

  // ✅ Map detail rows to DB detail columns (skip rows with missing required fields)
  const mapDetailsToDb = () =>
    details
      .filter((row) => row.docket_no && row.docket_no.trim() !== "")
      .map((row) => ({
        dwb_no: row.docket_no,
        dwb_date: row.docket_date || null,
        dwb_loc: row.from_loc,
        dwb_to_loc: row.to_loc,
        dwb_pkgs: parseFloat(row.packages) || 0,
        dwb_actual_wt: parseFloat(row.weight) || 0,
        dwb_charged_wt: parseFloat(row.weight) || 0,
        mnf_pkgs: parseFloat(row.packages) || 0,
      }));

  // ✅ Map DB header to form fields
  const mapHeaderToForm = (hdr) => ({
    manifest_no: hdr.mnf_no || "",
    manifest_date: hdr.mnf_date ? hdr.mnf_date.substring(0, 10) : "",
    from_loc: hdr.mnf_loc || "",
    from_town: hdr.mnf_from_town || "",
    to_loc: hdr.mnf_to_loc || "",
    to_town: hdr.mnf_to_town || "",
    vehicle_no: hdr.desp_veh_no || "",
    driver_name: hdr.loaded_by || "",
    driver_mobile: hdr.driver_mobile || "",
    manifest_type: hdr.mnf_type || "",
    no_of_docket: hdr.mnf_no_of_dwb ?? "",
    total_wt: hdr.mnf_actual_wt ?? "",
    total_pkgs: hdr.mnf_no_of_pkgs ?? "",
    remarks: hdr.aud_user || "",
  });

  // ✅ Map DB detail to form detail rows
  const mapDetailToForm = (dtl) => ({
    docket_no: dtl.dwb_no || "",
    docket_date: dtl.dwb_date ? dtl.dwb_date.substring(0, 10) : "",
    from_loc: dtl.dwb_loc || "",
    to_loc: dtl.dwb_to_loc || "",
    packages: dtl.dwb_pkgs ?? "",
    weight: dtl.dwb_actual_wt ?? "",
  });

  // ✅ Fetch manifest data from DB and populate form
  const fetchAndLoadManifest = async (mnfNo) => {
    try {
      showLoading();
      const data = await fetchManifestByNo(mnfNo);

      if (!data || !data.header) {
        showError("Manifest not found");
        return false;
      }

      const hdr = data.header;
      const dtls = data.details || [];

      setForm(mapHeaderToForm(hdr));
      setDetails(dtls.map(mapDetailToForm));

      originalKey.current = {
        mnf_no: hdr.mnf_no,
        mnf_loc: hdr.mnf_loc,
        mnf_date: hdr.mnf_date,
      };

      setMode("edit");
      // setIsSearchActive(false);
      showInfo("Manifest loaded successfully");
      return true;
    } catch (err) {
      handleClear();
      showError(err.message || "Failed to fetch manifest");
      console.error("Fetch manifest error:", err);
      return false;
    } finally {
      hideLoading();
    }
  };

  // ==================== BUTTON HANDLERS ====================

  // ✅ Create New — clear form
  const handleCreateNew = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    originalKey.current = null;
    setMode("create");
    setIsSearchActive(false);
    showInfo("New manifest form ready");
  };

  // ✅ Edit/View — first click enables the field, second click (after typing) fetches data
  const handleEditView = async () => {
    const mnfNo = form.manifest_no.trim();

    if (!mnfNo && !isSearchActive) {
      // First click: enable the manifest_no field so user can type
      setIsSearchActive(true);
      showInfo("Type the Manifest No in the field and click Enter/Tab");
      return;
    }

    if (!mnfNo && isSearchActive) {
      showError("Please type a Manifest No first");
      return;
    }

    // Fetch data from DB
    await fetchAndLoadManifest(mnfNo);
  };

  // ✅ Clear — reset form and details
  const handleClear = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    originalKey.current = null;
    setMode("create");
    setIsSearchActive(false);
    showInfo("Form cleared");
  };

  // ✅ Print — open print window with professionally formatted manifest
  const handlePrint = async () => {
    if (!form.manifest_no) {
      showError("Please load a manifest before printing");
      return;
    }

    try {
      showLoading();

      const manifestTypeLabels = { lp: "Local Pickup", lh: "Long Haul", ld: "Local Delivery" };

      // Format date helper
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${String(d.getDate()).padStart(2,"0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
      };

      const now = new Date();
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const printDate = `${String(now.getDate()).padStart(2,"0")}-${months[now.getMonth()]}-${now.getFullYear()}`;
      const printTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

      const filteredDocketRows = details.filter((row) => row.docket_no && row.docket_no.trim() !== "");

      // Get tenant config for logo and company name
      const tenantConfig = getTenantConfig();
      const tenantName = tenantConfig?.tenant_name || localStorage.getItem("company_name") || "ABC LOGISTICS PRIVATE LIMITED";
      const tenantAddress = tenantConfig?.tenant_address || localStorage.getItem("company_address") || "Regd Office : Address | GSTIN | Phone | Email | Website";

      // Convert logo to base64 for embedding
      const logoUrl = tenantConfig?.logo_url || logoImgFallback;
      let logoBase64 = "";
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        // If logo fetch fails, use fallback
        try {
          const response = await fetch(logoImgFallback);
          const blob = await response.blob();
          logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch {
          logoBase64 = "";
        }
      }

      const qrCodeSvg = `<span style="font-size:10px;font-family:monospace;">${form.manifest_no.replace(/./g, "|")}</span>`;

      const currentUser = localStorage.getItem("user_name") || "ADMIN";

      const printContent = `
      <html>
      <head>
        <title>Manifest #${form.manifest_no}</title>
        <style>
          @page { margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            font-family: "Courier New", Courier, monospace;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 10px;
            line-height: 1.3;
          }
          .print-container { padding: 5px 8px; }

          /* Box-drawing style using borders */
          .main-border { border: 2px solid #000; }
          .top-border { border-top: 2px solid #000; }
          .bottom-border { border-bottom: 2px solid #000; }
          .left-border { border-left: 2px solid #000; }
          .right-border { border-right: 2px solid #000; }

          /* Company Header */
          .company-header {
            text-align: center;
            border: 2px solid #000;
            padding: 6px 10px;
            margin-bottom: 0;
          }
          .company-header .logo-img {
            max-height: 60px;
            max-width: 200px;
            margin-bottom: 4px;
          }
          .company-header .company-name {
            font-size: 13px;
            font-weight: bold;
            margin-top: 2px;
          }
          .company-header .company-address {
            font-size: 9px;
            color: #333;
            margin-top: 2px;
          }

          /* Info Row - two column label-value */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            border-top: none;
          }
          .info-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            font-size: 10px;
            vertical-align: top;
          }
          .info-table td.label {
            font-weight: bold;
            width: 140px;
            white-space: nowrap;
            background: #f0f0f0;
          }

          /* Docket Table */
          .docket-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            border-top: none;
          }
          .docket-table th, .docket-table td {
            border: 1px solid #000;
            padding: 3px 4px;
            font-size: 9px;
          }
          .docket-table th {
            background: #e0e0e0;
            font-weight: bold;
            text-align: center;
            font-size: 9px;
          }
          .docket-table td.num { text-align: right; }
          .docket-table td.center { text-align: center; }

          /* Section border */
          .section-border {
            border: 2px solid #000;
            border-top: none;
            padding: 5px 8px;
          }

          .signature-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            border-top: none;
          }
          .signature-table td {
            border: 1px solid #000;
            padding: 5px 8px;
            font-size: 10px;
            vertical-align: top;
            height: 50px;
          }
          .signature-table td.label {
            font-weight: bold;
            background: #f0f0f0;
          }

          /* Footer */
          .print-footer-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            border-top: none;
          }
          .print-footer-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            font-size: 9px;
          }

          .checklist-item {
            display: inline-block;
            margin-right: 12px;
            font-size: 10px;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
            .info-table td.label { background: #f0f0f0 !important; }
            .docket-table th { background: #e0e0e0 !important; }
            .signature-table td.label { background: #f0f0f0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">

          <!-- COMPANY HEADER -->
          <div class="company-header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo-img" />` : '<div class="logo-img" style="font-size:14px;font-weight:bold;letter-spacing:2px;">[ COMPANY LOGO ]</div>'}
            <div class="company-name">${tenantName}</div>
            <div class="company-address">${tenantAddress}</div>
          </div>

          <!-- MANIFEST INFO ROW -->
          <table class="info-table">
            <tr>
              <td class="label">MANIFEST NO</td>
              <td>${form.manifest_no}</td>
              <td class="label">DATE</td>
              <td>${formatDate(form.manifest_date)}</td>
              <td class="label">TIME</td>
              <td>${printTime}</td>
              <td class="label">PAGE</td>
              <td>1 OF 1</td>
            </tr>
          </table>

          <!-- ROUTE INFO -->
          <table class="info-table">
            <tr>
              <td class="label">FROM</td>
              <td>${form.from_loc}${form.from_town ? "(" + form.from_town + ")" : ""}</td>
              <td class="label">TO</td>
              <td>${form.to_loc}${form.to_town ? "(" + form.to_town + ")" : ""}</td>
              <td class="label">TYPE</td>
              <td>${manifestTypeLabels[form.manifest_type] || form.manifest_type}</td>
            </tr>
          </table>

          <!-- VEHICLE INFO -->
          <table class="info-table">
            <tr>
              <td class="label">VEHICLE NO</td>
              <td>${form.vehicle_no}</td>
              <td class="label">DRIVER</td>
              <td>${form.driver_name}</td>
              <td class="label">MOBILE</td>
              <td>${form.driver_mobile}</td>
            </tr>
          </table>

          <!-- EXTRA INFO ROW (optional fields with fallback) -->
          <table class="info-table">
            <tr>
              <td class="label">VEHICLE TYPE</td>
              <td>${form.vehicle_type || "OWN VEHICLE"}</td>
              <td class="label">SEAL NO</td>
              <td colspan="3">${form.seal_no || ""}</td>
            </tr>
          </table>

          <!-- DOCKET TABLE HEADER -->
          <table class="docket-table" style="margin-top:2px;">
            <thead>
              <tr>
                <th style="width:25px;">SR</th>
                <th>DOCKET NO</th>
                <th style="width:60px;">DOCKET DATE</th>
                <th style="width:45px;">FROM</th>
                <th style="width:45px;">TO</th>
                <th style="width:35px;">PKGS</th>
                <th style="width:45px;">ACT WT</th>
                <th style="width:80px;">EWB NO</th>
                <th style="width:70px;">EWB EXPIRY</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                if (filteredDocketRows.length === 0) {
                  return '<tr><td colspan="10" style="text-align:center;padding:20px;font-style:italic;font-size:10px;">No dockets added</td></tr>';
                }
                return filteredDocketRows.map(
                  (row, idx) => {
                    const docketDate = row.docket_date ? formatDate(row.docket_date) : "";
                    const ewbNo = row.ewb_no || "";
                    const ewbExpiry = row.ewb_expiry ? formatDate(row.ewb_expiry) : "";
                    const remarks = row.remarks || "";
                    return `
                      <tr>
                        <td class="center">${idx + 1}</td>
                        <td class="center">${row.docket_no}</td>
                        <td class="center">${docketDate}</td>
                        <td class="center">${row.from_loc}</td>
                        <td class="center">${row.to_loc}</td>
                        <td class="num">${row.packages}</td>
                        <td class="num">${row.weight}</td>
                        <td class="center">${ewbNo}</td>
                        <td class="center">${ewbExpiry}</td>
                        <td>${remarks}</td>
                      </tr>
                    `;
                  }
                ).join("");
              })()}
              ${(() => {
                // Add empty rows to fill space
                const emptyRows = Math.max(0, 6 - filteredDocketRows.length);
                let html = "";
                for (let i = 0; i < emptyRows; i++) {
                  html += '<tr><td colspan="10" style="border:none;height:18px;">&nbsp;</td></tr>';
                }
                return html;
              })()}
            </tbody>
          </table>

          <!-- TOTALS ROW -->
          <table class="info-table">
            <tr style="font-weight:bold;">
              <td class="label">TOTAL DOCKETS</td>
              <td>${computedTotals.total_dockets}</td>
              <td class="label">TOTAL PKGS</td>
              <td>${computedTotals.total_pkgs}</td>
              <td class="label">ACT WT</td>
              <td>${computedTotals.total_wt} KG</td>
            </tr>
          </table>

          <!-- SPECIAL INSTRUCTIONS -->
          <table class="info-table">
            <tr>
              <td class="label">SPECIAL INSTRUCTIONS</td>
              <td colspan="5">${form.remarks || ""}</td>
            </tr>
          </table>

          <!-- CHECKLIST -->
          <table class="info-table">
            <tr>
              <td colspan="6" style="padding:5px 8px;">
                <span class="checklist-item">☐ Vehicle Checked</span>
                <span class="checklist-item">☐ Documents Verified</span>
                <span class="checklist-item">☐ Seal Applied</span>
                <span class="checklist-item">☐ GPS Active</span>
              </td>
            </tr>
          </table>

          <!-- SIGNATURES -->
          <table class="signature-table">
            <tr>
              <td class="label" style="width:33%;">Prepared By</td>
              <td class="label" style="width:34%;">Checked By</td>
              <td class="label" style="width:33%;">Driver Signature</td>
            </tr>
            <tr>
              <td style="height:40px;vertical-align:bottom;">
                <div style="margin-top:15px;">Name: ${localStorage.getItem("user_name") || ""}</div>
                <div>Sign: __________________</div>
              </td>
              <td style="height:40px;vertical-align:bottom;">
                <div style="margin-top:25px;">__________________</div>
              </td>
              <td style="height:40px;vertical-align:bottom;">
                <div style="margin-top:25px;">__________________</div>
              </td>
            </tr>
          </table>

          <!-- FOOTER -->
          <table class="print-footer-table">
            <tr>
              <td style="width:35%;">Printed On : ${printDate} ${printTime}</td>
              <td style="width:30%;">Printed By : ${currentUser}</td>
              <td style="width:35%;text-align:right;">
                ${qrCodeSvg ? qrCodeSvg : '<span style="font-size:10px;">' + form.manifest_no.replace(/./g, "|") + '</span>'}
              </td>
            </tr>
          </table>

        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      showError("Popup blocked. Please allow popups for this site.");
    }
    } catch (err) {
      showError("Print failed: " + (err.message || "Unknown error"));
      console.error("Print error:", err);
    } finally {
      hideLoading();
    }
  };

  // ✅ Save — create or update based on mode
  const handleSave = async () => {
    if (!form.from_loc) {
      showError("From Location is required");
      return;
    }
    if (!form.manifest_date) {
      showError("Manifest Date is required");
      return;
    }
    if (!details.length) {
      showError("Please add docket to save the manifest");
      return;
    }

    try {
      showLoading();

      const header = mapFormToHeader();
      const detailRows = mapDetailsToDb();

      if (mode === "create") {
        const response = await createManifest(header, detailRows);
        if (response.success) {
          const newMnfNo = response.data?.mnf_no;
          showSuccess(`Manifest #${newMnfNo} saved successfully`);

          setForm((prev) => ({ ...prev, manifest_no: newMnfNo }));
          originalKey.current = {
            mnf_no: newMnfNo,
            mnf_loc: header.mnf_loc,
            mnf_date: header.mnf_date,
          };
          setMode("edit");
        } else {
          showError(response.message || "Failed to save manifest");
        }
      } else if (mode === "edit") {
        if (!originalKey.current) {
          showError("No manifest key found for update");
          return;
        }
        const { mnf_no, mnf_loc, mnf_date } = originalKey.current;
        const response = await updateManifest(
          mnf_no,
          mnf_loc,
          mnf_date,
          header,
          detailRows
        );
        if (response.success) {
          showSuccess("Manifest updated successfully");
        } else {
          showError(response.message || "Failed to update manifest");
        }
      }
    } catch (err) {
      showError(err.message || "Failed to save manifest");
      console.error("Save manifest error:", err);
    } finally {
      hideLoading();
    }
  };

  const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  return (
    <MainLayout>
      <PageBody title="Manifest Entry">
        {/* ✅ Top Toolbar */}
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <Tooltip title="Create New">
            <IconButton onClick={handleCreateNew} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit / View">
            <IconButton onClick={handleEditView} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear">
            <IconButton onClick={handleClear} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save">
            <IconButton onClick={handleSave} size="small" sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print">
            <IconButton onClick={handlePrint} size="small" sx={{ color: "#2563eb", "&:hover": { background: "#dbeafe" } }}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 13,
              fontWeight: 600,
              color: mode === "create" ? "#16a34a" : "#ca8a04",
              background: mode === "create" ? "#dcfce7" : "#fef9c3",
              padding: "4px 12px",
              borderRadius: 12,
            }}
          >
            {isSearchActive
              ? "Type Manifest No & press Enter"
              : mode === "create"
                ? "CREATE"
                : "EDIT"}
          </span>
        </div>

        {/* ✅ Header Form */}
        <FormPanel>
          {isSearchActive ? (
            <div className="formFieldGroup">
              <label>Manifest No</label>
              <input
                type="text"
                value={form.manifest_no}
                onChange={(e) => setForm({ ...form, manifest_no: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { const mnfNo = form.manifest_no.trim(); if (mnfNo) fetchAndLoadManifest(mnfNo); } }}
                onBlur={() => { const mnfNo = form.manifest_no.trim(); if (mnfNo && isSearchActive) fetchAndLoadManifest(mnfNo); }}
                placeholder="Enter Manifest No"
                autoFocus
              />
            </div>
          ) : (
            <TextField size="small" label="Manifest No" fullWidth sx={fieldSx}
              value={form.manifest_no}
              onChange={(e) => setForm((prev) => ({ ...prev, manifest_no: e.target.value }))}
              disabled={mode === "create" && !isSearchActive} />
          )}

          <MuiSelect label="Manifest Type" name="manifest_type" value={form.manifest_type}
            onChange={(name, val) => setForm((prev) => ({ ...prev, [name]: val }))}
            options={[{ label: "Local Pickup", value: "lp" }, { label: "Long Haul", value: "lh" }, { label: "Local Delivery", value: "ld" }]} />

          <TextField size="small" label="Manifest Date" type="date" fullWidth sx={fieldSx}
            value={form.manifest_date}
            onChange={(e) => setForm((prev) => ({ ...prev, manifest_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />

          <MuiSelect label="From Location" name="from_loc" value={form.from_loc}
            onChange={(name, val) => setForm((prev) => ({ ...prev, [name]: val }))}
            options={locationOptions} />

          <MuiSelect label="From Town" name="from_town" value={form.from_town}
            onChange={(name, val) => setForm((prev) => ({ ...prev, [name]: val }))}
            options={townFieldOptions.from} />

          <MuiSelect label="To Location" name="to_loc" value={form.to_loc}
            onChange={(name, val) => setForm((prev) => ({ ...prev, [name]: val }))}
            options={locationOptions} />

          <MuiSelect label="To Town" name="to_town" value={form.to_town}
            onChange={(name, val) => setForm((prev) => ({ ...prev, [name]: val }))}
            options={townFieldOptions.to} />

          <TextField size="small" label="Vehicle No" fullWidth sx={fieldSx}
            value={form.vehicle_no}
            onChange={(e) => handleVehicleNoChange(e.target.value)}
            onBlur={handleVehicleNoValidate}
            onKeyDown={(e) => { if (e.key === "Enter") handleVehicleNoValidate(); }} />

          <TextField size="small" label="Driver Name" fullWidth sx={fieldSx}
            value={form.driver_name}
            onChange={(e) => setForm((prev) => ({ ...prev, driver_name: e.target.value }))} />

          <TextField size="small" label="Driver Mobile" fullWidth sx={fieldSx}
            value={form.driver_mobile}
            onChange={(e) => setForm((prev) => ({ ...prev, driver_mobile: e.target.value }))} />

          <TextField size="small" label="No of Dockets" fullWidth sx={fieldSx} type="number"
            value={computedTotals.total_dockets} disabled
            slotProps={{ input: { readOnly: true } }} />

          <TextField size="small" label="Total Weight" fullWidth sx={fieldSx} type="number"
            value={computedTotals.total_wt} disabled
            slotProps={{ input: { readOnly: true } }} />

          <TextField size="small" label="Total Packages" fullWidth sx={fieldSx} type="number"
            value={computedTotals.total_pkgs} disabled
            slotProps={{ input: { readOnly: true } }} />

          <div style={{ gridColumn: "1 / -1" }}>
            <TextField size="small" label="Remarks" fullWidth sx={fieldSx} multiline rows={2}
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} />
          </div>
        </FormPanel>

        <div style={sectionHeaderStyle}>
          <h3>Docket Details</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Tooltip title="Add Row">
              <IconButton
                onClick={addRow}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete selected">
              <IconButton
                onClick={deleteSelectedRows}
                size="small"
                sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
        <DataTable
          columns={detailColumns}
          rows={details}
          getKey={(row, index) => index}
          actions={[]}
          editable
          singleClick
          checkboxSelection
          onCellChange={handleCellChange}
          onCellEditStop={handleCellEditStop}
          onRowSelectionModelChange={(model) => {
            // MUI v7: { type: 'include', ids: Set } or { type: 'exclude', ids: Set }
            // 'exclude' with empty ids means "all rows selected"
            if (model?.type === 'exclude') {
              const allIds = new Set(details.map((_, idx) => idx).filter(idx => !model.ids.has(idx)));
              setSelectedRows(allIds);
            } else {
              const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
              setSelectedRows(ids);
            }
          }}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}