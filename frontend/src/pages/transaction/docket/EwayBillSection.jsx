import { useEffect, useRef, useState } from "react";
import moment from "moment";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameRef = useRef(null);
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

  useEffect(() => {
    return () => {
      if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
      scanFrameRef.current = null;
    };
  }, []);

  const stopScanner = async () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleOpenScanner = () => {
    setScannerError("");
    setIsScannerOpen(true);
    window.requestAnimationFrame(() => {
      void startScanner();
    });
  };

  const handleCloseScanner = async () => {
    await stopScanner();
    setIsScannerOpen(false);
  };

  const startScanner = async () => {
    setScannerError("");

    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera QR scanning is not supported in this browser. Enter the EWB number manually instead.");
      return;
    }

    try {
      await stopScanner();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setIsScanning(true);

      const scanLoop = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes?.length) {
            const cleaned = String(barcodes[0].rawValue || "").trim();
            const match = cleaned.match(/\d+/);
            const ewbNo = match ? match[0] : cleaned;
            if (ewbNo) {
              await stopScanner();
              setIsScannerOpen(false);
              await applyScannedEwb(ewbNo);
              return;
            }
          }
        } catch {
          // Ignore transient detection errors and continue scanning
        }

        scanFrameRef.current = requestAnimationFrame(() => {
          void scanLoop();
        });
      };

      scanFrameRef.current = requestAnimationFrame(() => {
        void scanLoop();
      });
    } catch (err) {
      await stopScanner();
      setScannerError(err?.message || "Unable to access the camera");
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

    let nextList = ewbList;
    if (targetIndex < 0) {
      onAdd?.();
      nextList = [...ewbList, { ewb_no: "", ewb_date: "", ewb_valid: "", inv_no: "", inv_date: "" }];
    }

    const newRow = { ...baseRow, ewb_no: ewbNo };
    const updatedRow = await handleRowUpdate(newRow, baseRow);

    if (updatedRow && onEwbListUpdate) {
      onEwbListUpdate(fallbackIndex, updatedRow);
    }

    if (updatedRow && targetIndex < 0 && nextList !== ewbList) {
      onEwbListUpdate?.(fallbackIndex, updatedRow);
    }
  };

  const handleRowUpdate = async (newRow, oldRow) => {
    if (newRow.ewb_no === oldRow.ewb_no) {
      // ewb_no unchanged — handle edits to other columns (e.g. docket_no)
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
          {isMobile && (
            <Tooltip title="Scan EWB QR">
              <IconButton
                onClick={handleOpenScanner}
                size="small"
                sx={{ color: "#0f766e", "&:hover": { background: "#ccfbf1" } }}
              >
                <QrCodeScannerIcon />
              </IconButton>
            </Tooltip>
          )}
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
          // MUI DataGrid v7+ returns { type, ids: Set<GridRowId> }
          const ids = model?.ids instanceof Set ? model.ids : new Set(Array.isArray(model) ? model : []);
          setSelectedRows(ids);
        }}
      />

      <Dialog
        open={isScannerOpen}
        onClose={handleCloseScanner}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 3 }}>
          <Typography variant="h6">Scan EWB QR Code</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Point your camera at the EWB QR code to auto-fill the EWB number.
          </Typography>
          <Box
            sx={{ width: "100%", minHeight: 280, borderRadius: 2, overflow: "hidden", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <video
              ref={videoRef}
              id="ewb-qr-reader"
              playsInline
              muted
              style={{ width: "100%", height: 280, objectFit: "cover" }}
            />
          </Box>
          {isScanning && <CircularProgress size={24} />}
          {scannerError && (
            <Typography color="error" textAlign="center">
              {scannerError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseScanner}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
