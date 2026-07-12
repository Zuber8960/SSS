import { useState, useEffect, useRef } from "react";
import { FormControl, InputLabel, Select, MenuItem, Typography, Stack, Box, IconButton, Tooltip } from "@mui/material";
import { AddIcon, SaveIcon, DeleteIcon } from "../../../components/common/icons";
import { DataTable } from "../../../components/common/MasterPage";
import {
  fetchAllDockets,
  fetchCharges,
  createCharge,
  updateCharge,
  deleteCharge as deleteChargeApi,
} from "../../../utils/docket";
import useAlert from "../../../components/common/UseAlert";
import CommonAlertDialog from "../../../components/common/CommonAlertDialog";

const chargeDescOptions = ["Freight", "Ser charge", "COF", "Freight On Value"];

const chargeDefaults = {
  Freight: { user_code: 100 },
  "Ser charge": { user_code: "" },
  COF: { user_code: 0.003 },
  "Freight On Value": { user_code: "" },
};

const chargeColumns = [
  { key: "charge_code", label: "Charge Desc", options: chargeDescOptions },
  { key: "user_code", label: "User Desc", type: "number" },
  { key: "charge_amt", label: "Charge Amount", editable: false },
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const getFreightAmount = (rows) => {
  const row = rows.find((r) => r.charge_code === "Freight");
  return row ? toNumber(row.user_code) : 0;
};

const calculateChargeRow = (row, rows, invValue) => {
  const userValue = toNumber(row.user_code);
  const inv = toNumber(invValue);
  let chargeAmount = 0;

  if (row.charge_code === "Freight") {
    chargeAmount = userValue;
  } else if (row.charge_code === "Ser charge") {
    chargeAmount = (getFreightAmount(rows) * userValue) / 100;
  } else if (row.charge_code === "COF") {
    chargeAmount = inv * userValue;
  } else if (row.charge_code === "Freight On Value") {
    chargeAmount = (inv * userValue) / 100;
  }

  return { ...row, charge_amt: formatAmount(chargeAmount) };
};

const recalculateChargeList = (rows, invValue) =>
  rows.map((row) => calculateChargeRow(row, rows, invValue));

export default function ChargesSection({
  docketId,
  invoiceValue,
  sectionHeaderStyle,
  onChargesChange,
  singleClick = false,
}) {
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [chargeList, setChargeList] = useState([]);
  const [dirtyRecIds, setDirtyRecIds] = useState(new Set());
  const tempIdCounter = useRef(-1);
  const chargesLoaded = useRef(false);

  // All docket options for the selector dropdown
  const [docketOptions, setDocketOptions] = useState([]);
  // null means "user hasn't picked yet" — fall back to the prop in that case
  const [userPickedDocketId, setUserPickedDocketId] = useState(null);
  const selectedDocketId = userPickedDocketId ?? docketId ?? "";

  // Load all dockets once for the dropdown
  useEffect(() => {
    fetchAllDockets()
      .then((dockets) => {
        setDocketOptions(dockets.map((d) => ({
          value: d.docket_no,
          label: d.docket_no,
        })));
      })
      .catch(console.error);
  }, []);

  // Fetch charges whenever the effective docket selection changes
  useEffect(() => {
    if (!selectedDocketId) return;
    chargesLoaded.current = false;
    fetchCharges(selectedDocketId)
      .then((charges) => {
        chargesLoaded.current = true;
        setChargeList(charges);
        setDirtyRecIds(new Set());
        tempIdCounter.current = -1;
      })
      .catch(console.error);
  }, [selectedDocketId]);

  // When invoiceValue changes after charges are loaded, recalculate all rows
  useEffect(() => {
    if (!chargesLoaded.current) return;
    setChargeList((prev) => {
      if (prev.length === 0) return prev;
      return recalculateChargeList(prev, invoiceValue);
    });
  }, [invoiceValue]);

  // Notify parent of chargeList changes
  useEffect(() => {
    if (onChargesChange) onChargesChange(chargeList);
  }, [chargeList, onChargesChange]);

  // --- Handlers ---

  const addChargeRow = () => {
    const newRow = {
      rec_id: tempIdCounter.current--,
      charge_code: "Freight",
      ...chargeDefaults.Freight,
    };
    setChargeList((prev) =>
      recalculateChargeList([...prev, newRow], invoiceValue)
    );
  };

  const deleteCharge = (row) => {
    const chargeToDelete = chargeList.find((c) => c.rec_id === row.rec_id);
    if (!chargeToDelete) return;

    showWarning("Confirm Delete", "Are you sure you want to delete this Charge?", async () => {
      if (chargeToDelete.rec_id < 0) {
        setChargeList((prev) =>
          recalculateChargeList(prev.filter((c) => c.rec_id !== row.rec_id), invoiceValue)
        );
        showSuccess("Charge removed");
        return;
      }

      try {
        await deleteChargeApi(chargeToDelete.rec_id);
        setChargeList((prev) =>
          recalculateChargeList(prev.filter((c) => c.rec_id !== row.rec_id), invoiceValue)
        );
        setDirtyRecIds((prev) => {
          const next = new Set(prev);
          next.delete(chargeToDelete.rec_id);
          return next;
        });
        showSuccess("Charge deleted successfully");
      } catch (err) {
        console.error("Failed to delete charge:", err);
        showError(err.message || "Failed to delete charge");
      }
    });
  };

  const handleSave = async () => {
    if (!selectedDocketId) {
      showError("Please select a docket first.");
      return;
    }

    try {
      let added = 0;
      let updated = 0;

      for (const charge of chargeList) {
        if (charge.rec_id < 0) {
          await createCharge(selectedDocketId, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
          added++;
        } else if (dirtyRecIds.has(charge.rec_id)) {
          await updateCharge(charge.rec_id, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
          updated++;
        }
      }

      const updatedCharges = await fetchCharges(selectedDocketId);
      setChargeList(updatedCharges);
      setDirtyRecIds(new Set());
      tempIdCounter.current = -1;

      if (added > 0) showSuccess(`${added} charge${added > 1 ? "s" : ""} added successfully`);
      if (updated > 0) showSuccess(`${updated} charge${updated > 1 ? "s" : ""} updated successfully`);
      if (added === 0 && updated === 0) showSuccess("No changes to save");
    } catch (err) {
      console.error("Failed to save charges:", err);
      showError(err.message || "Failed to save charges");
    }
  };

  const updateChargeRow = (recId, field, value) => {
    const idx = chargeList.findIndex((r) => r.rec_id === recId);
    if (idx === -1) return null;

    const updated = [...chargeList];
    const existingRow = updated[idx];
    const defaults = field === "charge_code" ? chargeDefaults[value] || {} : {};
    updated[idx] = { ...existingRow, ...defaults, [field]: value };

    if (existingRow.rec_id > 0) {
      setDirtyRecIds((d) => new Set(d).add(existingRow.rec_id));
    }

    const recalculated = recalculateChargeList(updated, invoiceValue);
    setChargeList(recalculated);

    return { ...recalculated[idx], id: recId };
  };

  return (
    <div>
      <Box sx={{ ...sectionHeaderStyle, marginBottom: 1.5 }}>
        <Typography variant="h6" fontWeight={600}>Charges</Typography>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Docket ID</InputLabel>
            <Select
              label="Docket ID"
              value={selectedDocketId}
              onChange={(e) => {
                const val = e.target.value;
                setUserPickedDocketId(val);
                if (!val) {
                  chargesLoaded.current = false;
                  setChargeList([]);
                  setDirtyRecIds(new Set());
                  tempIdCounter.current = -1;
                }
              }}
            >
              <MenuItem value=""><em>-- Select Docket --</em></MenuItem>
              {docketOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Add Charge"><IconButton size="small" onClick={addChargeRow} disabled={!selectedDocketId} sx={{ color: "#7e22ce", opacity: selectedDocketId ? 1 : 0.45, "&:hover": { background: "#f3e8ff" } }}><AddIcon /></IconButton></Tooltip>
          <Tooltip title="Save"><IconButton size="small" onClick={handleSave} disabled={!selectedDocketId} sx={{ color: "#16a34a", opacity: selectedDocketId ? 1 : 0.45, "&:hover": { background: "#dcfce7" } }}><SaveIcon /></IconButton></Tooltip>
        </Stack>
      </Box>

      <DataTable
        columns={chargeColumns}
        rows={chargeList}
        getKey={(row) => row.rec_id}
        actions={[
          { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deleteCharge(row) },
        ]}
        editable
        singleClick={singleClick}
        onCellChange={(rowIndex, key, value) =>
          updateChargeRow(rowIndex, key, value)
        }
      />
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </div>
  );
}
