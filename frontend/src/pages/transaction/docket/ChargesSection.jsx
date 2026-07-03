import { useState, useEffect, useMemo, useRef } from "react";
import { DataTable } from "../../../components/common/MasterPage";
import { fetchCharges, createCharge, updateCharge, deleteCharge as deleteChargeApi } from "../../../utils/docket";
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
  buttonStyle,
  sectionHeaderStyle,
  sectionActionsStyle,
  onChargesChange,
  singleClick = false,
}) {
  const { dialog, closeAlert, showSuccess, showError, showInfo } = useAlert();
  const [chargeList, setChargeList] = useState([]);
  // Tracks rec_ids of existing rows that were edited — negative rec_ids are new rows
  const [dirtyRecIds, setDirtyRecIds] = useState(new Set());
  // Counter for assigning temp negative rec_ids to new rows
  const tempIdCounter = useRef(-1);

  // Fetch charges when docketId changes, clear dirty state
  useEffect(() => {
    if (docketId) {
      fetchCharges(docketId)
        .then((charges) => {
          setChargeList(charges);
          setDirtyRecIds(new Set());
          tempIdCounter.current = -1;
        })
        .catch(console.error);
    }
  }, [docketId]);

  // Notify parent of chargeList changes
  useEffect(() => {
    if (onChargesChange) {
      onChargesChange(chargeList);
    }
  }, [chargeList, onChargesChange]);

  // Recalculate derived amounts when invoiceValue changes — no useEffect needed
  const displayChargeList = useMemo(
    () => recalculateChargeList(chargeList, invoiceValue),
    [chargeList, invoiceValue]
  );

  // --- Handlers ---

  const addChargeRow = () => {
    const newRow = {
      rec_id: tempIdCounter.current--,   // negative = new, not yet saved
      charge_code: "Freight",
      ...chargeDefaults.Freight,
    };
    setChargeList((prev) =>
      recalculateChargeList([...prev, newRow], invoiceValue)
    );
  };

  const deleteCharge = async (row) => {
    const chargeToDelete = chargeList.find((c) => c.rec_id === row.rec_id);
    if (!chargeToDelete) return;

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
  };

  const handleSave = async () => {
    if (!docketId) {
      console.warn("No docket selected to save charges.");
      return;
    }

    try {
      let added = 0;
      let updated = 0;

      for (const charge of chargeList) {
        if (charge.rec_id < 0) {
          await createCharge(docketId, {
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

      const updatedCharges = await fetchCharges(docketId);
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
    setChargeList((prev) => {
      const idx = prev.findIndex((r) => r.rec_id === recId);
      if (idx === -1) return prev;

      const updated = [...prev];
      const existingRow = updated[idx];
      const defaults = field === "charge_code" ? chargeDefaults[value] || {} : {};
      updated[idx] = { ...existingRow, ...defaults, [field]: value };

      // Mark dirty only for existing DB rows (positive rec_id)
      if (existingRow.rec_id > 0) {
        setDirtyRecIds((d) => new Set(d).add(existingRow.rec_id));
      }

      return recalculateChargeList(updated, invoiceValue);
    });
  };

  return (
    <div>
      <div style={sectionHeaderStyle}>
        <h3>Charges</h3>
        <div style={sectionActionsStyle}>
          <button type="button" onClick={addChargeRow} style={buttonStyle}>
            Add Charge
          </button>
          <button type="button" onClick={handleSave} style={buttonStyle}>
            Save
          </button>
        </div>
      </div>
      <DataTable
        columns={chargeColumns}
        rows={displayChargeList}
        getKey={(row) => row.rec_id}
        actions={[
          { label: "Delete", onClick: (row) => deleteCharge(row) },
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
