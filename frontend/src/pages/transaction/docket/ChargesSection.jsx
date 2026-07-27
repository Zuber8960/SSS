import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Typography, Box, IconButton, Tooltip } from "@mui/material";
import { AddIcon, DeleteIcon } from "../../../components/common/icons";
import { DataTable } from "../../../components/common/MasterPage";
import {
  fetchChargeMaster,
  fetchCharges,
  createCharge,
  updateCharge,
  deleteCharge as deleteChargeApi,
} from "../../../utils/docket";
import useAlert from "../../../components/common/UseAlert";
import CommonAlertDialog from "../../../components/common/CommonAlertDialog";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const getFreightAmount = (rows) => {
  const row = rows.find((r) => r.charge_code === "DK01");
  return row ? toNumber(row.user_code) : 0;
};

const calculateChargeRow = (row, rows, invValue, chargeMaster = []) => {
  const userValue = toNumber(row.user_code);
  const inv = toNumber(invValue);
  let chargeAmount;

  if (row.charge_code === "DK01") {
    // FREIGHT — rate is the amount
    chargeAmount = userValue;
  } else if (row.charge_code === "DK02") {
    // SURCHARGE — always DK01 amount * DK02 default_rate from master
    const dk02Master = chargeMaster.find((m) => m.charge_code === "DK02");
    const defaultRate = dk02Master ? toNumber(dk02Master.default_rate) : userValue;
    chargeAmount = (getFreightAmount(rows) * defaultRate) / 100;
  } else if (row.charge_code === "DK03") {
    // FREIGHT ON VALUE — % of invoice value
    chargeAmount = (inv * userValue) / 100;
  } else if (row.charge_code === "DK04") {
    // COVER OF CHARGE — rate * invoice value
    chargeAmount = inv * userValue;
  } else {
    // All other charges: user_code is the flat rate
    chargeAmount = userValue;
  }

  return { ...row, charge_amt: formatAmount(chargeAmount) };
};

const recalculateChargeList = (rows, invValue, chargeMaster = []) =>
  rows.map((row) => calculateChargeRow(row, rows, invValue, chargeMaster));

