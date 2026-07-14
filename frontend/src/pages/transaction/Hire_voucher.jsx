import { useState, useEffect, useRef } from "react";
import MainLayout from "../../layouts/MainLayout";
import moment from "moment";
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
  fetchHireVoucherByNo,
  fetchHireVoucherByVhvNo,
  updateHireVoucher,
  fetchNextHireVoucherNo,
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
  { label: "HV No", name: "hv_no" },
  { label: "HV Date", name: "hv_date", type: "date" },

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

// ------------------- DETAIL TABLE COLUMNS (Existing Vouchers) -------------------
const detailColumns = [
  { key: "vhv_no", label: "VHV No" },
  { key: "date", label: "Date", type: "date" },
  { key: "loc", label: "Loc" },
  { key: "to", label: "To" },
  { key: "city", label: "City" },
  { key: "veh", label: "Veh" },
  { key: "order", label: "Order" },
  { key: "pickup", label: "Pickup" },
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
  hv_no: "",
  hv_date: "",
  from_loc: "",
  to_loc: "",
  lorry_hire_rate: "",
  total_km: "",
  total_amt: "",
  remarks: "",
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
  const hasFetchedNextNo = useRef(false);


  // ------------------- AUTO-FETCH NEXT HV NO ON CREATE -------------------
  useEffect(() => {
    if (mode === "create" && !hasFetchedNextNo.current) {
      hasFetchedNextNo.current = true;
      (async () => {
        try {
          const result = await fetchNextHireVoucherNo();
          const nextNo = result?.next_no || result?.hv_no || "";
          if (nextNo) {
            setForm((prev) => ({ ...prev, hv_no: String(nextNo) }));
          }
        } catch (err) {
          console.warn("Failed to fetch next HV no:", err);
        }
      })();
    }
  }, [mode]);

  // ------------------- DETAIL ROW HANDLERS (Existing Vouchers) -------------------
  const addRow = () => {
    setDetails([
      ...details,
      {
        vhv_no: "",
        date: moment().format("YYYY-MM-DD"),
        loc: "",
        to: "",
        city: "",
        veh: "",
        order: "",
        pickup: "",
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
      if (manifestData && manifestData.header) {
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
    hv_no: form.hv_no,
    hv_date: form.hv_date || null,
    from_loc: form.from_loc,
    to_loc: form.to_loc,
    lorry_hire_rate: parseFloat(form.lorry_hire_rate) || 0,
    total_km: parseFloat(form.total_km) || 0,
    total_amt: parseFloat(form.total_amt) || 0,
    remarks: form.remarks || "",
    vhv_no: form.vhv_no,
    vhv_date: form.vhv_date || null,
    vhv_loc: form.vhv_loc,
    vhv_to_loc: form.vhv_to_loc,
    vhv_state: form.vhv_state,
    vhv_city: form.vhv_city,
    vhv_town: form.vhv_town,
    vhv_pin: form.vhv_pin,
    via1: form.via1,
    via2: form.via2,
    via3: form.via3,
    via4: form.via4,
    via5: form.via5,
    via6: form.via6,
  });

  const mapDetailsToDb = () =>
    details
      .filter((row) => row.vhv_no)
      .map((row) => ({
        vhv_no: row.vhv_no,
        date: row.date || null,
        loc: row.loc,
        to: row.to,
        city: row.city,
        veh: row.veh,
        order: row.order,
        pickup: row.pickup,
      }));

  const mapHeaderToForm = (hdr) => ({
    hv_no: hdr.hv_no || "",
    hv_date: hdr.hv_date ? hdr.hv_date.substring(0, 10) : "",
    from_loc: hdr.from_loc || "",
    to_loc: hdr.to_loc || "",
    lorry_hire_rate: hdr.lorry_hire_rate ?? "",
    total_km: hdr.total_km ?? "",
    total_amt: hdr.total_amt ?? "",
    remarks: hdr.remarks || "",
    vhv_no: hdr.vhv_no || "",
    vhv_date: hdr.vhv_date ? hdr.vhv_date.substring(0, 10) : "",
    vhv_loc: hdr.vhv_loc || "",
    vhv_to_loc: hdr.vhv_to_loc || "",
    vhv_state: hdr.vhv_state || "",
    vhv_city: hdr.vhv_city || "",
    vhv_town: hdr.vhv_town || "",
    vhv_pin: hdr.vhv_pin || "",
    via1: hdr.via1 || "",
    via2: hdr.via2 || "",
    via3: hdr.via3 || "",
    via4: hdr.via4 || "",
    via5: hdr.via5 || "",
    via6: hdr.via6 || "",
  });

  const mapDetailToForm = (dtl) => ({
    vhv_no: dtl.vhv_no || "",
    date: dtl.date ? dtl.date.substring(0, 10) : "",
    loc: dtl.loc || "",
    to: dtl.to || "",
    city: dtl.city || "",
    veh: dtl.veh || "",
    order: dtl.order || "",
    pickup: dtl.pickup || "",
  });

  // ------------------- FETCH & LOAD BY HV NO -------------------
  const fetchAndLoadHireVoucher = async (hvNo) => {
    try {
      showLoading();
      const data = await fetchHireVoucherByNo(hvNo);

      if (!data || !data.header) {
        showError("Hire Voucher not found");
        return false;
      }

      const hdr = data.header;
      const dtls = data.details || [];

      setForm(mapHeaderToForm(hdr));
      setDetails(dtls.map(mapDetailToForm));

      originalKey.current = {
        hv_no: hdr.hv_no,
        hv_loc: hdr.from_loc,
        hv_date: hdr.hv_date,
      };

      setMode("edit");
      setSearchMode(false);
      showInfo("Hire Voucher loaded successfully");
      return true;
    } catch (err) {
      handleClear();
      showError(err.message || "Failed to fetch hire voucher");
      console.error("Fetch hire voucher error:", err);
      return false;
    } finally {
      hideLoading();
    }
  };

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

      originalKey.current = {
        hv_no: hdr.hv_no,
        hv_loc: hdr.from_loc,
        hv_date: hdr.hv_date,
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
    hasFetchedNextNo.current = false;
    showInfo("New hire voucher form ready");
  };

  const handleEditView = async () => {
    if (!searchMode) {
      setMode("view");
      setSearchMode(true);
      showInfo("Type the VHV No and press Enter or leave the field to search");
      return;
    }

    // const vhvNo = (form.vhv_no || "").trim();

    // if (!vhvNo) {
    //   showError("Please enter a VHV No to search");
    //   return;
    // }

    // await fetchAndLoadByVhvNo(vhvNo);
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
    hasFetchedNextNo.current = false;
    showInfo("Form cleared");
  };

  const handleSave = async () => {
    if (!form.hv_date) {
      showError("HV Date is required");
      return;
    }

    try {
      showLoading();

      const header = mapFormToHeader();
      const detailRows = mapDetailsToDb();

      if (mode === "create") {
        const response = await createHireVoucher(header, detailRows);
        if (response.success) {
          const newHvNo = response.data?.hv_no;
          showSuccess(`Hire Voucher #${form.hv_no} saved successfully`);

          setForm((prev) => ({ ...prev, hv_no: newHvNo }));
          originalKey.current = {
            hv_no: newHvNo || form.hv_no,
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
        const { hv_no, hv_loc, hv_date } = originalKey.current;
        const response = await updateHireVoucher(
          hv_no,
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
                    (field.name === "hv_no" && mode === "create") ||
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