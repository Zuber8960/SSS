import { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import {
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
import ClearAllIcon from "@mui/icons-material/ClearAll";
import { Html5Qrcode } from "html5-qrcode";
import { AddIcon, DeleteIcon } from "../../../components/common/icons";
import { DataTable } from "../../../components/common/MasterPage";
import { fetchEwayBillFromDB } from "../../../utils/docket";
import { getDateFormat } from "../../../utils/tenantService";

export default function EwayBillSection({
  ewbList,
  onAdd,
  onDelete,
  onCellChange,
  onEwbListUpdate,
  onDocketPopulate,
  onShowForm,
  onClearAll,
  sectionHeaderStyle,
  showError,
  showWarning,
  showInfo,
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef(null);
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
    { key: "invoice_total", label: "Inv Value" },
  ];

  // --- scanner helpers ---

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  const handleOpenScanner = () => {
    setScannerError("");
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    stopScanner();
    setIsScannerOpen(false);
    setScannerError("");
  };

  // --- EWB logic ---

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

  const handleRowUpdate = useCallback(async (newRow, oldRow) => {
    if (newRow.ewb_no === oldRow.ewb_no) {
      Object.keys(newRow).forEach((key) => {
        if (key !== "id" && newRow[key] !== oldRow[key]) {
          onCellChange(newRow.id, key, newRow[key]);
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
      const { apiCalls, docketData } = ewbApi || {};
      let records = ewbApi?.data || ewbApi || [];
      if (!records || records.length === 0) {
        showError(`EWB number ${ewbNo} does not exist`);
        return oldRow;
      }

      if (records.length && !apiCalls) {
        const docketCount = records.filter((r) => r.docket_no).length;
        if (docketCount === records.length) {
          showError(`EWB number ${ewbNo} is already attached to docket ${records[0].docket_no}`);
          return oldRow;
        }
      }

      let r = records[0];
      if (!apiCalls) {
        r = records.find((r) => !r.docket_no) || records[0];
      }

      const toDate = (val) =>
        val ? moment(val, ["DD/MM/YYYY HH:mm:ss A", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD"]).format("MM/DD/YYYY") : "";

      const dtl = Array.isArray(r.dtl_rows) ? r.dtl_rows[0] : null;

      const populated = {
        ...newRow,
        rec_id: r.rec_id ?? null,
        ewb_no: r.EWB_NO || r.ewb_no || ewbNo,
        ewb_date: toDate(r.EWB_DATE || r.ewb_date),
        ewb_valid: toDate(r.EWB_VALID_UPTO || r.ewb_valid_upto),
        inv_no: r.INV_NO || r.invoice_no || "",
        inv_date: toDate(r.INV_DATE || r.invoice_date),
        cnor_name: dtl?.FROM_CUST_NAME || r.FROM_CUST_NAME || r.cnor_name || "",
        cnee_name: dtl?.TO_CUST_NAME || r.TO_CUST_NAME || r.cnee_name || "",
        cnor_address: dtl?.FROM_ADDRESS || r.FROM_ADDRESS || r.cnor_address || "",
        cnee_address: dtl?.TO_ADDRESS || r.TO_ADDRESS || r.cnee_address || "",
        cnor_gstin: dtl?.CNOR_GSTIN || r.CNOR_GSTIN || r.cnor_gstin || "",
        cnee_gstin: dtl?.CNEE_GSTIN || r.CNEE_GSTIN || r.cnee_gstin || "",
        cnor_pincode: dtl?.FROM_PINCODE || r.FROM_PINCODE || r.cnor_pincode || "",
        cnee_pincode: dtl?.TO_PINCODE || r.TO_PINCODE || r.cnee_pincode || "",
        cnor_city: dtl?.FROM_PLACE || r.FROM_PLACE || r.cnor_city || "",
        cnee_city: dtl?.TO_PLACE || r.TO_PLACE || r.cnee_city || "",
        invoice_total: r.TOTAL_INV_VALUE || r.invoice_total || 0,
        cgst: r.CGST_VALUE || r.cgst || 0,
        sgst: r.SGST_VALUE || r.sgst || 0,
        igst: r.IGST_VALUE || r.igst || 0,
        cess: r.cess || 0,
        product_name: dtl?.PRODUCT_NAME || r.PRODUCT_NAME || r.product_name || "",
        hsn_code: dtl?.ITEM_HSN_CODE || r.ITEM_HSN_CODE || r.hsn_code || "",
        quantity: dtl?.ITEM_QTY || r.ITEM_QTY || r.quantity || 0,
      };

      if (docketData?.bpWarnings?.length && showInfo) {
        showInfo(docketData.bpWarnings.join("\n"), "Business Partner Warning");
      }

      if (onDocketPopulate) {
        let docketPayload;
        if (docketData) {
          docketPayload = { ...docketData, ewb_no: docketData.ewb_no || populated.ewb_no };
        } else if (r.docket) {
          const dk = r.docket;
          docketPayload = {
            ewb_no:        populated.ewb_no,
            docket_no:     dk.docket_no     || null,
            docket_date:   dk.docket_date   || null,
            cnor_id:       dk.cnor_id       ?? null,
            cnor_name:     dk.cnor_name     || populated.cnor_name,
            cnor_address:  dk.cnor_address  || populated.cnor_address,
            cnor_gstin:    dk.cnor_gstin    || populated.cnor_gstin,
            cnor_pincode:  dk.cnor_pincode  || populated.cnor_pincode,
            cnor_city:     dk.cnor_city     || populated.cnor_city,
            cnor_state:    dk.cnor_state    || "",
            cnee_id:       dk.cnee_id       ?? null,
            cnee_name:     dk.cnee_name     || populated.cnee_name,
            cnee_address:  dk.cnee_address  || populated.cnee_address,
            cnee_gstin:    dk.cnee_gstin    || populated.cnee_gstin,
            cnee_pincode:  dk.cnee_pincode  || populated.cnee_pincode,
            cnee_city:     dk.cnee_city     || populated.cnee_city,
            cnee_state:    dk.cnee_state    || "",
            invoice_no:    dk.docket_inv_no || populated.inv_no,
            invoice_date:  dk.docket_inv_date ? toDate(dk.docket_inv_date) : populated.inv_date,
            invoice_value: dk.docket_inv_value ?? populated.invoice_total,
          };
        } else {
          docketPayload = {
            ewb_no:        populated.ewb_no,
            cnor_name:     populated.cnor_name,
            cnor_address:  populated.cnor_address,
            cnor_gstin:    populated.cnor_gstin,
            cnor_pincode:  populated.cnor_pincode,
            cnor_city:     populated.cnor_city,
            cnee_name:     populated.cnee_name,
            cnee_address:  populated.cnee_address,
            cnee_gstin:    populated.cnee_gstin,
            cnee_pincode:  populated.cnee_pincode,
            cnee_city:     populated.cnee_city,
            invoice_no:    populated.inv_no,
            invoice_date:  populated.inv_date,
            invoice_value: populated.invoice_total,
          };
        }
        const result = onDocketPopulate(docketPayload);
        if (result === false) return oldRow;
      }
      if (onEwbListUpdate) onEwbListUpdate(newRow.id, populated);
      if (onShowForm) onShowForm();
      return populated;
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      showError(apiMsg || err.message || `Failed to fetch EWB ${ewbNo}`);
      return oldRow;
    }
  }, [ewbList, onCellChange, onDocketPopulate, onEwbListUpdate, onShowForm, showError]);

  const applyScannedEwb = useCallback(async (ewbNo) => {
    const targetIndex = ewbList.findIndex((row) => !String(row?.ewb_no || "").trim());
    const fallbackIndex = targetIndex >= 0 ? targetIndex : ewbList.length;
    const baseRow = ewbList[fallbackIndex] || {
      ewb_no: "", ewb_date: "", ewb_valid: "", inv_no: "", inv_date: "",
    };

    if (targetIndex < 0) onAdd?.();

    const newRow = { ...baseRow, id: fallbackIndex, ewb_no: ewbNo };
    const updatedRow = await handleRowUpdate(newRow, baseRow);
    if (updatedRow && onEwbListUpdate) onEwbListUpdate(fallbackIndex, updatedRow);
  }, [ewbList, handleRowUpdate, onAdd, onEwbListUpdate]);

  // Keep a stable ref so the div-mount callback always calls the latest version
  const applyScannedEwbRef = useRef(applyScannedEwb);
  useEffect(() => { applyScannedEwbRef.current = applyScannedEwb; }, [applyScannedEwb]);

  // Called by React when the scanner div is mounted/unmounted inside the Dialog
  const scannerDivRef = useCallback((divEl) => {
    if (!divEl) {
      stopScanner();
      return;
    }
    const scanner = new Html5Qrcode(divEl.id);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          stopScanner();
          setIsScannerOpen(false);
          const match = decodedText.match(/\d+/);
          const ewbNo = match ? match[0] : decodedText.trim();
          if (ewbNo) await applyScannedEwbRef.current(ewbNo);
        },
        () => {}
      )
      .catch((err) => {
        setScannerError(err?.message || "Camera access denied or not available.");
      });
  }, []);

  const handleDelete = () => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length === 0) {
      showError("Please select at least one row to delete");
      return;
    }
    const ewbNos = selectedIds.map((id) => ewbList[id]?.ewb_no).filter(Boolean).join(", ");
    const message = ewbNos
      ? `Are you sure you want to delete EWB No(s): ${ewbNos}?`
      : `Are you sure you want to delete ${selectedIds.length} selected record(s)?`;
    showWarning("Delete EWB", message, () => {
      onDelete(selectedIds);
      setSelectedRows([]);
    });
  };

  return (
    <div>
      <div style={sectionHeaderStyle}>
        <h3>EWB Details</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Tooltip title="Clear All">
            <IconButton
              onClick={() =>
                showWarning("Clear EWB", "This will clear all EWB rows and the docket form. Are you sure?", () => onClearAll?.())
              }
              size="small"
              sx={{ color: "#b45309", "&:hover": { background: "#fef3c7" } }}
            >
              <ClearAllIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Scan QR Code">
            <IconButton
              onClick={handleOpenScanner}
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
        open={isScannerOpen}
        onClose={handleCloseScanner}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 3 }}>
          <Typography variant="h6">Scan EWB QR Code</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Point your camera at the EWB QR code. It will be detected automatically.
          </Typography>
          <div
            id="ewb-qr-reader"
            ref={scannerDivRef}
            style={{ width: "100%", maxWidth: 400 }}
          />
          {scannerError && (
            <Typography color="error" sx={{ textAlign: "center" }}>
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
