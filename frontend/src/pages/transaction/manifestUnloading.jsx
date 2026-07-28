import { useState, useMemo, useCallback, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { IconButton, Tooltip } from "@mui/material";
import { SaveIcon, ResetIcon } from "../../components/common/icons";

import {
  FormField,
  PageBody,
} from "../../components/common/MasterPage";

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import StatusGrid from "../../components/common/StatusGrid";

import { fetchManifestByNo, fetchManifestsByLocation } from "../../utils/manifest";
import { fetchDocketByDocketNo } from "../../utils/docket";

// ------------------- HEADER FIELDS -------------------
const headerFields = [
  { label: "Manifest No", name: "manifest_no", disabled: true },
  { label: "Manifest Date", name: "manifest_date", type: "date", disabled: true },
  { label: "Origin Branch", name: "origin_branch", disabled: true },
  { label: "Destination Branch", name: "dest_branch", disabled: true },
  { label: "Vehicle No", name: "vehicle_no", disabled: true },
  { label: "Vehicle Type", name: "vehicle_type", disabled: true },
  { label: "Driver Name", name: "driver_name", disabled: true },
  { label: "Driver Mobile", name: "driver_mobile", disabled: true },
  { label: "Arrival Date", name: "arrival_date", type: "date" },
  { label: "Arrival Time", name: "arrival_time", type: "time" },
  { label: "Seal No", name: "seal_no" },
  { label: "Unloading Dock No", name: "dock_no" },
  { label: "Total Dockets", name: "total_dockets", type: "number", disabled: true },
  { label: "Total Packages", name: "total_packages", type: "number", disabled: true },
  { label: "Total Weight", name: "total_weight", type: "number", disabled: true },
  // { label: "Manifest Status", name: "manifest_status", disabled: true },
  { label: "Arrival Remarks", name: "arrival_remarks", type: "textarea" },
];

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
  { key: "docket_no", label: "Docket No", minWidth: 130, type: "link" },
  { key: "booking_date", label: "Booking Date", minWidth: 110 },
  { key: "consignor", label: "Consignor", minWidth: 150 },
  { key: "consignee", label: "Consignee", minWidth: 150 },
  { key: "destination", label: "Destination", minWidth: 100 },
  { key: "booked_pkgs", label: "Booked Pkgs", minWidth: 90, align: "center" },
  { key: "received_pkgs", label: "Received Pkgs", minWidth: 100, type: "number", width: 70 },
  { key: "short_qty", label: "Short", minWidth: 70, type: "readonly_number", width: 60 },
  { key: "excess_qty", label: "Excess", minWidth: 70, type: "number", width: 60 },
  { key: "damage_qty", label: "Damage", minWidth: 70, type: "number", width: 60 },
  { key: "leak_qty", label: "Leakage", minWidth: 70, type: "number", width: 60 },
  { key: "weight", label: "Weight", minWidth: 80, align: "right" },
  { key: "status", label: "Status", minWidth: 100, type: "select", options: statusOptions },
  { key: "remarks", label: "Remarks", minWidth: 140, type: "text", placeholder: "Remarks" },
  { key: "updated_by", label: "Updated By", minWidth: 100 },
  { key: "updated_time", label: "Updated Time", minWidth: 100 },
];

