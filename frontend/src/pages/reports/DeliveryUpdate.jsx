import { useState, useRef } from "react";
import moment from "moment";
import MainLayout from "../../layouts/MainLayout";
import {
  MuiField,
  FormField,
  FormPanel,
  PageBody,
} from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SearchIcon, SaveIcon, ResetIcon, DeleteIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Button, Chip, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import { fetchDocketByDocketNo } from "../../utils/docket";
import { saveDeliveryNote, updateDeliveryNote, fetchDeliveryNoteByDocketNo, uploadPodFile } from "../../utils/deliveryNote";

const emptyForm = {
  docket_no: "",
  docket_date: "",
  from_loc: "",
  from_town: "",
  to_loc: "",
  to_town: "",
  consignor: "",
  consignee: "",
  total_pkgs: "",
  actual_wt: "",
  charged_wt: "",
  delivery_status: "",
  delivery_date: "",
  delivery_remarks: "",
  received_by: "",
};

const formFields = [
  { label: "Docket Date", name: "docket_date", type: "date" },
  { label: "From Location", name: "from_loc" },
  { label: "From Town", name: "from_town" },
  { label: "To Location", name: "to_loc" },
  { label: "To Town", name: "to_town" },
  { label: "Consignor", name: "consignor" },
  { label: "Consignee", name: "consignee" },
  { label: "Total Packages", name: "total_pkgs", type: "number" },
  { label: "Actual Weight", name: "actual_wt", type: "number" },
  { label: "Charged Weight", name: "charged_wt", type: "number" },
  { label: "Delivery Status", name: "delivery_status", type: "select", options: ["Pending", "In Transit", "Delivered", "Partially Delivered", "Returned", "Cancelled"] },
  { label: "Delivery Date", name: "delivery_date", type: "date" },
  { label: "Received By", name: "received_by" },
  { label: "Delivery Remarks", name: "delivery_remarks" },
];

