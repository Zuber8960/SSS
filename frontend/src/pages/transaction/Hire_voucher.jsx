import { useState, useRef } from "react";
import MainLayout from "../../layouts/MainLayout";
import { IconButton, Tooltip } from "@mui/material";
import { NoteAddIcon, SaveIcon, ResetIcon, ViewIcon, AddRowIcon, DeleteIcon } from "../../components/common/icons";

import {
  DataTable,
  FormField,
  FormPanel,
  PageBody,
  PageToolbar,
} from "../../components/common/MasterPage";

import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import vocherimage from "../../images/loogo.PNG";

import {
  createHireVoucher,
  fetchHireVoucherByVhvNo,
  updateHireVoucher,
} from "../../utils/hireVoucher";

import { fetchManifestByNo } from "../../utils/manifest";

// ------------------- IMAGE CONFIG -------------------
const voucherImage = vocherimage;
const bgPlaceholder = "/images/logo.png";

const sectionCardStyles = {
  sectionCard: {
    background: "#fffefe",
    borderRadius: 12,
    border: "1px solid #e9e5f0",
    boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
    overflow: "hidden",
    marginBottom: 16,
    transition: "box-shadow 0.2s ease",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #f6f3ff 0%, #f0ecf9 100%)",
    borderBottom: "1px solid #e9e5f0",
  },
  sectionIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#4a3466",
    textTransform: "uppercase",
    letterSpacing: 0.1,
    margin: 0,
  },
  sectionFields: {
    padding: "14px 16px",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  fullWidthField: {
    gridColumn: "1 / -1",
  },
};

// ------------------- HEADER FIELDS -------------------
const headerFields = [
  // Vehicle Hire Voucher
  { label: "VHV No", name: "vhv_no" },
  { label: "Date", name: "vhv_date", type: "date" },
  { label: "From Loc", name: "vhv_loc" },
  { label: "To Loc", name: "vhv_to_loc" },
  { label: "State", name: "vhv_state" },
  { label: "City", name: "vhv_city" },
  { label: "Town", name: "vhv_town" },
  { label: "Pin", name: "vhv_pin" },
  { label: "Via1", name: "via1" },
  { label: "Via2", name: "via2" },
  { label: "Via3", name: "via3" },
  { label: "Via4", name: "via4" },
  { label: "Via5", name: "via5" },
  { label: "Via6", name: "via6" },
];

// ------------------- FORM SECTIONS (card layout) -------------------
const formSections = [
  {
    title: "Vehicle Hire Voucher",
    icon: "🚛",
    fields: ["vhv_no", "vhv_date", "vhv_loc", "vhv_to_loc", "vhv_state", "vhv_city", "vhv_town", "vhv_pin", "via1", "via2", "via3", "via4", "via5", "via6"],
    half: false,
    horizontal: true,
  },
];

// ------------------- DETAIL TABLE COLUMNS (sst_vha_dtl - Manifest Docket Data) -------------------
const detailColumns = [
  { key: "mnf_loc", label: "Mnf Loc" },
  { key: "mnf_no", label: "Mnf No" },
  { key: "mnf_date", label: "Mnf Date" },
  { key: "mnf_act_weight", label: "Act Weight", type: "number" },
  { key: "mnf_chrg_weight", label: "Chrg Weight", type: "number" },
  { key: "mnf_pkgs_no", label: "Pkgs", type: "number" },
  { key: "mnf_cns_no", label: "Cns No", type: "number" },
];

// ------------------- MANIFEST DETAILS TABLE COLUMNS -------------------
const manifestColumns = [
  { key: "manifest_no", label: "Manifest No" },
  { key: "manifest_date", label: "Date" },
  { key: "from_loc", label: "From Loc" },
  { key: "to_loc", label: "To Loc" },
  { key: "vehicle_no", label: "Vehicle No" },
  { key: "driver_name", label: "Driver Name" },
];

const emptyForm = {
  vhv_no: "",
  vhv_date: "",
  vhv_loc: "",
  vhv_to_loc: "",
  vhv_state: "",
  vhv_city: "",
  vhv_town: "",
  vhv_pin: "",
  via1: "",
  via2: "",
  via3: "",
  via4: "",
  via5: "",
  via6: "",
};

