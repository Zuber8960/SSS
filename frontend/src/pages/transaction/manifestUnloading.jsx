import { useState, useMemo, useCallback, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { IconButton, Tooltip, TextField } from "@mui/material";
import { SaveIcon, ResetIcon } from "../../components/common/icons";

import {
  PageBody,
  DataTable,
} from "../../components/common/MasterPage";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";

import { fetchManifestByNo, fetchManifestsByLocation } from "../../utils/manifest";
import { fetchDocketByDocketNo } from "../../utils/docket";

// ------------------- DOCKET COLUMNS (original) -------------------
const statusOptions = ["OK", "Short", "Excess", "Damage", "Leakage", "Missing", "Returned", "Hold"];

const ROW_COLORS = {
  OK: "#c8e6c9",
  Short: "#fff9c4",
  Damage: "#ffcdd2",
  Leakage: "#ffe0b2",
  Missing: "#f8bbd0",
  Excess: "#d1c4e9",
};

const docketColumns = [
  { key: "sr", label: "Sr", minWidth: 40 },
  { key: "docket_no", label: "Docket No", minWidth: 130, render: (row) => (
    <a href="#" style={{ textDecoration: "none", color: "#1565c0", fontWeight: "bold" }}>{row.docket_no}</a>
  ) },
  { key: "booking_date", label: "Booking Date", minWidth: 110 },
  { key: "consignor", label: "Consignor", minWidth: 150 },
  { key: "consignee", label: "Consignee", minWidth: 150 },
  { key: "destination", label: "Destination", minWidth: 100 },
  { key: "booked_pkgs", label: "Booked Pkgs", minWidth: 90 },
  { key: "received_pkgs", label: "Received Pkgs", minWidth: 100, type: "number", editable: true },
  { key: "short_qty", label: "Short", minWidth: 70, type: "number" },
  { key: "excess_qty", label: "Excess", minWidth: 70, type: "number", editable: true },
  { key: "damage_qty", label: "Damage", minWidth: 70, type: "number", editable: true },
  { key: "leak_qty", label: "Leakage", minWidth: 70, type: "number", editable: true },
  { key: "weight", label: "Weight", minWidth: 80 },
  { key: "status", label: "Status", minWidth: 100, editable: true, options: statusOptions },
  { key: "remarks", label: "Remarks", minWidth: 140, editable: true, placeholder: "Remarks" },
  { key: "updated_by", label: "Updated By", minWidth: 100 },
  { key: "updated_time", label: "Updated Time", minWidth: 100 },
];

// ------------------- MANIFEST LIST (top grid) COLUMNS -------------------
const manifestTypeLabels = { lp: "Local Pickup", lh: "Long Haul", ld: "Local Delivery" };

const manifestListColumns = [
  { key: "manifest_no", label: "Manifest No", minWidth: 130, render: (row) => (
    <a href="#" style={{ textDecoration: "none", color: "#1565c0", fontWeight: "bold" }}>{row.manifest_no}</a>
  ) },
  { key: "manifest_type", label: "Manifest Type", minWidth: 120 },
  { key: "manifest_date", label: "Manifest Date", minWidth: 130 },
  { key: "origin_branch", label: "Origin Branch", minWidth: 130 },
  { key: "dest_branch", label: "Dest Branch", minWidth: 120 },
  { key: "vehicle_no", label: "Vehicle No", minWidth: 120 },
  { key: "driver_name", label: "Driver Name", minWidth: 130 },
  { key: "total_dockets", label: "Dockets", minWidth: 100 },
  { key: "total_packages", label: "Packages", minWidth: 100 },
];

const emptyForm = {
  manifest_no: "",
  manifest_date: "",
  origin_branch: "",
  dest_branch: "",
  vehicle_no: "",
  vehicle_type: "",
  driver_name: "",
  driver_mobile: "",
  arrival_date: "",
  arrival_time: "",
  seal_no: "",
  dock_no: "",
  total_dockets: 0,
  total_packages: 0,
  total_weight: 0,
  manifest_status: "Open",
  arrival_remarks: "",
};

// ------------------- COMPONENT -------------------
export default function ManifestUnloading() {
  const { dialog, closeAlert, showSuccess, showError, showInfo } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [form, setForm] = useState({ ...emptyForm });
  const [dockets, setDockets] = useState([]);
  const [searchMode] = useState(true);

  // Search by vehicle number for the location-based manifest list grid
  const [vehicleSearch, setVehicleSearch] = useState("");

  // State for the location-based manifest list grid on top
  const [locationManifests, setLocationManifests] = useState([]);
  const [loadingManifests, setLoadingManifests] = useState(false);

  // ------------------- GET USER LOCATION ON MOUNT & FETCH MANIFESTS -------------------
  useEffect(() => {
    const fetchManifestsForLocation = async () => {
      try {
        // Get location from current_user or loc_code stored during login
        const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
        const locId = currentUser?.location_id || localStorage.getItem("loc_code");

        if (!locId) {
          showInfo("No location found for the logged-in user. Please login again.");
          return;
        }

        setLoadingManifests(true);
        const data = await fetchManifestsByLocation(locId);

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((m, i) => ({
            id: m.rec_id || m.mnf_no || i,
            sr: i + 1,
            manifest_no: m.mnf_no || m.manifest_no || "",
            manifest_type: manifestTypeLabels[(m.mnf_type || m.manifest_type || "").toLowerCase()] || m.mnf_type || m.manifest_type || "",
            manifest_date: (m.mnf_date || m.manifest_date || "").substring(0, 10),
            origin_branch: m.mnf_loc || m.origin_branch || "",
            dest_branch: m.mnf_to_loc || m.dest_branch || "",
            vehicle_no: m.desp_veh_no || m.vehicle_no || "",
            driver_name: m.loaded_by || m.driver_name || "",
            total_dockets: parseInt(m.mnf_no_of_dwb) || parseInt(m.total_dockets) || 0,
            total_packages: parseInt(m.mnf_no_of_pkgs) || parseInt(m.total_packages) || parseInt(m.no_of_packages) || 0,
            manifest_status: m.manifest_status || "Open",
            arrival_date: m.arrival_date || "",
            selected: false,
          }));
          setLocationManifests(mapped);
        } else {
          setLocationManifests([]);
        }
      } catch (err) {
        console.error("Failed to fetch manifests by location:", err);
        setLocationManifests([]);
      } finally {
        setLoadingManifests(false);
      }
    };

    fetchManifestsForLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filter manifests by vehicle no (live search) ----
  const filteredManifests = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return locationManifests;
    return locationManifests.filter((m) =>
      (m.vehicle_no || "").toLowerCase().includes(q)
    );
  }, [vehicleSearch, locationManifests]);

  // ---- Footer totals (original) ----
  const footerTotals = useMemo(() => {
    let totalPackages = 0;
    let totalWeight = 0;
    dockets.forEach((d) => {
      totalPackages += d.booked_pkgs || 0;
      totalWeight += d.weight || 0;
    });
    return { totalPackages, totalWeight };
  }, [dockets]);

  // ------------------- MAP HELPERS -------------------
  const mapHeaderToForm = (hdr) => ({
    manifest_no: hdr.mnf_no || hdr.manifest_no || "",
    manifest_date: (hdr.mnf_date || hdr.manifest_date || "").substring(0, 10),
    origin_branch: hdr.mnf_loc || "",
    dest_branch: hdr.mnf_to_loc || "",
    vehicle_no: hdr.desp_veh_no || "",
    vehicle_type: hdr.vehicle_type || "",
    driver_name: hdr.loaded_by || "",
    driver_mobile: hdr.driver_mobile || "",
    arrival_date: hdr.arrival_date || "",
    arrival_time: hdr.mnf_arrival_time || hdr.arrival_time || "",
    seal_no: hdr.seal_no || "",
    dock_no: hdr.dock_no || "",
    total_dockets: parseInt(hdr.mnf_no_of_dwb) || 0,
    total_packages: parseInt(hdr.mnf_no_of_pkgs) || parseInt(hdr.total_pkgs) || parseInt(hdr.no_of_packages) || 0,
    total_weight: parseFloat(hdr.mnf_actual_wt) || 0,
    // manifest_status: hdr.manifest_status || "Open",
    arrival_remarks: hdr.arrival_remarks || "",
  });

  const mapDocketToRow = (docket, index) => {
    const booked = parseInt(docket.docket_tot_pkgs) || 0;
    return {
      id: docket.rec_id || docket.id || index + 1,
      sr: index + 1,
      docket_no: docket.dwb_no || docket.docket_no || "",
      booking_date: new Date(docket.dwb_date || docket.docket_date).toLocaleDateString(),
      consignor: docket.consignor || docket.from_party || docket.dwb_loc || "",
      consignee: docket.consignee || docket.to_party || "",
      destination: docket.docket_to_loc || "",
      booked_pkgs: booked,
      received_pkgs: docket.received_pkgs != null ? docket.received_pkgs : booked,
      short_qty: docket.short_qty || 0,
      excess_qty: docket.excess_qty || 0,
      damage_qty: docket.damage_qty || 0,
      leak_qty: docket.leak_qty || 0,
      docket_act_wt: parseFloat(docket.dwb_actual_wt) || 0,
      docket_chrg_wt: parseFloat(docket.docket_chrg_wt) || 0,
      status: docket.unloading_status || docket.status || "OK",
      remarks: docket.docket_remark || "",
      updated_by: docket.aud_user || "",
      updated_time: new Date(docket.aud_date).toTimeString().substring(0, 8) || "",
      selected: false,
    };
  };

  // A docket is considered already saved & unloaded when its source has a
  // non-empty `unloading_status` (set by the backend on a previous save).
  const isAlreadyUnloaded = (row) => {
    const st = row?.unloading_status;
    return st != null && st !== "" && st !== 0;
  };

  // ------------------- FETCH & LOAD BY MANIFEST NO -------------------
  const fetchAndLoadByManifestNo = async (mnfNo) => {
    if (!mnfNo) {
      showError("Please enter a Manifest Number");
      return;
    }

    try {
      showLoading();
      const response = await fetchManifestByNo(mnfNo);

      if (!response) {
        showError("Manifest not found");
        return;
      }

      const manifestHeader = response.header || response;
      const manifestDetails = response.details || response.dockets || [];

      setForm(mapHeaderToForm(manifestHeader));

      if (manifestDetails.length > 0) {
        const fetchedDockets = [];
        for (let i = 0; i < manifestDetails.length; i++) {
          const detail = manifestDetails[i];
          const docketNo = detail.dwb_no || detail.docket_no || detail.docketId || "";
          if (!docketNo) continue;

          // Fetch the docket; fall back to the manifest detail row on error.
          let docketData = null;
          try {
            const data = await fetchDocketByDocketNo(docketNo);
            if (data) docketData = data;
          } catch {
            docketData = null;
          }

          // Skip dockets that were already saved & unloaded so they are not
          // shown again in the grid (and cannot be re-processed).
          const source = docketData || detail;
          if (isAlreadyUnloaded(source)) continue;

          fetchedDockets.push(mapDocketToRow(source, fetchedDockets.length));
        }

        setDockets(fetchedDockets);

        setForm((prev) => ({
          ...prev,
          total_dockets: fetchedDockets.length,
        }));
      }

      showInfo(`Manifest ${mnfNo} loaded successfully with ${manifestDetails.length} dockets`);
    } catch (err) {
      showError(err.message || "Failed to load manifest");
    } finally {
      hideLoading();
    }
  };

  // ------------------- LOAD MANIFEST FROM LOCATION GRID CLICK -------------------
  const handleLoadFromGrid = async (manifestNo) => {
    if (!manifestNo) return;
    await fetchAndLoadByManifestNo(manifestNo);
  };

  // ------------------- LOCATION MANIFEST GRID SELECTION (check/uncheck) -------------------
  // The DataGrid's selection model is an object { type, ids: Set }; normalise it.
  // A single select loads that manifest; an uncheck yields an empty set and does
  // nothing, preserving the "uncheck selected row without re-loading" behaviour.
  const handleManifestSelectionChange = (model) => {
    const ids = model?.ids instanceof Set ? model.ids
      : new Set(Array.isArray(model) ? model : []);
    const selectedIds = [...ids];

    setLocationManifests((prev) =>
      prev.map((m) => ({ ...m, selected: ids.has(m.id) }))
    );

    // Reusable: clears the form, dockets and any grid row selection.
    const clearFormAndGrid = () => {
      setForm({ ...emptyForm });
      setDockets([]);
      setLocationManifests((prev) =>
        prev.map((m) => ({ ...m, selected: false }))
      );
      setGridClearKey((k) => k + 1);
    };

    if (selectedIds.length === 1) {
      const manifest = locationManifests.find((m) => m.id === selectedIds[0]);
      if (manifest && manifest.manifest_no) {
        handleLoadFromGrid(manifest.manifest_no);
      }
    } else if (selectedIds.length === 0) {
      // Manifest row was unchecked -> clear the form and dockets.
      clearFormAndGrid();
      showInfo("Manifest selection cleared. Form has been reset.");
    }
  };

  // ------------------- DOCKET GRID SELECTION (check/uncheck) -------------------
  const handleDocketSelectionChange = (model) => {
    const ids = model?.ids instanceof Set ? model.ids
      : new Set(Array.isArray(model) ? model : []);
    setDockets((prev) =>
      prev.map((d) => ({ ...d, selected: ids.has(d.id) }))
    );
  };

  // ------------------- BUTTON HANDLERS -------------------
  // Incremented to force both grids (manifest list & dockets) to clear their
  // internal checkbox/row selection when the form is cleared.
  const [gridClearKey, setGridClearKey] = useState(0);

  const handleClear = () => {
    setForm({ ...emptyForm });
    setDockets([]);
    setLocationManifests((prev) =>
      prev.map((m) => ({ ...m, selected: false }))
    );
    setGridClearKey((k) => k + 1);
    showInfo("Form cleared");
  };

  const handleSave = async () => {
    if (!form.manifest_no) {
      showError("No manifest loaded. Please search and load a manifest first.");
      return;
    }

    // Only the selected (checked) dockets are saved.
    const selectedDockets = dockets.filter((d) => d.selected);
    if (selectedDockets.length === 0) {
      showError("No dockets selected. Please check the dockets you want to save.");
      return;
    }

    for (const d of selectedDockets) {
      if (d.status !== "OK" && !d.remarks?.trim()) {
        showError(`Remarks are mandatory for Docket ${d.docket_no} with status: ${d.status}`);
        return;
      }
    }

    try {
      showLoading();
      const payload = {
        mnf_no: form.manifest_no,
        mnf_date: form.manifest_date,
        mnf_loc: form.origin_branch,
        mnf_from_loc: form.origin_branch,
        mnf_to_loc: form.dest_branch,
        dest_branch: form.dest_branch,
        arrival_date: form.arrival_date,
        arrival_time: form.arrival_time,
        arrival_remarks: form.arrival_remarks,
        dock_no: form.dock_no,
        company_code: null,
        division_code: "1",
        record_created_by: "ADMIN",
        dockets: selectedDockets.map((d) => ({
          docket_no: d.docket_no,
          dwb_loc: d.consignor || d.dwb_loc || form.origin_branch,
          dwb_to_loc: d.destination || d.dwb_to_loc || form.dest_branch,
          dwb_date: d.booking_date || d.dwb_date || form.manifest_date,
          dwb_actual_wt: d.weight,
          dwb_charged_wt: d.weight,
          booked_pkgs: d.booked_pkgs,
          received_pkgs: d.received_pkgs,
          short_qty: d.short_qty,
          excess_qty: d.excess_qty,
          damage_qty: d.damage_qty,
          docket_chrg_wt: d.docket_chrg_wt,
          docket_act_wt: d.docket_act_wt,
          weight: d.weight,
          unloading_status: d.status,
          unloading_remarks: d.remarks,
        })),
      };

      const Api = (await import("../../services/api")).default;
      await Api.post("/manifest/unloading", payload);

      showSuccess(
        `${selectedDockets.length} docket${selectedDockets.length > 1 ? "s" : ""} for Manifest ${form.manifest_no} saved successfully.`
      );
      // Removing the saved rows from the grid; keep the unsaved dockets
      // loaded for further processing.
      const remainingCount = dockets.length - selectedDockets.length;
      setDockets((prev) => prev.filter((d) => !d.selected));

      // If every docket of this manifest is now saved, the manifest is fully
      // unloaded -> filter it out of the top manifests grid so it does not
      // show up again for selection.
      if (remainingCount <= 0) {
        setLocationManifests((prev) =>
          prev.filter((m) => (m.manifest_no || "") !== (form.manifest_no || ""))
        );
      }

      // After a successful save, clear the form, dockets and the manifest
      // row selection in the top grid so the user starts fresh.
      setForm({ ...emptyForm });
      setDockets([]);
      setLocationManifests((prev) =>
        prev.map((m) => ({ ...m, selected: false }))
      );
      setGridClearKey((k) => k + 1);
      if (remainingCount > 0) {
        showInfo(
          `Saved. ${remainingCount} docket(s) still pending for this manifest — re-select the manifest to continue.`
        );
      }
    } catch (err) {
      showError(err.message || "Failed to save");
    } finally {
      hideLoading();
    }
  };

  // ------------------- CELL CHANGE HANDLERS (original) -------------------
  const handleReceivedChange = useCallback(
    (rowId, newVal) => {
      setDockets((prev) =>
        prev.map((d) => {
          if (d.id !== rowId) return d;
          // Allow empty string so user can clear and type a new value
          const received = newVal === "" ? "" : parseInt(newVal) || 0;
          const booked = d.booked_pkgs || 0;
          const shortQty = received === "" ? 0 : Math.max(0, booked - received);
          return {
            ...d,
            received_pkgs: received,
            short_qty: shortQty,
            status: shortQty > 0 && d.status === "OK" ? "Short" : d.status,
            remarks:
              shortQty > 0
                ? shortQty + " Packages Short"
                : d.status === "Short" && shortQty === 0
                  ? ""
                  : d.remarks,
          };
        })
      );
    },
    []
  );

  const handleStatusChange = useCallback((rowId, newStatus) => {
    setDockets((prev) =>
      prev.map((d) => {
        if (d.id !== rowId) return d;
        let remarks = d.remarks;
        if (newStatus === "OK") remarks = "";
        else if (!remarks) remarks = newStatus + " reported during unloading";
        return { ...d, status: newStatus, remarks };
      })
    );
  }, []);

  const handleRemarksChange = useCallback((rowId, newVal) => {
    setDockets((prev) =>
      prev.map((d) => (d.id !== rowId ? d : { ...d, remarks: newVal }))
    );
  }, []);

  const handleCellChange = useCallback((rowId, key, value) => {
    if (key === "received_pkgs") handleReceivedChange(rowId, value);
    else if (key === "status") handleStatusChange(rowId, value);
    else if (key === "remarks") handleRemarksChange(rowId, value);
    else if (key === "excess_qty" || key === "damage_qty" || key === "leak_qty") {
      setDockets((prev) =>
        prev.map((d) => {
          if (d.id !== rowId) return d;
          // Allow empty string so user can clear the field and type a new value
          const newVal = value === "" ? "" : parseInt(value) || 0;
          return { ...d, [key]: newVal };
        })
      );
    }
  }, [handleReceivedChange, handleStatusChange, handleRemarksChange]);

  // ------------------- MANIFEST NO SEARCH HANDLERS -------------------
  const handleManifestNoSearch = async (mnfNo) => {
    const trimmed = (mnfNo || "").trim();
    if (!trimmed) return;
    await fetchAndLoadByManifestNo(trimmed);
  };

  const handleManifestNoKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleManifestNoSearch(form.manifest_no);
    }
  };

  const handleManifestNoBlur = async () => {
    await handleManifestNoSearch(form.manifest_no);
  };

  // ------------------- RENDER SECTION CARD -------------------
  const sectionCardStyles = {
    sectionCard: {
      background: "#fffefe",
      borderRadius: 12,
      border: "1px solid #e9e5f0",
      boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
      overflow: "hidden",
      marginBottom: 16,
    },
    sectionHeader: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 20px",
      background: "linear-gradient(135deg, #f6f3ff 0%, #f0ecf9 100%)",
      borderBottom: "1px solid #e9e5f0",
    },
    sectionIcon: { fontSize: 18, lineHeight: 1 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: "#4a3466",
      textTransform: "uppercase",
      letterSpacing: 0.1,
      margin: 0,
    },
  };

  const renderFormSection = () => {
    const horizontalStyle = {
      padding: "14px 16px",
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "flex-start",
    };

    return (
      <div style={{ ...sectionCardStyles.sectionCard, gridColumn: "1 / -1" }}>
        <div style={sectionCardStyles.sectionHeader}>
          <span style={sectionCardStyles.sectionIcon}>📋</span>
          <h4 style={sectionCardStyles.sectionTitle}>Manifest Information</h4>
        </div>
        <div style={horizontalStyle}>
          {/* Manifest No — searchable */}
          <TextField size="small" label="Manifest No" sx={{ ...fieldSx, minWidth: 150 }}
            value={form.manifest_no}
            onChange={(e) => setForm((p) => ({ ...p, manifest_no: e.target.value }))}
            onKeyDown={handleManifestNoKeyDown}
            onBlur={handleManifestNoBlur}
            disabled={!searchMode} />
          <TextField size="small" label="Manifest Date" type="date" sx={{ ...fieldSx, minWidth: 150 }}
            value={form.manifest_date}
            onChange={(e) => setForm((p) => ({ ...p, manifest_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} disabled />
          <TextField size="small" label="Origin Branch" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.origin_branch} disabled
            onChange={(e) => setForm((p) => ({ ...p, origin_branch: e.target.value }))} />
          <TextField size="small" label="Destination Branch" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.dest_branch} disabled
            onChange={(e) => setForm((p) => ({ ...p, dest_branch: e.target.value }))} />
          <TextField size="small" label="Vehicle No" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.vehicle_no} disabled
            onChange={(e) => setForm((p) => ({ ...p, vehicle_no: e.target.value }))} />
          <TextField size="small" label="Vehicle Type" sx={{ ...fieldSx, minWidth: 110 }}
            value={form.vehicle_type} disabled
            onChange={(e) => setForm((p) => ({ ...p, vehicle_type: e.target.value }))} />
          <TextField size="small" label="Driver Name" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.driver_name} disabled
            onChange={(e) => setForm((p) => ({ ...p, driver_name: e.target.value }))} />
          <TextField size="small" label="Driver Mobile" sx={{ ...fieldSx, minWidth: 120 }}
            value={form.driver_mobile} disabled
            onChange={(e) => setForm((p) => ({ ...p, driver_mobile: e.target.value }))} />
          <TextField size="small" label="Arrival Date" type="date" sx={{ ...fieldSx, minWidth: 150 }}
            value={form.arrival_date}
            onChange={(e) => setForm((p) => ({ ...p, arrival_date: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Arrival Time" type="time" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.arrival_time}
            onChange={(e) => setForm((p) => ({ ...p, arrival_time: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Seal No" sx={{ ...fieldSx, minWidth: 120 }}
            value={form.seal_no}
            onChange={(e) => setForm((p) => ({ ...p, seal_no: e.target.value }))} />
          <TextField size="small" label="Unloading Dock No" sx={{ ...fieldSx, minWidth: 130 }}
            value={form.dock_no}
            onChange={(e) => setForm((p) => ({ ...p, dock_no: e.target.value }))} />
          <TextField size="small" label="Total Dockets" type="number" sx={{ ...fieldSx, minWidth: 110 }}
            value={form.total_dockets} disabled />
          <TextField size="small" label="Total Packages" type="number" sx={{ ...fieldSx, minWidth: 110 }}
            value={form.total_packages} disabled />
          <TextField size="small" label="Total Weight" type="number" sx={{ ...fieldSx, minWidth: 110 }}
            value={form.total_weight} disabled />
          <TextField size="small" label="Arrival Remarks" sx={{ ...fieldSx, flex: "1 1 50%", minWidth: 200 }}
            value={form.arrival_remarks} multiline rows={2}
            onChange={(e) => setForm((p) => ({ ...p, arrival_remarks: e.target.value }))} />
        </div>
      </div>
    );
  };

  // ------------------- RENDER -------------------
  const styles = {
    panel: {
      background: "#fff",
      borderRadius: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      marginBottom: 15,
      overflow: "hidden",
    },
    panelTitle: {
      background: "#1565c0",
      color: "#fff",
      padding: "10px 15px",
      fontSize: 16,
      fontWeight: 600,
    },
    panelBody: { padding: 15 },
    footer: {
      background: "#fff",
      padding: 15,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 -2px 8px rgba(0,0,0,.08)",
      borderRadius: "0 0 8px 8px",
      marginTop: 15,
    },
    footerBold: { color: "#1565c0", fontWeight: "bold" },
  };

  return (
    <MainLayout>
      <PageBody title="Manifest Unloading">
        {/* ✅ TOOLBAR */}
        <div className="pageToolbar" style={{ alignItems: "center" }}>
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
          <TextField
            size="small"
            label="Search by Vehicle No"
            value={vehicleSearch}
            onChange={(e) => setVehicleSearch(e.target.value)}
            sx={{ ...fieldSx, minWidth: 220, marginLeft: "auto" }}
            placeholder="Search by vehicle number..."
          />
        </div>

        {/* ✅ LOCATION-BASED MANIFEST LIST GRID (TOP) */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>
            📦 Manifests for Your Location
            {filteredManifests.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, opacity: 0.8 }}>
                ({filteredManifests.length} {vehicleSearch ? "matching manifests" : "manifests"})
              </span>
            )}
          </div>
          <div style={styles.panelBody}>
            {loadingManifests ? (
              <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
                Loading manifests...
              </div>
            ) : filteredManifests.length > 0 ? (
              <DataTable
                columns={manifestListColumns}
                rows={filteredManifests}
                getKey={(row) => row.id}
                checkboxSelection
                disableMultipleRowSelection
                toggleRowSelectionOnClick
                onRowSelectionModelChange={handleManifestSelectionChange}
                key={`manifest-grid-${gridClearKey}`}
                isHeight={220}
                scroll={{ horizontal: true }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
                {vehicleSearch.trim()
                  ? `No manifests found for vehicle: ${vehicleSearch.trim()}`
                  : "No manifests found for your location."}
              </div>
            )}
          </div>
        </div>

        {/* ✅ HEADER FORM (Card Layout like HireVoucher) */}
        <div
          style={{
            background: "#f8f6ff",
            borderRadius: 14,
            border: "1px solid #e9e5f0",
            padding: "1px",
            boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
          }}
        >
          {renderFormSection()}
        </div>

        {/* ✅ DOCKET GRID (original StatusGrid with row colors) */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>
            Manifest Docket Details
            {dockets.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, opacity: 0.8 }}>
                ({dockets.length} dockets)
              </span>
            )}
          </div>
          <div style={styles.panelBody}>
            {dockets.length > 0 ? (
              <DataTable
                columns={docketColumns}
                rows={dockets}
                getKey={(row) => row.id}
                checkboxSelection
                toggleRowSelectionOnClick
                editable={false}
                onCellChange={handleCellChange}
                onRowSelectionModelChange={handleDocketSelectionChange}
                key={`docket-grid-${gridClearKey}`}
                rowColors={ROW_COLORS}
                statusKey="status"
                isHeight={100}
                scroll={{ horizontal: true }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                {form.manifest_no
                  ? "No dockets found for this manifest."
                  : "Select a manifest from the top grid or enter a Manifest Number and press Enter to load dockets."}
              </div>
            )}
          </div>
        </div>

        {/* ✅ FOOTER (original) */}
        {dockets.length > 0 && (
          <div style={styles.footer}>
            <div>
              <b style={styles.footerBold}>Total Packages :</b>{" "}
              <span>{footerTotals.totalPackages}</span>
            </div>
            <div>
              <b style={styles.footerBold}>Total Weight :</b>{" "}
              <span>{footerTotals.totalWeight}</span> KG
            </div>
            <div>
              <b style={styles.footerBold}>Updated By :</b> ADMIN
            </div>
            {/* <div>
              <b style={styles.footerBold}>Status :</b> {form.manifest_status}
            </div> */}
          </div>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}