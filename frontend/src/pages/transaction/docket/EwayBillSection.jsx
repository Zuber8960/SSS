import { useState } from "react";
import moment from "moment";
import { IconButton, Tooltip } from "@mui/material";
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
    </div>
  );
}