export default function DeliveryUpdate() {
  const { dialog, closeAlert, showError, showSuccess, showInfo } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [docketNumberInput, setDocketNumberInput] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [dlyNoteNo, setDlyNoteNo] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // ── POD Upload State ──
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedPods, setUploadedPods] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const allowedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "application/pdf",
  ];

  const toDate = (val) => {
    if (!val) return "";
    const m = moment(val);
    return m.isValid() ? m.format("YYYY-MM-DD") : "";
  };

  const handleSetForm = (updatedForm) => {
    setForm(updatedForm);
    setIsDirty(true);
  };

  const handleSearch = async () => {
    const docketNo = docketNumberInput.trim();
    if (!docketNo) {
      showError("Please enter a Docket Number");
      return;
    }

    try {
      showLoading();
      const docketData = await fetchDocketByDocketNo(docketNo);

      if (docketData && docketData.docket_no) {
        const savedNote = await fetchDeliveryNoteByDocketNo(docketNo).catch(() => null);
        setDlyNoteNo(savedNote?.dly_note_no || "");

        setForm({
          docket_no:           docketData.docket_no               || "",
          docket_date:         toDate(docketData.docket_date),
          from_loc:            docketData.docket_loc              || "",
          from_town:           docketData.docket_pickup_town      || "",
          to_loc:              docketData.docket_to_loc           || "",
          to_town:             docketData.docket_dly_town         || "",
          consignor:           docketData.cnor_name               || "",
          consignee:           docketData.cnee_name               || "",
          total_pkgs:          docketData.docket_tot_pkgs         ?? docketData.total_pkgs ?? "",
          actual_wt:           docketData.docket_act_wt           ?? docketData.actual_wt ?? "",
          charged_wt:          docketData.docket_chrg_wt          ?? "",
          delivery_status:     savedNote?.delivery_status || docketData.delivery_status || "",
          delivery_date:       toDate(savedNote?.dly_date || docketData.delivery_date),
          delivery_remarks:    savedNote?.delivery_remarks || docketData.docket_remark || docketData.delivery_remarks || "",
          received_by:         savedNote?.received_by || docketData.received_by || "",
        });
        setIsDirty(false);
        showSuccess(`Docket #${docketNo} loaded successfully`);
      } else {
        showError(`Docket #${docketNo} not found`);
      }
    } catch (err) {
      showError(err.message || "Failed to fetch docket details");
      console.error("Fetch docket error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleSave = async (podsOverride) => {
    if (!docketNumberInput.trim()) {
      showError("Please enter a Docket Number");
      return;
    }

    const podsList = Array.isArray(podsOverride) ? podsOverride : uploadedPods;
    if (selectedFiles.length === 0 && podsList.length === 0) {
      showError("Please upload one POD file before saving the delivery update");
      return;
    }

    const requiredFields = ["delivery_status", "delivery_date"];
    const missing = requiredFields.filter((f) => !form[f]);
    if (missing.length > 0) {
      showError("Please fill in all required fields: " + missing.join(", "));
      return;
    }

    try {
      showLoading();
      // Resolve POD as a server URL:
      //  - prefer an already-uploaded POD (server URL)
      //  - else upload the selected file to the backend now
      let podUrl = podsList.find((p) => p.url && !p.url.startsWith("blob:"))?.url || null;
      if (!podUrl && selectedFiles.length > 0) {
        podUrl = await uploadPodFile(selectedFiles[0]);
        if (!podUrl) throw new Error(`Failed to upload POD file: ${selectedFiles[0].name}`);
      }
      const payload = {
        company_code: localStorage.getItem("current_user") ? JSON.parse(localStorage.getItem("current_user")).company_code : null,
        division_code: localStorage.getItem("current_user") ? JSON.parse(localStorage.getItem("current_user")).division_code : null,
        dly_note_no: dlyNoteNo || `${docketNumberInput}`,
        dly_date: form.delivery_date,
        docket_no: docketNumberInput.trim(),
        docket_date: form.docket_date || null,
        docket_from_loc: form.from_loc || null,
        docket_from_town: form.from_town || null,
        docket_to_loc: form.to_loc || null,
        docket_to_town: form.to_town || null,
        delivery_status: form.delivery_status,
        delivery_remarks: form.delivery_remarks || "",
        received_by: form.received_by || "",
        pod_url: podUrl,
        record_updated_by: localStorage.getItem("current_user") ? JSON.parse(localStorage.getItem("current_user")).user_id : null,
      };

      if (dlyNoteNo) {
        await updateDeliveryNote(dlyNoteNo, payload);
      } else {
        const saved = await saveDeliveryNote(payload);
        setDlyNoteNo(saved?.dly_note_no || payload.dly_note_no);
      }

      setIsDirty(false);
      showSuccess("Delivery note saved successfully");
    } catch (err) {
      showError(err.message || "Failed to save delivery update");
      console.error("Save delivery error:", err);
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    setDocketNumberInput("");
    setDlyNoteNo("");
    setForm({ ...emptyForm });
    setIsDirty(false);
    showInfo("Form cleared");
  };

  // ── POD Handlers ──
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (!allowedFileTypes.includes(file.type)) {
        showError(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        showError(`File too large (max 5MB): ${file.name}`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadPods = async () => {
    if (selectedFiles.length === 0) {
      showError("Please select at least one file to upload");
      return;
    }

    try {
      setIsUploading(true);
      // Actually upload each file to the backend server (multer → backend/uploads/pod)
      const newPods = await Promise.all(
        selectedFiles.map(async (file, idx) => {
          const serverUrl = await uploadPodFile(file);
          if (!serverUrl) throw new Error(`Server did not return a URL for: ${file.name}`);
          return {
            id: Date.now() + idx,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            url: serverUrl,
            docket_no: docketNumberInput || form.docket_no || "N/A",
          };
        })
      );

      const allPods = [...uploadedPods, ...newPods];
      setUploadedPods(allPods);
      setSelectedFiles([]);
      showSuccess(`${newPods.length} POD file(s) uploaded successfully`);

      // Auto-save the delivery note so the new POD URL is persisted immediately.
      // (Without this, the note keeps the old/dead pod_url until "Save" is clicked.)
      if (docketNumberInput.trim()) {
        await handleSave(allPods);
      }
    } catch (err) {
      showError(err.message || "Failed to upload POD files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePod = async (podId) => {
    try {
      setUploadedPods((prev) => prev.filter((pod) => pod.id !== podId));
      showInfo("POD file removed");
    } catch (err) {
      showError(err.message || "Failed to delete POD file");
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType === "application/pdf") return <PictureAsPdfIcon sx={{ fontSize: 40, color: "#dc2626" }} />;
    if (fileType?.startsWith("image/")) return <ImageIcon sx={{ fontSize: 40, color: "#7e22ce" }} />;
    return <InsertDriveFileIcon sx={{ fontSize: 40, color: "#64748b" }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <MainLayout>
      <PageBody title="Delivery Update">
        {/* Top Toolbar with Docket No, Search, Save, Clear */}
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MuiField
              label="Docket No"
              name="docket_no"
              value={docketNumberInput}
              onChange={(_, val) => setDocketNumberInput(val)}
              sx={{ width: 180 }}
            />
            <Tooltip title="Search Docket">
              <IconButton
                onClick={handleSearch}
                size="small"
                sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save">
              <IconButton
                onClick={handleSave}
                size="small"
                sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear">
              <IconButton
                onClick={handleClear}
                size="small"
                sx={{ color: "#b45309", "&:hover": { background: "#fef3c7" } }}
              >
                <ResetIcon />
              </IconButton>
            </Tooltip>
          </div>
          {isDirty && (
            <span style={{ fontSize: 12, color: "#ca8a04", background: "#fef9c3", padding: "2px 10px", borderRadius: 10 }}>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Delivery Update Form */}
        <FormPanel>
          {formFields.map((field) => {
            if (field.name === "delivery_remarks") {
              return (
                <div key={field.name} style={{ gridColumn: "1 / -1" }}>
                  <FormField
                    {...field}
                    form={form}
                    setForm={handleSetForm}
                  />
                </div>
              );
            }
            return (
              <FormField
                key={field.name}
                {...field}
                form={form}
                setForm={handleSetForm}
              />
            );
          })}
        </FormPanel>

        {/* ── Upload POD Section ── */}
        <div style={{ marginTop: 24, borderTop: "2px solid #e2e8f0", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <CloudUploadIcon sx={{ color: "#7e22ce" }} />
              Upload POD (Proof of Delivery)
            </h3>
            {uploadedPods.length > 0 && (
              <Chip
                label={`${uploadedPods.length} POD(s) uploaded`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
          </div>

          {/* File Selection Area */}
          <Box
            sx={{
              border: "2px dashed #cbd5e1",
              borderRadius: 2,
              padding: 3,
              textAlign: "center",
              background: "#f8fafc",
              cursor: "pointer",
              "&:hover": { borderColor: "#7e22ce", background: "#faf5ff" },
              transition: "all 0.2s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: "#7e22ce", mb: 1 }} />
            <p style={{ margin: "4px 0", fontWeight: 600, color: "#334155" }}>
              Click to select POD files
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
              Supports: JPG, PNG, GIF, PDF (Max 5MB each)
            </p>
          </Box>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Selected Files ({selectedFiles.length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedFiles.map((file, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      padding: "6px 10px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 1.5,
                      background: "#fff",
                    }}
                  >
                    {getFileIcon(file.type)}
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#334155" }}>
                        {file.name.length > 25 ? file.name.substring(0, 22) + "..." : file.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }}
                      sx={{ color: "#dc2626", padding: "2px" }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleUploadPods}
                  disabled={isUploading}
                  sx={{
                    background: "linear-gradient(135deg, #7e22ce, #a855f7)",
                    "&:hover": { background: "linear-gradient(135deg, #6b21a8, #9333ea)" },
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setSelectedFiles([])}
                  disabled={isUploading}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Uploaded PODs List */}
          {uploadedPods.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Uploaded PODs
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {uploadedPods.map((pod) => (
                  <Box
                    key={pod.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 1.5,
                      background: "#fff",
                      "&:hover": { borderColor: "#cbd5e1", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
                      transition: "all 0.15s ease",
                    }}
                  >
                    {getFileIcon(pod.type)}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#334155" }}>
                        {pod.name}
                      </p>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        <span>{formatFileSize(pod.size)}</span>
                        <span>•</span>
                        <span>Docket: {pod.docket_no}</span>
                        <span>•</span>
                        <span>{new Date(pod.uploadedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <Tooltip title="Delete POD">
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePod(pod.id)}
                        sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626", background: "#fee2e2" } }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </div>
            </div>
          )}
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Processing..." />
      </PageBody>
    </MainLayout>
  );
}