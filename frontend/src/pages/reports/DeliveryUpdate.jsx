import { useRef, useState } from "react";
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
import { SearchIcon, SaveIcon, ResetIcon } from "../../components/common/icons";
import { IconButton, Tooltip, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import { fetchDocketByDocketNo } from "../../utils/docket";
import { checkDocketUnloaded } from "../../utils/manifest";
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

const allowedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const emptyPodSlot = () => ({ file: null, url: "", name: "", preview: "" });

const slotFromSaved = (url) => ({
  file: null,
  url: url || "",
  name: url ? String(url).split("/").pop() : "",
  preview: "",
});

const releaseSlot = (slot) => {
  if (slot?.preview?.startsWith("blob:")) URL.revokeObjectURL(slot.preview);
};

// Mobile browsers (especially Android Chrome camera capture) often return
// an empty file.type. Infer it from the file extension so camera shots
// are not wrongly rejected.
const resolveFileType = (file) => {
  if (!file) return "";
  if (file.type) return file.type;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const extTypeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
  };
  return extTypeMap[ext] || "";
};

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/app\/?$/, "");

const displaySrc = (slot) => {
  if (slot?.preview) return slot.preview;
  const url = slot?.url;
  if (!url) return "";
  if (/^blob:|^data:|^https?:/i.test(url)) return url;
  const file = String(url).split("/").pop();
  if (/uploads\/pod\//i.test(url) || /^pod_/i.test(file || "")) {
    return `${API_BASE}/app/public/pod-file/${file}`;
  }
  return url;
};

const isImageSrc = (url) =>
  /^blob:/i.test(url) || /^data:image\//i.test(url) || /\.(jpe?g|png|gif|webp|bmp)(\?.*)?$/i.test(url || "");

const podActionStyle = (kind) => ({
  appearance: "none",
  border: kind === "remove" ? "1px solid #dc2626" : "1px solid #7e22ce",
  background: kind === "remove" ? "#dc2626" : "#ffffff",
  color: kind === "remove" ? "#ffffff" : "#6b21a8",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  lineHeight: 1.2,
});