const ChargesSection = forwardRef(function ChargesSection({
  docketId,
  invoiceValue,
  sectionHeaderStyle,
  onChargesChange,
  singleClick = false,
}, ref) {
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [chargeMaster, setChargeMaster] = useState([]);
  const [chargeList, setChargeList] = useState([]);
  const [dirtyRecIds, setDirtyRecIds] = useState(new Set());
  const tempIdCounter = useRef(-1);
  const chargesLoaded = useRef(false);

  // Load charge master once on mount
  useEffect(() => {
    fetchChargeMaster()
      .then(setChargeMaster)
      .catch(console.error);
  }, []);

  // Expose saveCharges and getChargeList to parent via ref
  useImperativeHandle(ref, () => ({
    getChargeList: () => chargeList,
    saveCharges: async (docketIdOverride) => {
      const targetDocketId = docketIdOverride || docketId;
      if (!targetDocketId) return;

      let added = 0;
      let updated = 0;

      for (const charge of chargeList) {
        if (charge.rec_id < 0) {
          await createCharge(targetDocketId, {
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

      const updatedCharges = await fetchCharges(targetDocketId);
      setChargeList(updatedCharges);
      setDirtyRecIds(new Set());
      tempIdCounter.current = -1;

      if (added > 0) showSuccess(`${added} charge${added > 1 ? "s" : ""} added successfully`);
      if (updated > 0) showSuccess(`${updated} charge${updated > 1 ? "s" : ""} updated successfully`);
    },
  }), [chargeList, dirtyRecIds, docketId, showSuccess]);

  // Fetch charges whenever docketId changes
  useEffect(() => {
    if (!docketId) {
      chargesLoaded.current = false;
      setChargeList([]);
      setDirtyRecIds(new Set());
      tempIdCounter.current = -1;
      return;
    }
    chargesLoaded.current = false;
    fetchCharges(docketId)
      .then((charges) => {
        chargesLoaded.current = true;
        setChargeList(charges);
        setDirtyRecIds(new Set());
        tempIdCounter.current = -1;
      })
      .catch(console.error);
  }, [docketId]);

  // When invoiceValue changes after charges are loaded, recalculate all rows
  useEffect(() => {
    if (!chargesLoaded.current) return;
    setChargeList((prev) => {
      if (prev.length === 0) return prev;
      return recalculateChargeList(prev, invoiceValue, chargeMaster);
    });
  }, [invoiceValue, chargeMaster]);

  // Notify parent of chargeList changes
  useEffect(() => {
    if (onChargesChange) onChargesChange(chargeList);
  }, [chargeList, onChargesChange]);

  const chargeLabel = (m) => m.charge_desc;

  // Build dropdown options from charge master
  const chargeDescOptions = chargeMaster.map(chargeLabel);

  const chargeColumns = [
    { key: "charge_code", label: "Charge Desc", options: chargeDescOptions },
    { key: "user_code", label: "Rate", type: "number" },
    { key: "charge_amt", label: "Charge Amount", editable: false },
  ];

  // --- Handlers ---

  const addChargeRow = () => {
    const existingCodes = new Set(chargeList.map((r) => r.charge_code));
    const firstMaster = chargeMaster.find((m) => !existingCodes.has(m.charge_code));
    if (!firstMaster) return;

    const newRow = {
      rec_id: tempIdCounter.current--,
      charge_code: firstMaster.charge_code,
      user_code: firstMaster.default_rate ?? "",
    };
    setChargeList((prev) =>
      recalculateChargeList([...prev, newRow], invoiceValue, chargeMaster)
    );
  };

  const deleteCharge = (row) => {
    const chargeToDelete = chargeList.find((c) => c.rec_id === row.rec_id);
    if (!chargeToDelete) return;

    showWarning("Confirm Delete", "Are you sure you want to delete this Charge?", async () => {
      if (chargeToDelete.rec_id < 0) {
        setChargeList((prev) =>
          recalculateChargeList(prev.filter((c) => c.rec_id !== row.rec_id), invoiceValue, chargeMaster)
        );
        showSuccess("Charge removed");
        return;
      }

      try {
        await deleteChargeApi(chargeToDelete.rec_id);
        setChargeList((prev) =>
          recalculateChargeList(prev.filter((c) => c.rec_id !== row.rec_id), invoiceValue, chargeMaster)
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

  const updateChargeRow = (recId, field, value) => {
    const idx = chargeList.findIndex((r) => r.rec_id === recId);
    if (idx === -1) return null;

    const updated = [...chargeList];
    const existingRow = updated[idx];

    let patch = { [field]: value };

    // When charge_code (shown as charge_desc) changes, look up the matching master
    // record and populate charge_code (actual code) + default user_code
    if (field === "charge_code") {
      const master = chargeMaster.find((m) => chargeLabel(m) === value);
      if (master) {
        // Block adding a second DK02 row
        if (
          master.charge_code === "DK02" &&
          chargeList.some((r) => r.rec_id !== recId && r.charge_code === "DK02")
        ) {
          showError("DK02 (Surcharge) can only appear once in the charges grid");
          return null;
        }
        patch = {
          charge_code: master.charge_code,
          user_code: master.default_rate ?? "",
        };
      }
    }

    updated[idx] = { ...existingRow, ...patch };

    if (existingRow.rec_id > 0) {
      setDirtyRecIds((d) => new Set(d).add(existingRow.rec_id));
    }

    const recalculated = recalculateChargeList(updated, invoiceValue, chargeMaster);
    setChargeList(recalculated);

    const displayRow = recalculated[idx];
    const master = chargeMaster.find((m) => m.charge_code === displayRow.charge_code);
    return {
      ...displayRow,
      charge_code: master ? master.charge_desc : displayRow.charge_code,
      id: recId,
    };
  };

  // Map charge_code → charge_desc for display in the table
  const displayRows = chargeList.map((row) => {
    const master = chargeMaster.find((m) => m.charge_code === row.charge_code);
    return { ...row, charge_code: master ? chargeLabel(master) : row.charge_code };
  });

  return (
    <div>
      <Box sx={{ ...sectionHeaderStyle, marginBottom: 1.5 }}>
        <Typography variant="h6" fontWeight={600}>Charges</Typography>
        <Tooltip title="Add Charge">
          <IconButton size="small" onClick={addChargeRow} sx={{ color: "#7e22ce", "&:hover": { background: "#f3e8ff" } }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <DataTable
        columns={chargeColumns}
        rows={displayRows}
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
});

export default ChargesSection;