// ------------------- DESIGN / HEADER IMAGE -------------------
const headerDesignStyle = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    background: "linear-gradient(135deg, #7e22ce 0%, #a855f7 50%, #c084fc 100%)",
    borderRadius: 16,
    marginBottom: 24,
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(126, 34, 206, 0.3)",
  },
  overlay: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    pointerEvents: "none",
  },
  overlay2: {
    position: "absolute",
    bottom: -30,
    left: -10,
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    pointerEvents: "none",
  },
  textContainer: {
    zIndex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 400,
    margin: "6px 0 0 0",
    opacity: 0.9,
  },
  imageContainer: {
    zIndex: 1,
    width: 80,
    height: 80,
    borderRadius: 12,
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: 8,
  },
};

// ------------------- COMPONENT -------------------
export default function HireVoucherPage() {
  const { dialog, closeAlert, showSuccess, showError, showInfo } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [form, setForm] = useState({ ...emptyForm });
  const [details, setDetails] = useState([]);
  const [manifestDetails, setManifestDetails] = useState([]);
  const [manifestCache, setManifestCache] = useState({});

  // Mode: "create" | "edit"
  const [mode, setMode] = useState("create");
  // Toggle: when true, VHV No field is enabled for user to type
  const [searchMode, setSearchMode] = useState(false);

  // Store original composite key for updates
  const originalKey = useRef(null);

  // ------------------- DETAIL ROW HANDLERS (sst_vha_dtl) -------------------
  const addRow = () => {
    setDetails([
      ...details,
      {
        mnf_loc: "",
        mnf_no: "",
        mnf_date: "",
        mnf_act_weight: "",
        mnf_chrg_weight: "",
        mnf_pkgs_no: "",
        mnf_cns_no: "",
      },
    ]);
  };

  const deleteRow = (row) => {
    setDetails((prev) => prev.filter((r) => r !== row));
  };

  const updateRow = (index, field, value) => {
    const updated = [...details];
    updated[index][field] = value;
    setDetails(updated);
  };

  const handleCellChange = (rowIndex, key, value) => {
    updateRow(rowIndex, key, value);
  };

  // ------------------- MANIFEST DETAILS HANDLERS -------------------
  const addManifestRow = () => {
    setManifestDetails([
      ...manifestDetails,
      {
        manifest_no: "",
        manifest_date: "",
        from_loc: "",
        to_loc: "",
        vehicle_no: "",
        driver_name: "",
      },
    ]);
  };

  const deleteManifestRow = (row) => {
    setManifestDetails((prev) => prev.filter((r) => r !== row));
  };

  const updateManifestRow = (index, field, value) => {
    const updated = [...manifestDetails];
    updated[index][field] = value;
    setManifestDetails(updated);
  };

  // When manifest_no changes, fetch details from API and auto-fill the row
  const fetchAndFillManifest = async (index, manifestNo) => {
    if (!manifestNo) return;
    try {
      showLoading();
      let manifestData = manifestCache[manifestNo];
      if (!manifestData) {
        manifestData = await fetchManifestByNo(manifestNo);
        if (manifestData) {
          setManifestCache((prev) => ({ ...prev, [manifestNo]: manifestData }));
        }
      }
      if (!manifestData || !manifestData.header) {
        showError("Manifest not found");
        return;
      }
      const hdr = manifestData.header;
      setManifestDetails((prev) => {
        const upd = [...prev];
        if (upd[index]) {
          upd[index] = {
            ...upd[index],
            manifest_date: hdr.mnf_date ? hdr.mnf_date.substring(0, 10) : "",
            from_loc: hdr.mnf_loc || "",
            to_loc: hdr.mnf_to_loc || "",
            vehicle_no: hdr.desp_veh_no || "",
            driver_name: hdr.loaded_by || "",
          };
        }
        return upd;
      });

        // Populate a single aggregated row from all manifest docket rows
        const dtls = manifestData.details || [];
        if (dtls.length > 0) {
          const totalActWeight = dtls.reduce((sum, dtl) => sum + (parseFloat(dtl?.dwb_actual_wt) || 0), 0);
          const totalChrgWeight = dtls.reduce((sum, dtl) => sum + (parseFloat(dtl?.dwb_charged_wt) || 0), 0);
          const totalPkgs = dtls.reduce((sum, dtl) => sum + (parseFloat(dtl?.dwb_pkgs) || 0), 0);
          const totalCnsNo = dtls.reduce((sum, dtl) => sum + (parseFloat(dtl?.dwb_no) || 0), 0);
          setDetails((prev) => [
            ...prev,
            {
              mnf_loc: hdr.mnf_loc || "",
              mnf_no: hdr.mnf_no || "",
              mnf_date: hdr.mnf_date ? hdr.mnf_date.substring(0, 10) : "",
              mnf_act_weight: totalActWeight || "",
              mnf_chrg_weight: totalChrgWeight || "",
              mnf_pkgs_no: totalPkgs || "",
              mnf_cns_no: totalCnsNo || "",
            },
          ]);
        }
    } catch (err) {
      showError(err.message || "Failed to fetch manifest details");
      console.error("Fetch manifest error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleManifestCellChange = (rowIndex, key, value) => {
    updateManifestRow(rowIndex, key, value);
    if (key === "manifest_no") {
      fetchAndFillManifest(rowIndex, value);
    }
  };

  // ------------------- MAP HELPERS -------------------
  const mapFormToHeader = () => ({
    vha_no: form.vhv_no,
    vha_date: form.vhv_date || null,
    vha_loc: form.vhv_loc,
    vha_to_loc: form.vhv_to_loc,
    vha_to_loc_state: form.vhv_state,
    vha_to_loc_city: form.vhv_city,
    vha_to_loc_town: form.vhv_town,
    vha_to_loc_pincode: form.vhv_pin,
    vha_via_loc_1: form.via1,
    vha_via_loc_2: form.via2,
    vha_via_loc_3: form.via3,
    vha_via_loc_4: form.via4,
    vha_via_loc_5: form.via5,
    vha_via_loc_6: form.via6,
  });

  const mapDetailsToDb = () =>
    details
      .filter((row) => row.mnf_cns_no)
      .map((row) => ({
        mnf_loc: row.mnf_loc || "",
        mnf_no: row.mnf_no || "",
        mnf_date: row.mnf_date || null,
        mnf_act_weight: parseFloat(row.mnf_act_weight) || 0,
        mnf_chrg_weight: parseFloat(row.mnf_chrg_weight) || 0,
        mnf_pkgs_no: parseFloat(row.mnf_pkgs_no) || 0,
        mnf_cns_no: row.mnf_cns_no || "",
      }));

  const mapHeaderToForm = (hdr) => ({
    vhv_no: hdr.vha_no || "",
    vhv_date: hdr.vha_date ? hdr.vha_date.substring(0, 10) : "",
    vhv_loc: hdr.vha_loc || "",
    vhv_to_loc: hdr.vha_to_loc || "",
    vhv_state: hdr.vha_to_loc_state || "",
    vhv_city: hdr.vha_to_loc_city || "",
    vhv_town: hdr.vha_to_loc_town || "",
    vhv_pin: hdr.vha_to_loc_pincode || "",
    via1: hdr.vha_via_loc_1 || "", 
    via2: hdr.vha_via_loc_2 || "",
    via3: hdr.vha_via_loc_3 || "",
    via4: hdr.vha_via_loc_4 || "",
    via5: hdr.vha_via_loc_5 || "",
    via6: hdr.vha_via_loc_6 || "",
  });

  const mapDetailToForm = (dtl) => ({
    mnf_loc: dtl.mnf_loc || "",
    mnf_no: dtl.mnf_no || "",
    mnf_date: dtl.mnf_date ? dtl.mnf_date.substring(0, 10) : "",
    mnf_act_weight: dtl.mnf_act_weight ?? "",
    mnf_chrg_weight: dtl.mnf_chrg_weight ?? "",
    mnf_pkgs_no: dtl.mnf_pkgs_no ?? "",
    mnf_cns_no: dtl.mnf_cns_no || "",
  });

  // ------------------- FETCH & LOAD BY VHV NO (for edit/view) -------------------
  const fetchAndLoadByVhvNo = async (vhvNo) => {
    if (!vhvNo) {
      showError("Please enter a VHV No to search");
      return;
    }

    try {
      showLoading();
      const data = await fetchHireVoucherByVhvNo(vhvNo);

      if (!data || !data.header) {
        showError("No Hire Voucher found for VHV No: " + vhvNo);
        return false;
      }

      const hdr = data.header;
      const dtls = data.details || [];

      setForm(mapHeaderToForm(hdr));
      setDetails(dtls.map(mapDetailToForm));

      // Populate manifest details from saved detail rows
      if (dtls.length > 0) {
        const uniqueManifests = [];
        const seen = new Set();
        dtls.forEach((dtl) => {
          const mnfNo = dtl.mnf_no || "";
          if (mnfNo && !seen.has(mnfNo)) {
            seen.add(mnfNo);
            uniqueManifests.push({
              manifest_no: mnfNo,
              manifest_date: dtl.mnf_date ? dtl.mnf_date.substring(0, 10) : "",
              from_loc: dtl.mnf_loc || "",
              to_loc: "",
              vehicle_no: "",
              driver_name: "",
            });
          }
        });
        setManifestDetails(uniqueManifests);
      }

      originalKey.current = {
        hv_loc: hdr.vha_loc || hdr.from_loc || "",
        hv_date: hdr.vha_date || hdr.hv_date || "",
      };

      setMode("edit");
      setSearchMode(false);
      showInfo("Hire Voucher loaded successfully for VHV No: " + vhvNo);
      return true;
    } catch (err) {
      if (err.response?.status === 404) {
        showError("No Hire Voucher found for VHV No: " + vhvNo);
      } else {
        showError(err.message || "Failed to fetch hire voucher by VHV No");
        console.error("Fetch by VHV No error:", err);
      }
      return false;
    } finally {
      hideLoading();
    }
  };

  // ------------------- BUTTON HANDLERS -------------------
  const handleCreateNew = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    setManifestDetails([]);
    setManifestCache({});
    originalKey.current = null;
    setMode("create");
    setSearchMode(false);
    showInfo("New hire voucher form ready");
  };

  const handleEditView = async () => {
    if (!searchMode) {
      setMode("view");
      setSearchMode(true);
      showInfo("Type the VHV No and press Enter or leave the field to search");
      return;
    }
  };

  const handleVhvNoSearch = async (vhvNo) => {
    const trimmed = (vhvNo || "").trim();

    if (!trimmed) {
      return;
    }

    if (!searchMode) {
      setSearchMode(true);
    }

    await fetchAndLoadByVhvNo(trimmed);
  };

  const handleVhvNoKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleVhvNoSearch(form.vhv_no);
    }
  };

  const handleVhvNoBlur = async () => {
    await handleVhvNoSearch(form.vhv_no);
  };

  const handleClear = () => {
    setForm({ ...emptyForm });
    setDetails([]);
    setManifestDetails([]);
    setManifestCache({});
    originalKey.current = null;
    setMode("create");
    setSearchMode(false);
    showInfo("Form cleared");
  };

  const handleSave = async () => {
    // Require at least one manifest detail row with a manifest number
    const hasManifest = manifestDetails.some((row) => row.manifest_no && row.manifest_no.trim() !== "");
    if (!hasManifest) {
      showError("Please add at least one Manifest before saving");
      return;
    }

    try {
      showLoading();

      const header = mapFormToHeader();
      const detailRows = mapDetailsToDb();

      if (mode === "create") {
        const response = await createHireVoucher(header, detailRows);
        if (response.success) {
          showSuccess("Hire Voucher saved successfully");

          originalKey.current = {
            hv_loc: header.from_loc,
            hv_date: header.hv_date,
          };
          setMode("edit");
        } else {
          showError(response.message || "Failed to save hire voucher");
        }
      } else if (mode === "edit") {
        if (!originalKey.current) {
          showError("No hire voucher key found for update");
          return;
        }
        const { hv_loc, hv_date } = originalKey.current;
        const response = await updateHireVoucher(
          "",
          hv_loc,
          hv_date,
          header,
          detailRows
        );
        if (response.success) {
          showSuccess("Hire Voucher updated successfully");
        } else {
          showError(response.message || "Failed to update hire voucher");
        }
      }
    } catch (err) {
      showError(err.message || "Failed to save hire voucher");
      console.error("Save hire voucher error:", err);
    } finally {
      hideLoading();
    }
  };

  // ------------------- RENDER SECTION CARD (matching Docket.jsx pattern) -------------------
  const fieldMap = {};
  headerFields.forEach((f) => {
    fieldMap[f.name] = f;
  });

  const renderFormSection = (section) => {
    const sectionFieldConfigs = section.fields
      .map((name) => fieldMap[name])
      .filter(Boolean);

    if (sectionFieldConfigs.length === 0) return null;

    // Horizontal layout: display fields in a row with wrapping
    const horizontalStyle = {
      padding: "14px 16px",
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "flex-start",
    };

    return (
      <div key={section.title} style={{ ...sectionCardStyles.sectionCard, gridColumn: section.half ? undefined : "1 / -1" }}>
        <div style={sectionCardStyles.sectionHeader}>
          <span style={sectionCardStyles.sectionIcon}>{section.icon}</span>
          <h4 style={sectionCardStyles.sectionTitle}>{section.title}</h4>
        </div>
        <div style={section.horizontal ? horizontalStyle : sectionCardStyles.sectionFields}>
          {sectionFieldConfigs.map((field) => {
            const isTextarea = field.type === "textarea";
            const fieldStyle = {
              minWidth: 130,
              flex: "0 1 auto",
              ...(isTextarea || field.fullWidth ? { flex: "1 1 100%" } : {}),
            };
            return (
              <div
                key={field.name}
                style={fieldStyle}
              >
                <FormField
                  {...field}
                  form={form}
                  setForm={setForm}
                  disabled={
                    (field.name === "vhv_no" && mode === "create" && !searchMode)
                  }
                  onKeyDown={field.name === "vhv_no" ? handleVhvNoKeyDown : undefined}
                  onBlur={field.name === "vhv_no" ? handleVhvNoBlur : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ------------------- RENDER -------------------
  return (
    <MainLayout>
      <PageBody title="Hire Voucher">
        {/* ✅ DESIGN HEADER WITH IMAGE */}
        <div style={headerDesignStyle.container}>
          <div style={headerDesignStyle.overlay} />
          <div style={headerDesignStyle.overlay2} />
          <div style={headerDesignStyle.textContainer}>
            <h1 style={headerDesignStyle.title}>Hire Voucher</h1>
            <p style={headerDesignStyle.subtitle}>
              Lorry hire transaction management
            </p>
          </div>
          <div style={headerDesignStyle.imageContainer}>
            <img
              src={voucherImage}
              alt="Hire Voucher"
              style={headerDesignStyle.image}
              onError={(e) => {
                e.target.src = bgPlaceholder;
              }}
            />
          </div>
        </div>

        {/* ✅ TOOLBAR */}
        <div className="pageToolbar" style={{ alignItems: "center" }}>
          <Tooltip title="Create New"><IconButton onClick={handleCreateNew} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}><NoteAddIcon /></IconButton></Tooltip>
          <Tooltip title="Edit / View"><IconButton onClick={handleEditView} size="small" sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}><ViewIcon /></IconButton></Tooltip>
          <Tooltip title="Clear"><IconButton onClick={handleClear} size="small" sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}><ResetIcon /></IconButton></Tooltip>
          <Tooltip title="Save"><IconButton onClick={handleSave} size="small" sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}><SaveIcon /></IconButton></Tooltip>

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
            {mode === "create" ? "CREATE" : searchMode ? "VIEW" : "EDIT"}
          </span>
        </div>

        {/* ✅ HEADER FORM (Card Layout) */}
        <div
          style={{
            background: "#f8f6ff",
            borderRadius: 14,
            border: "1px solid #e9e5f0",
            padding: "1px",
            boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
          }}
        >
          {formSections.map((section) => renderFormSection(section))}
        </div>

        {/* ✅ MANIFEST DETAILS TABLE */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "#4a3466" }}>Manifest Details</h3>
          <PageToolbar
            actions={[
              { label: "Add Row", icon: <AddRowIcon />, onClick: addManifestRow },
            ]}
          />
        </div>

        <DataTable
          columns={manifestColumns}
          rows={manifestDetails}
          getKey={(row, index) => index}
          actions={[
            {
              label: "Delete",
              icon: <DeleteIcon />,
              onClick: deleteManifestRow,
            },
          ]}
          editable
          onCellChange={handleManifestCellChange}
        />

        {/* ✅ DETAIL TABLE (Existing Vouchers) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "#4a3466" }}>Existing Vouchers</h3>
          <PageToolbar
            actions={[
              { label: "Add Row", icon: <AddRowIcon />, onClick: addRow },
            ]}
          />
        </div>

        <DataTable
          columns={detailColumns}
          rows={details}
          getKey={(row, index) => index}
          actions={[
            {
              label: "Delete",
              icon: <DeleteIcon />,
              onClick: deleteRow,
            },
          ]}
          editable
          onCellChange={handleCellChange}
        />

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Please wait..." />
      </PageBody>
    </MainLayout>
  );
}