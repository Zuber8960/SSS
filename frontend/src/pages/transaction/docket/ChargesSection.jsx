import { useState, useEffect, useMemo } from "react";
import { DataTable } from "../../../components/common/MasterPage";
import { fetchCharges, createCharge, updateCharge, deleteCharge as deleteChargeApi } from "../../../utils/docket";

const chargeDescOptions = [
  "Freight",
  "Ser charge",
  "COF",
  "Freight On Value",
];

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
  const [chargeList, setChargeList] = useState([]);
  const [dirtyChargeIndexes, setDirtyChargeIndexes] = useState(new Set());

  // Fetch charges when docketId changes, clear dirty state
  useEffect(() => {
    if (docketId) {
      fetchCharges(docketId)
        .then((charges) => {
          setChargeList(charges);
          setDirtyChargeIndexes(new Set());
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


  // Recalculate derived charge amounts when invoiceValue changes — no useEffect needed
  const displayChargeList = useMemo(
    () => recalculateChargeList(chargeList, invoiceValue),
    [chargeList, invoiceValue]
  );

  // --- Handlers ---

  const addChargeRow = () => {
    const newRow = { charge_code: "Freight", ...chargeDefaults.Freight };
    setChargeList((prev) => {
      const next = [...prev, newRow];
      return recalculateChargeList(next, invoiceValue);
    });
    // New rows have no index-based id yet; mark by new length - 1 after update
    setDirtyChargeIndexes((prev) => {
      const next = new Set(prev);
      next.add("new");
      return next;
    });
  };

  const deleteCharge = async (row) => {
    const chargeToDelete = chargeList[row.id];
    if (!chargeToDelete || !chargeToDelete.id) {
      setChargeList((prev) =>
        recalculateChargeList(prev.filter((_, i) => i !== row.id), invoiceValue)
      );
      return;
    }
    try {
      await deleteChargeApi(chargeToDelete.id);
      setChargeList((prev) =>
        recalculateChargeList(prev.filter((_, i) => i !== row.id), invoiceValue)
      );
      setDirtyChargeIndexes((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete charge:", err);
    }
  };

  const handleSave = async () => {
    if (!docketId) {
      console.warn("No docket selected to save charges.");
      return;
    }

    try {
      for (let i = 0; i < chargeList.length; i++) {
        const charge = chargeList[i];
        const isDirty = dirtyChargeIndexes.has(i) || dirtyChargeIndexes.has("new");

        if (charge.id) {
          // Existing row — only PUT if it was actually edited
          if (isDirty) {
            await updateCharge(charge.id, {
              charge_code: charge.charge_code,
              user_code: charge.user_code,
              charge_amt: charge.charge_amt,
            });
          }
        } else {
          // New row — always POST
          await createCharge(docketId, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
        }
      }

      // Reload from server to get updated IDs and clear dirty state
      const updatedCharges = await fetchCharges(docketId);
      setChargeList(updatedCharges);
      setDirtyChargeIndexes(new Set());
    } catch (err) {
      console.error("Failed to save charges:", err);
    }
  };

  const updateChargeRow = (index, field, value) => {
    setDirtyChargeIndexes((prev) => new Set(prev).add(index));
    setChargeList((prev) => {
      const updated = [...prev];
      const existingRow = updated[index] || {};
      const defaults = field === "charge_code" ? chargeDefaults[value] || {} : {};
      updated[index] = { ...existingRow, ...defaults, [field]: value };
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
        getKey={(row, idx) => idx}
        actions={[
          { label: "Delete", onClick: (row) => deleteCharge(row) },
        ]}
        editable
        singleClick={singleClick}
        onCellChange={(rowIndex, key, value) =>
          updateChargeRow(rowIndex, key, value)
        }
      />
    </div>
  );
}
  