function PodSlot({ title, slot, inputRef, onPick, onRemove }) {
  const src = displaySrc(slot);
  const type = slot.file ? resolveFileType(slot.file) : "";
  const image = type ? type.startsWith("image/") : isImageSrc(src);
  const pdf = type ? type === "application/pdf" : /\.pdf(\?.*)?$/i.test(slot.url || slot.name || "");
  const attached = !!(slot.file || slot.url);

  return (
    <div style={{ flex: "1 1 280px", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: "#334155" }}>{title}</div>
        {attached && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button type="button" style={podActionStyle("upload")} onClick={() => inputRef.current?.click()}>
              Upload new
            </button>
            <button type="button" style={podActionStyle("remove")} onClick={onRemove}>
              Remove
            </button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.heic,.heif"
        onChange={onPick}
        style={{ display: "none" }}
      />
      {attached ? (
        <div>
          <div style={{ position: "relative" }}>
            {image && src ? (
              <img
                src={src}
                alt={title}
                style={{ width: "100%", height: 180, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "block" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {pdf
                  ? <PictureAsPdfIcon sx={{ fontSize: 36, color: "#dc2626" }} />
                  : <InsertDriveFileIcon sx={{ fontSize: 36, color: "#64748b" }} />}
                <span style={{ fontSize: 13, color: "#334155", wordBreak: "break-all" }}>{slot.name || "Attached file"}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onRemove}
              title={`Remove ${title}`}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "#dc2626",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            >
              <CloseIcon sx={{ fontSize: 18, color: "#ffffff" }} />
            </button>
          </div>
          {slot.name && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", wordBreak: "break-all" }}>{slot.name}</p>
          )}
          {slot.file && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309" }}>
              New file selected. Click Save to store it.
            </p>
          )}
        </div>
      ) : (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: "2px dashed #cbd5e1",
            borderRadius: 2,
            padding: 3,
            textAlign: "center",
            background: "#f8fafc",
            cursor: "pointer",
            "&:hover": { borderColor: "#7e22ce", background: "#faf5ff" },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 40, color: "#7e22ce" }} />
          <p style={{ margin: "6px 0 0", fontWeight: 600, color: "#334155" }}>Choose {title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
            JPG, PNG, GIF, or PDF. Camera photos are compressed on upload.
          </p>
        </Box>
      )}
    </div>
  );
}

export default function DeliveryUpdate() {
  const { dialog, closeAlert, showError, showSuccess, showInfo } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();

  const [docketNumberInput, setDocketNumberInput] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [dlyNoteNo, setDlyNoteNo] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [podFront, setPodFront] = useState(emptyPodSlot);
  const [podBack, setPodBack] = useState(emptyPodSlot);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const toDate = (val) => {
    if (!val) return "";
    const m = moment(val);
    return m.isValid() ? m.format("YYYY-MM-DD") : "";
  };

  const resetPods = () => {
    releaseSlot(podFront);
    releaseSlot(podBack);
    setPodFront(emptyPodSlot());
    setPodBack(emptyPodSlot());
    if (frontInputRef.current) frontInputRef.current.value = "";
    if (backInputRef.current) backInputRef.current.value = "";
  };

  const loadPods = (note) => {
    releaseSlot(podFront);
    releaseSlot(podBack);
    setPodFront(slotFromSaved(note?.pod_url));
    setPodBack(slotFromSaved(note?.pod_back_url));
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
        const alreadyUnloaded = await checkDocketUnloaded(docketNo);
        if (!alreadyUnloaded) {
          setForm({ ...emptyForm });
          setDlyNoteNo("");
          setDocketNumberInput("");
          setIsDirty(false);
          resetPods();
          showError(`Docket #${docketNo} is not unloaded (not present in Manifest Unloading). Data cannot be loaded.`);
          return;
        }

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
        loadPods(savedNote);
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

  const acceptFile = (file) => {
    const fileType = resolveFileType(file);
    if (!allowedFileTypes.includes(fileType)) {
      showError(`File type not supported: ${file.name} (${fileType || "unknown type"})`);
      return false;
    }
    if (fileType === "application/pdf" && file.size > 5 * 1024 * 1024) {
      showError(`PDF too large (max 5MB): ${file.name}`);
      return false;
    }
    return true;
  };

  const pickPod = (side) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !acceptFile(file)) return;
    const fileType = resolveFileType(file);
    const preview = fileType.startsWith("image/") ? URL.createObjectURL(file) : "";
    const setter = side === "back" ? setPodBack : setPodFront;
    setter((prev) => {
      releaseSlot(prev);
      return { file, url: "", name: file.name, preview };
    });
    setIsDirty(true);
  };

  const removePod = (side) => {
    const setter = side === "back" ? setPodBack : setPodFront;
    setter((prev) => {
      releaseSlot(prev);
      return emptyPodSlot();
    });
    setIsDirty(true);
  };

  const resolveSlot = async (slot, label) => {
    if (slot.file) {
      const url = await uploadPodFile(slot.file);
      if (!url) throw new Error(`Failed to upload ${label}`);
      return url;
    }
    return slot.url || null;
  };

  const handleSave = async () => {
    if (!docketNumberInput.trim()) {
      showError("Please enter a Docket Number");
      return;
    }

    if (!podFront.file && !podFront.url && !podBack.file && !podBack.url) {
      showError("Attach POD Front or POD Back before saving");
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
      const podUrl = await resolveSlot(podFront, "POD Front");
      const podBackUrl = await resolveSlot(podBack, "POD Back");
      const currentUser = localStorage.getItem("current_user")
        ? JSON.parse(localStorage.getItem("current_user"))
        : null;
      const payload = {
        company_code: currentUser?.company_code ?? null,
        division_code: currentUser?.division_code ?? null,
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
        pod_back_url: podBackUrl,
        record_updated_by: currentUser?.user_id ?? null,
      };

      if (dlyNoteNo) {
        await updateDeliveryNote(dlyNoteNo, payload);
      } else {
        const saved = await saveDeliveryNote(payload);
        setDlyNoteNo(saved?.dly_note_no || payload.dly_note_no);
      }

      setIsDirty(false);
      showSuccess("Delivery note saved successfully");
      setDocketNumberInput("");
      setDlyNoteNo("");
      setForm({ ...emptyForm });
      resetPods();
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
    resetPods();
    showInfo("Form cleared");
  };

  return (
    <MainLayout>
      <PageBody title="Delivery Update">
        <div className="pageToolbar" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MuiField
              label="Docket No"
              name="docket_no"
              value={docketNumberInput}
              onChange={(_, val) => setDocketNumberInput(val)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              sx={{ width: 180 }}
            />
            <Tooltip title="Search">
              <IconButton
                onClick={handleSearch}
                size="small"
                sx={{ color: "#1d4ed8", "&:hover": { background: "#dbeafe" } }}
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

        <div style={{ marginTop: 24, borderTop: "2px solid #e2e8f0", paddingTop: 16 }}>
          <h3 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <CloudUploadIcon sx={{ color: "#7e22ce" }} />
            POD (Proof of Delivery)
          </h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <PodSlot
              title="POD Front"
              slot={podFront}
              inputRef={frontInputRef}
              onPick={pickPod("front")}
              onRemove={() => removePod("front")}
            />
            <PodSlot
              title="POD Back"
              slot={podBack}
              inputRef={backInputRef}
              onPick={pickPod("back")}
              onRemove={() => removePod("back")}
            />
          </div>
        </div>

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Processing..." />
      </PageBody>
    </MainLayout>
  );
}
