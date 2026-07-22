import { useEffect, useRef, useState } from "react";
import moment from "moment";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import jsqrLib from "jsqr";
const jsQR = jsqrLib.jsQR || jsqrLib.default || jsqrLib;
import { AddIcon, DeleteIcon, SaveIcon } from "../../../components/common/icons";
import { DataTable } from "../../../components/common/MasterPage";
import { fetchEwayBillFromDB, saveEwayBillToDB, updateEwayBillByRecId } from "../../../utils/docket";
import { getDateFormat } from "../../../utils/tenantService";

export default function EwayBillSection({
  ewbList,
  onAdd,
  onDelete,
  onCellChange,
  onEwbListUpdate,
  onSave,
  sectionHeaderStyle,
  showError,
  showWarning,
  showSuccess,
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dateFormat = getDateFormat();
  const fmtDate = (val) => {
    if (!val) return "";
    const m = moment(val, ["YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"], true);
    return m.isValid() ? m.format(dateFormat) : val;
  };

  const ewbColumns = [
    { key: "ewb_no", label: "EWB No", editable: true },
    { key: "ewb_date", label: "EWB Date", editable: true, isDate: true, render: (row) => fmtDate(row.ewb_date) },
    { key: "ewb_valid", label: "Valid Upto", editable: true, isDate: true, render: (row) => fmtDate(row.ewb_valid) },
    { key: "inv_no", label: "Invoice No" },
    { key: "inv_date", label: "Invoice Date", editable: true, isDate: true, render: (row) => fmtDate(row.inv_date) },
  ];

  const handleOpenUpload = () => {
    setUploadError("");
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setUploadError("");
  };

  const decodeImageFile = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Please select a valid image file (PNG, JPEG, etc.)"));
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const maxDim = 1920;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > maxDim || h > maxDim) {
            const scale = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not read image"));
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            resolve(String(code.data || "").trim());
          } else {
            reject(new Error("No QR code found in the image. Please try a clearer image."));
          }
        };

        img.onerror = () => reject(new Error("Failed to load the image"));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error("Failed to read the file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecoding(true);
    setUploadError("");

    try {
      const qrData = await decodeImageFile(file);
      const match = qrData.match(/\d+/);
      const ewbNo = match ? match[0] : qrData;

      if (ewbNo) {
        setIsUploadOpen(false);
        await applyScannedEwb(ewbNo);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsDecoding(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const applyScannedEwb = async (ewbNo) => {
    const targetIndex = ewbList.findIndex((row) => !String(row?.ewb_no || "").trim());
    const fallbackIndex = targetIndex >= 0 ? targetIndex : ewbList.length;
    const baseRow = ewbList[fallbackIndex] || {
      ewb_no: "",
      ewb_date: "",
      ewb_valid: "",
      inv_no: "",
      inv_date: "",
    };

    if (targetIndex < 0) {
      onAdd?.();
    }

    const newRow = { ...baseRow, id: fallbackIndex, ewb_no: ewbNo };
    const updatedRow = await handleRowUpdate(newRow, baseRow);

    if (updatedRow && onEwbListUpdate) {
      onEwbListUpdate(fallbackIndex, updatedRow);
    }
  };

  const handleRowUpdate = async (newRow, oldRow) => {
    if (newRow.ewb_no === oldRow.ewb_no) {
      Object.keys(newRow).forEach((key) => {
        if (key !== "id" && newRow[key] !== oldRow[key]) {
          handleCellChange(newRow.id, key, newRow[key]);
        }
      });
      return newRow;
    }

    const ewbNo = String(newRow.ewb_no).trim();
    if (!ewbNo) return newRow;

    const isDuplicate = ewbList.some(
      (row, idx) => idx !== newRow.id && String(row.ewb_no).trim() === ewbNo
    );
    if (isDuplicate) {
      showError(`EWB number ${ewbNo} is already added`);
      return oldRow;
    }

    try {
      let ewbApi = (await fetchEwayBillFromDB([Number(ewbNo)]))?.data;
      const { apiCalls } = ewbApi || false;
      let records = ewbApi?.data || ewbApi || [];
      if (!records || records.length === 0) {
        showError(`EWB number ${ewbNo} does not exist`);
        return oldRow;
      }

      if (records.length && !apiCalls) {
        let docketCount = records.filter((r) => r.docket_no).length;
        if (docketCount === records.length) {
          showError(`EWB number ${ewbNo} is already attached to docket ${records[0].docket_no}`);
          return oldRow;
        };
      }
      let r = records[0];
      if (!apiCalls) {
        r = records.find((r) => !r.docket_no);
      }
      const toDate = (val) =>
        val ? moment(val, ["DD/MM/YYYY HH:mm:ss A", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD"]).format("MM/DD/YYYY") : "";

      const populated = {
        ...newRow,
        rec_id: r.rec_id ?? null,
        ewb_no: r.EWB_NO || r.ewb_no || ewbNo,
        ewb_date: toDate(r.EWB_DATE || r.ewb_date),
        ewb_valid: toDate(r.EWB_VALID_UPTO || r.ewb_valid_upto),
        inv_no: r.INV_NO || r.invoice_no || "",
        inv_date: toDate(r.INV_DATE || r.invoice_date),
      };

      if (onEwbListUpdate) onEwbListUpdate(newRow.id, populated);
      return populated;
    } catch (err) {
      showError(err.message || `Failed to fetch EWB ${ewbNo}`);
      return oldRow;
    }
  };

  const handleCellChange = (rowIndex, key, value) => {
    if (key === "docket_no" && value) {
      const conflict = ewbList.find(
        (row, idx) => idx !== rowIndex && String(row.docket_no).trim() === String(value).trim()
      );
      if (conflict) {
        showError(`EWB No ${conflict.ewb_no || ""} is already attached to docket ${value}`);
        return;
      }
    }
    onCellChange(rowIndex, key, value);
  };

  const toDbDate = (val) => {
    if (!val) return null;
    const m = moment(val, ["YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"], true);
    return m.isValid() ? m.format("YYYY-MM-DD") : null;
  };

  const handleSave = async () => {
    const normalized = ewbList.map((row) => ({
      ...row,
      ewb_date: toDbDate(row.ewb_date),
      ewb_valid: toDbDate(row.ewb_valid),
      inv_date: toDbDate(row.inv_date),
    }));
    if (onSave) {
      onSave(normalized);
      return;
    }
    try {
      const existing = normalized.filter((r) => r.rec_id);
      const newRows  = normalized.filter((r) => !r.rec_id);

      await Promise.all([
        ...existing.map((r) => updateEwayBillByRecId(r.rec_id, r)),
        ...(newRows.length ? [saveEwayBillToDB(newRows)] : []),
      ]);
      showSuccess("EWB list saved successfully");
    } catch (err) {
      showError(err.message || "Failed to save EWB list");
    }
  };

  const handleDelete = () => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length === 0) {
      showError("Please select at least one row to delete");
      return;
    }
    const ewbNos = selectedIds
      .map((id) => ewbList[id]?.ewb_no)
      .filter(Boolean)
      .join(", ");
    const message = ewbNos
      ? `Are you sure you want to delete EWB No(s): ${ewbNos}?`
      : `Are you sure you want to delete ${selectedIds.length} selected record(s)?`;
    showWarning(
      "Delete EWB",
      message,
      () => {
        onDelete(selectedIds);
        setSelectedRows([]);
      }
    );
  };

  return (
    <div>
      <div style={sectionHeaderStyle}>
        <h3>EWB Details</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Tooltip title="Upload QR Image">
            <IconButton
              onClick={handleOpenUpload}
              size="small"
              sx={{ color: "#0f766e", "&:hover": { background: "#ccfbf1" } }}
            >
              <QrCodeScannerIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add EWB">
            <IconButton
              onClick={onAdd}
              size="small"
              sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete selected">
            <IconButton
              onClick={handleDelete}
              size="small"
              sx={{ color: "#dc2626", "&:hover": { background: "#fee2e2" } }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save EWB">
            <IconButton
              onClick={handleSave}
              size="small"
              sx={{ color: "#16a34a", "&:hover": { background: "#dcfce7" } }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <DataTable
        columns={ewbColumns}
        rows={ewbList}
        getKey={(row, idx) => row.rec_id ?? idx}
        actions={[]}
        editable
        singleClick
        checkboxSelection
        onCellChange={handleCellChange}
        onRowUpdate={handleRowUpdate}
        onRowSelectionModelChange={(model) => {
          const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
          setSelectedRows(ids);
        }}
      />

      <Dialog
        open={isUploadOpen}
        onClose={handleCloseUpload}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 3 }}>
          <Typography variant="h6">Upload EWB QR Code Image</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Take a screenshot of the EWB QR code and upload it here. Works on HTTP and HTTPS.
          </Typography>

          <Box
            sx={{
              width: "100%",
              minHeight: 200,
              borderRadius: 2,
              border: "2px dashed #ccc",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              p: 3,
              cursor: "pointer",
              "&:hover": { borderColor: "#0f766e", background: "#f0fdfa" },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <QrCodeScannerIcon sx={{ fontSize: 48, color: "#0f766e" }} />
            <Typography variant="body1" color="text.secondary">
              {isDecoding ? "Decoding QR code..." : "Click to select a QR image"}
            </Typography>
          </Box>

          {uploadError && (
            <Typography color="error" textAlign="center">
              {uploadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseUpload}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}