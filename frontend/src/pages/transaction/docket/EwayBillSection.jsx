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

// --- EWB helpers (module scope: pure, no props/state access) ---

// A single ewb_no cell may hold several numbers, e.g. "1234,5678".
const parseEwbNumbers = (value) =>
  String(value ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

const toDate = (val) =>
  val
    ? moment(val, ["DD/MM/YYYY HH:mm:ss A", "YYYY-MM-DDTHH:mm:ss.SSSZ", "YYYY-MM-DD"]).format("MM/DD/YYYY")
    : "";

const getRecordEwbNo = (rec) => String(rec?.EWB_NO || rec?.ewb_no || "").trim();

const getRecordInvValue = (rec) => parseFloat(rec?.TOTAL_INV_VALUE ?? rec?.invoice_total) || 0;

const eqText = (a, b) =>
  (a ?? "").toString().trim().toLowerCase() === (b ?? "").toString().trim().toLowerCase();

// Consignor / consignee of an EWB record, preferring the first detail line.
const getParty = (rec) => {
  const dtl = Array.isArray(rec?.dtl_rows) ? rec.dtl_rows[0] : null;
  return {
    cnor_name: dtl?.FROM_CUST_NAME || rec?.FROM_CUST_NAME || rec?.cnor_name || "",
    cnee_name: dtl?.TO_CUST_NAME || rec?.TO_CUST_NAME || rec?.cnee_name || "",
    cnor_city: dtl?.FROM_PLACE || rec?.FROM_PLACE || rec?.cnor_city || "",
    cnee_city: dtl?.TO_PLACE || rec?.TO_PLACE || rec?.cnee_city || "",
  };
};

// Build the full grid-row payload for one EWB record.
const buildRowFromRecord = (rec, baseRow = {}, ewbNoLabel) => {
  const dtl = Array.isArray(rec?.dtl_rows) ? rec.dtl_rows[0] : null;
  return {
    ...baseRow,
    rec_id: rec?.rec_id ?? null,
    ewb_no: ewbNoLabel || rec?.EWB_NO || rec?.ewb_no || baseRow.ewb_no || "",
    ewb_date: toDate(rec?.EWB_DATE || rec?.ewb_date),
    ewb_valid: toDate(rec?.EWB_VALID_UPTO || rec?.ewb_valid_upto),
    inv_no: rec?.INV_NO || rec?.invoice_no || "",
    inv_date: toDate(rec?.INV_DATE || rec?.invoice_date),
    cnor_name: dtl?.FROM_CUST_NAME || rec?.FROM_CUST_NAME || rec?.cnor_name || "",
    cnee_name: dtl?.TO_CUST_NAME || rec?.TO_CUST_NAME || rec?.cnee_name || "",
    cnor_address: dtl?.FROM_ADDRESS || rec?.FROM_ADDRESS || rec?.cnor_address || "",
    cnee_address: dtl?.TO_ADDRESS || rec?.TO_ADDRESS || rec?.cnee_address || "",
    cnor_gstin: dtl?.CNOR_GSTIN || rec?.CNOR_GSTIN || rec?.cnor_gstin || "",
    cnee_gstin: dtl?.CNEE_GSTIN || rec?.CNEE_GSTIN || rec?.cnee_gstin || "",
    cnor_pincode: dtl?.FROM_PINCODE || rec?.FROM_PINCODE || rec?.cnor_pincode || "",
    cnee_pincode: dtl?.TO_PINCODE || rec?.TO_PINCODE || rec?.cnee_pincode || "",
    cnor_city: dtl?.FROM_PLACE || rec?.FROM_PLACE || rec?.cnor_city || "",
    cnee_city: dtl?.TO_PLACE || rec?.TO_PLACE || rec?.cnee_city || "",
    invoice_total: getRecordInvValue(rec),
    cgst: rec?.CGST_VALUE || rec?.cgst || 0,
    sgst: rec?.SGST_VALUE || rec?.sgst || 0,
    igst: rec?.IGST_VALUE || rec?.igst || 0,
    cess: rec?.cess || 0,
    product_name: dtl?.PRODUCT_NAME || rec?.PRODUCT_NAME || rec?.product_name || "",
    hsn_code: dtl?.ITEM_HSN_CODE || rec?.ITEM_HSN_CODE || rec?.hsn_code || "",
    quantity: dtl?.ITEM_QTY || rec?.ITEM_QTY || rec?.quantity || 0,
  };
};

// The grid row id is rec_id once a row is populated, but every callback expects
// an array index - so map the id back to its position in the list.
const resolveRowIndex = (id, list) => {
  if (typeof id === "number" && list[id] && list[id].rec_id == null) return id;
  const byRecId = list.findIndex((r) => r.rec_id != null && String(r.rec_id) === String(id));
  if (byRecId >= 0) return byRecId;
  return typeof id === "number" ? id : -1;
};

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
  // Set to true when the user commits the ewb_no cell with Enter or Tab, so
  // processRowUpdate knows it should resolve the EWB against the API.
  const commitRef = useRef(false);
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
    // The grid row id is rec_id for populated rows, but onCellChange /
    // onEwbListUpdate expect an array index.
    const rowIndex = resolveRowIndex(newRow.id, ewbList);

    // Only resolve against the API when the cell was committed with Enter/Tab.
    const shouldFetch = commitRef.current;
    commitRef.current = false; // Always reset immediately

    if (newRow.ewb_no === oldRow.ewb_no) {
      Object.keys(newRow).forEach((key) => {
        if (key !== "id" && newRow[key] !== oldRow[key]) {
          onCellChange(rowIndex, key, newRow[key]);
        }
      });
      return newRow;
    }

    const ewbNo = String(newRow.ewb_no).trim();
    if (!ewbNo) return newRow;

    if (!shouldFetch) {
      // Not committed with Enter/Tab - just keep what the user typed
      onCellChange(rowIndex, "ewb_no", ewbNo);
      return newRow;
    }

    // Numbers typed in this cell (a cell may hold "1234,5678")
    const currentEwbNumbers = parseEwbNumbers(ewbNo);
    if (currentEwbNumbers.length === 0) {
      showError(`Invalid EWB number format: ${ewbNo}`);
      return oldRow;
    }

    // Numbers already present on the other grid rows
    const otherRows = ewbList
      .map((row, idx) => ({ row, idx }))
      .filter(({ idx }) => idx !== rowIndex);
    const otherEwbNumbers = otherRows.flatMap(({ row }) => parseEwbNumbers(row.ewb_no));

    // The same EWB must not appear on two rows (nor twice in one cell)
    const duplicate = currentEwbNumbers.find((n) => otherEwbNumbers.includes(n));
    if (duplicate) {
      showError(`EWB number ${duplicate} is already added`);
      return oldRow;
    }
    if (new Set(currentEwbNumbers).size !== currentEwbNumbers.length) {
      showError(`Duplicate EWB number in ${ewbNo}`);
      return oldRow;
    }

    // Every EWB on the grid is resolved together, in one API call
    const uniqueEwbNumbers = [...new Set([...otherEwbNumbers, ...currentEwbNumbers])];

    try {
      const ewbApi = (await fetchEwayBillFromDB(uniqueEwbNumbers))?.data;
      const { apiCalls, docketData } = ewbApi || {};
      const records = ewbApi?.data || ewbApi || [];
      if (!Array.isArray(records) || records.length === 0) {
        showError(`EWB number(s) ${ewbNo} do not exist`);
        return oldRow;
      }

      // Index the response by EWB number so every row can find its record
      const recordByNo = new Map();
      records.forEach((rec) => {
        const no = getRecordEwbNo(rec);
        if (no && !recordByNo.has(no)) recordByNo.set(no, rec);
      });

      // Every number on the grid must exist, and none may already be in use
      const missing = uniqueEwbNumbers.filter((n) => !recordByNo.has(n));
      if (missing.length) {
        showError(`EWB number(s) ${missing.join(", ")} do not exist`);
        return oldRow;
      }

      if (!apiCalls) {
        const attached = uniqueEwbNumbers
          .map((n) => recordByNo.get(n))
          .find((rec) => rec.docket_no);
        if (attached) {
          showError(`EWB number ${getRecordEwbNo(attached)} is already attached to docket ${attached.docket_no}`);
          return oldRow;
        }
      }

      // Build the populated row for every EWB already on the grid
      const populatedByIndex = new Map();
      otherRows.forEach(({ row, idx }) => {
        const nums = parseEwbNumbers(row.ewb_no);
        // A cell can hold several numbers: merge the data of all of them
        const matched = nums.map((n) => recordByNo.get(n)).filter(Boolean);
        if (!matched.length) return;
        populatedByIndex.set(idx, {
          ...buildRowFromRecord(matched[0], row),
          ewb_no: nums.join(","),
          invoice_total: matched.reduce((sum, rec) => sum + getRecordInvValue(rec), 0),
        });
      });

      // The row being edited, merged over all numbers it holds
      const currentMatches = currentEwbNumbers.map((n) => recordByNo.get(n));
      const r = currentMatches[0];
      const populated = {
        ...buildRowFromRecord(r, newRow, ewbNo),
        invoice_total: currentMatches.reduce((sum, rec) => sum + getRecordInvValue(rec), 0),
      };
      populatedByIndex.set(rowIndex, populated);

      // Cross-check consignor / consignee across every EWB on the grid
      const reference = getParty(r);
      const mismatches = [];
      populatedByIndex.forEach((row) => {
        [
          ["Consignor Name", row.cnor_name, reference.cnor_name],
          ["Consignor Town", row.cnor_city, reference.cnor_city],
          ["Consignee Name", row.cnee_name, reference.cnee_name],
          ["Consignee Town", row.cnee_city, reference.cnee_city],
        ].forEach(([label, value, expected]) => {
          if (value && expected && !eqText(value, expected)) {
            mismatches.push(
              `EWB ${parseEwbNumbers(row.ewb_no).join(", ")} - ${label}: expected "${expected}", got "${value}"`
            );
          }
        });
      });

      if (mismatches.length > 0) {
        showError(mismatches.join("\n"), "Consignor / Consignee Mismatch");
        return oldRow;
      }

      if (docketData?.bpWarnings?.length && showInfo) {
        showInfo(docketData.bpWarnings.join("\n"), "Business Partner Warning");
      }

      // One invoice entry per EWB number, so the PO & Invoice grid gets a row
      // for each e-way bill. The value of an EWB is its own invoice value.
      // Entries are ordered by grid row so the list stays stable across edits.
      const invoiceRows = [];
      const seenInvNos = new Set();
      [...populatedByIndex.keys()].sort((a, b) => a - b).forEach((idx) => {
        const row = populatedByIndex.get(idx);
        const nums = parseEwbNumbers(row.ewb_no);
        if (!nums.length) return;
        const invNo = row.inv_no || "";
        // Several EWB numbers can share one invoice number - list it once
        if (invNo && seenInvNos.has(invNo)) return;
        if (invNo) seenInvNos.add(invNo);
        invoiceRows.push({
          po_no: "",
          po_date: "",
          invoice_no: invNo,
          invoice_date: row.inv_date || "",
          invoice_value: parseFloat(row.invoice_total) || 0,
          ewb_no: nums.join(","),
        });
      });

      if (onDocketPopulate) {
        // The base PO & Invoice row mirrors invoiceRows[0]; the remaining
        // entries are passed through as extra rows.
        const baseInv = invoiceRows[0] || {};
        const invNo = baseInv.invoice_no ?? populated.inv_no;
        const invDate = baseInv.invoice_date ?? populated.inv_date;
        const invValue = baseInv.invoice_value ?? (parseFloat(populated.invoice_total) || 0);

        let docketPayload;
        if (docketData) {
          docketPayload = {
            ...docketData,
            ewb_no: docketData.ewb_no || populated.ewb_no,
            invoice_no: docketData.invoice_no || invNo,
            invoice_date: docketData.invoice_date || invDate,
            invoice_value: docketData.invoice_value ?? invValue,
          };
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
            invoice_no:    dk.docket_inv_no || invNo,
            invoice_date:  dk.docket_inv_date ? toDate(dk.docket_inv_date) : invDate,
            invoice_value: invValue,
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
            invoice_no:    invNo,
            invoice_date:  invDate,
            invoice_value: invValue,
          };
        }
        // Extra invoice rows (one per additional EWB) for the PO & Invoice grid
        docketPayload.invoiceRows = invoiceRows;
        const result = onDocketPopulate(docketPayload);
        if (result === false) return oldRow;
      }

      // Push the matched data into every row that has an EWB number
      if (onEwbListUpdate) {
        populatedByIndex.forEach((row, idx) => onEwbListUpdate(idx, row));
      }

      if (onShowForm) onShowForm();
      return populated;
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      showError(apiMsg || err.message || `Failed to fetch EWB ${ewbNo}`);
      return oldRow;
    }
  }, [ewbList, onCellChange, onDocketPopulate, onEwbListUpdate, onShowForm, showError, showInfo]);

  const applyScannedEwb = useCallback(async (ewbNo) => {
    const targetIndex = ewbList.findIndex((row) => !String(row?.ewb_no || "").trim());
    const fallbackIndex = targetIndex >= 0 ? targetIndex : ewbList.length;
    const baseRow = ewbList[fallbackIndex] || {
      ewb_no: "", ewb_date: "", ewb_valid: "", inv_no: "", inv_date: "",
    };

    if (targetIndex < 0) onAdd?.();

    // A scan is an implicit Enter - resolve the EWB straight away
    commitRef.current = true;
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
        onCellEditStop={(params, event) => {
          // Resolve the EWB on both Enter and Tab
          if (params.field === "ewb_no" && (event?.key === "Tab" || event?.key === "Enter")) {
            commitRef.current = true;
          }
        }}
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
