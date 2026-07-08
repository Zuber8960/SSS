import { useState } from "react";
import moment from "moment";
import { IconButton, Tooltip } from "@mui/material";
import { ToggleSwitch } from "../../../components/common/MasterPage";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataTable } from "../../../components/common/MasterPage";
import { fetchEwayBillFromDB } from "../../../utils/docket";

export default function EwayBillSection({
  ewbList,
  onAdd,
  onDelete,
  onCellChange,
  onEwbListUpdate,
  sectionHeaderStyle,
  withEWB = false,
  showError,
  showWarning,
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [showDocketNo, setShowDocketNo] = useState(false);

  const ewbColumns = [
    { key: "ewb_no", label: "EWB No", editable: !withEWB },
    { key: "ewb_date", label: "EWB Date" },
    { key: "ewb_valid", label: "Valid Upto" },
    { key: "inv_no", label: "Invoice No" },
    { key: "inv_date", label: "Invoice Date" },
    ...(showDocketNo ? [{ key: "docket_no", label: "Docket No", editable: true }] : []),
  ];

  const handleRowUpdate = async (newRow, oldRow) => {
    if (newRow.ewb_no === oldRow.ewb_no) return newRow;

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
      const records = await fetchEwayBillFromDB([Number(ewbNo)]);
      if (!records || records.length === 0) {
        showError(`EWB number ${ewbNo} does not exist`);
        return oldRow;
      }

      const r = records[0];
      const toDate = (val) =>
        val ? moment(val, ["DD/MM/YYYY HH:mm:ss A", "YYYY-MM-DD"]).format("MM/DD/YYYY") : "";

      const populated = {
        ...newRow,
        ewb_no: r.ewb_no || ewbNo,
        ewb_date: toDate(r.ewb_date),
        ewb_valid: toDate(r.ewb_valid_upto),
        inv_no: r.invoice_no || "",
        inv_date: toDate(r.invoice_date),
      };

      if (onEwbListUpdate) onEwbListUpdate(newRow.id, populated);
      return populated;
    } catch (err) {
      showError(err.message || `Failed to fetch EWB ${ewbNo}`);
      return oldRow;
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
          <ToggleSwitch
            checked={showDocketNo}
            onChange={() => setShowDocketNo((prev) => !prev)}
            labelOn="Docket No On"
            labelOff="Docket No Off"
            size="small"
          />
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
        getKey={(row, idx) => idx}
        actions={[]}
        editable
        singleClick
        checkboxSelection
        onCellChange={onCellChange}
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