// ------------------- MANIFEST LIST (top grid) COLUMNS -------------------
const manifestListColumns = [
  // { key: "sr", label: "Sr", minWidth: 40 },
  { key: "manifest_no", label: "Manifest No", minWidth: 130, type: "link" },
  { key: "manifest_date", label: "Manifest Date", minWidth: 110 },
  { key: "origin_branch", label: "Origin Branch", minWidth: 120 },
  { key: "dest_branch", label: "Dest Branch", minWidth: 120 },
  { key: "vehicle_no", label: "Vehicle No", minWidth: 120 },
  { key: "driver_name", label: "Driver Name", minWidth: 130 },
  { key: "total_dockets", label: "Dockets", minWidth: 70, align: "center" },
  { key: "total_packages", label: "Packages", minWidth: 80, align: "center" },
  // { key: "manifest_status", label: "Status", minWidth: 100 },
  // { key: "arrival_date", label: "Arrival Date", minWidth: 110 },
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
  const [searchMode, setSearchMode] = useState(true);

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
      booking_date: docket.dwb_date || docket.booking_date || docket.date || "",
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

          try {
            const docketData = await fetchDocketByDocketNo(docketNo);
            if (docketData) {
              fetchedDockets.push(mapDocketToRow(docketData, fetchedDockets.length));
            } else {
              fetchedDockets.push(mapDocketToRow(detail, fetchedDockets.length));
            }
          } catch (err) {
            fetchedDockets.push(mapDocketToRow(detail, fetchedDockets.length));
          }
        }

        if (fetchedDockets.length > 0) {
          setDockets(fetchedDockets);
        } else {
          setDockets(manifestDetails.map((d, i) => mapDocketToRow(d, i)));
        }

        setForm((prev) => ({
          ...prev,
          total_dockets: fetchedDockets.length > 0 ? fetchedDockets.length : manifestDetails.length,
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

  // ------------------- BUTTON HANDLERS -------------------
  const handleClear = () => {
    setForm({ ...emptyForm });
    setDockets([]);
    showInfo("Form cleared");
  };

  const handleSave = async () => {
    if (!form.manifest_no) {
      showError("No manifest loaded. Please search and load a manifest first.");
      return;
    }
    if (dockets.length === 0) {
      showError("No dockets to save");
      return;
    }

    for (const d of dockets) {
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
        dockets: dockets.map((d) => ({
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

      showSuccess(`Manifest ${form.manifest_no} unloading saved successfully.`);
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
  const fieldMap = {};
  headerFields.forEach((f) => {
    fieldMap[f.name] = f;
  });

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
    const sectionFieldConfigs = headerFields.filter(Boolean);
    if (sectionFieldConfigs.length === 0) return null;

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
          {sectionFieldConfigs.map((field) => {
            const isTextarea = field.type === "textarea";
            const fieldStyle = {
              minWidth: 130,
              flex: "0 1 auto",
              ...(isTextarea || field.fullWidth ? { flex: "1 1 50%" } : {}),
            };
            return (
              <div key={field.name} style={fieldStyle}>
                <FormField
                  {...field}
                  form={form}
                  setForm={setForm}
                  disabled={
                    field.disabled || (field.name === "manifest_no" && !searchMode)
                  }
                  onKeyDown={field.name === "manifest_no" ? handleManifestNoKeyDown : undefined}
                  onBlur={field.name === "manifest_no" ? handleManifestNoBlur : undefined}
                />
              </div>
            );
          })}
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
        </div>

        {/* ✅ LOCATION-BASED MANIFEST LIST GRID (TOP) */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>
            📦 Manifests for Your Location
            {locationManifests.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, opacity: 0.8 }}>
                ({locationManifests.length} manifests)
              </span>
            )}
          </div>
          <div style={styles.panelBody}>
            {loadingManifests ? (
              <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
                Loading manifests...
              </div>
            ) : locationManifests.length > 0 ? (
              <StatusGrid
                columns={manifestListColumns}
                rows={locationManifests}
                checkboxSelection={true}
                maxHeight={350}
                headerColor="#7b1fa2"
                minWidth={1200}
                onSelectRow={(rowId) => {
                  // Toggle selection: select the clicked row, deselect others
                  setLocationManifests((prev) =>
                    prev.map((m) => ({
                      ...m,
                      selected: m.id === rowId,
                    }))
                  );
                  const manifest = locationManifests.find((m) => m.id === rowId);
                  if (manifest && manifest.manifest_no) {
                    handleLoadFromGrid(manifest.manifest_no);
                  }
                }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
                No manifests found for your location.
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
              <StatusGrid
                columns={docketColumns}
                rows={dockets}
                rowColors={ROW_COLORS}
                onCellChange={handleCellChange}
                onSelectAll={(e) => {
                  const checked = e.target.checked;
                  setDockets((prev) => prev.map((x) => ({ ...x, selected: checked })));
                }}
                onSelectRow={(rowId) => {
                  setDockets((prev) =>
                    prev.map((x) => (x.id === rowId ? { ...x, selected: !x.selected } : x))
                  );
                }}
                minWidth={2100}
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