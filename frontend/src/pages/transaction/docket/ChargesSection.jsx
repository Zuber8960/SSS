import { useState, useEffect } from "react";
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

export default function ChargesSection({
  docketId,
  invoiceValue,
  buttonStyle,
  sectionHeaderStyle,
  sectionActionsStyle,
  onChargesChange,
}) {
  const [chargeList, setChargeList] = useState([]);

  // Fetch charges when docketId changes
  useEffect(() => {
    if (docketId) {
      fetchCharges(docketId)
        .then(setChargeList)
        .catch(console.error);
    }
  }, [docketId]);

  // Recalculate charges when invoiceValue changes
  useEffect(() => {
    setChargeList((prev) => {
      const recalculated = recalculateChargeList(prev);
      return JSON.stringify(recalculated) === JSON.stringify(prev)
        ? prev
        : recalculated;
    });
  }, [invoiceValue]);

  // Notify parent of chargeList changes
  useEffect(() => {
    if (onChargesChange) {
      onChargesChange(chargeList);
    }
  }, [chargeList, onChargesChange]);

  // --- Calculation helpers (moved from Docket.jsx) ---

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const formatAmount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
  };

  const calculateFreightAmount = (row) => {
    return toNumber(row.user_code);
  };

  const getFreightAmount = (rows) => {
    const freightRow = rows.find((row) => row.charge_code === "Freight");
    return freightRow ? calculateFreightAmount(freightRow) : 0;
  };

  const calculateChargeRow = (row, rows) => {
    const chargeCode = row.charge_code;
    const userValue = toNumber(row.user_code);
    const invValue = toNumber(invoiceValue);
    let chargeAmount = 0;

    if (chargeCode === "Freight") {
      chargeAmount = calculateFreightAmount(row);
    } else if (chargeCode === "Ser charge") {
      chargeAmount = (getFreightAmount(rows) * userValue) / 100;
    } else if (chargeCode === "COF") {
      chargeAmount = invValue * userValue;
    } else if (chargeCode === "Freight On Value") {
      chargeAmount = (invValue * userValue) / 100;
    }

    return {
      ...row,
      charge_amt: formatAmount(chargeAmount),
    };
  };

  const recalculateChargeList = (rows) =>
    rows.map((row) => calculateChargeRow(row, rows));

  // --- Handlers ---

  const addChargeRow = () => {
    setChargeList((prev) => [
      ...prev,
      calculateChargeRow(
        { charge_code: "Freight", ...chargeDefaults.Freight },
        [...prev, { charge_code: "Freight", ...chargeDefaults.Freight }]
      ),
    ]);
  };

  const deleteCharge = async (row) => {
    const chargeToDelete = chargeList[row.id];
    if (!chargeToDelete || !chargeToDelete.id) {
      // If no server ID, just remove from local state
      setChargeList((prev) =>
        recalculateChargeList(prev.filter((_, index) => index !== row.id))
      );
      return;
    }

    try {
      await deleteChargeApi(chargeToDelete.id);
      setChargeList((prev) =>
        recalculateChargeList(prev.filter((_, index) => index !== row.id))
      );
    } catch (err) {
      console.error("Failed to delete charge:", err);
    }
  };

  const editCharge = () => {
    // Placeholder: could show info or open a modal
  };

  const handleSave = async () => {
    if (!docketId) {
      console.warn("No docket selected to save charges.");
      return;
    }

    try {
      for (const charge of chargeList) {
        if (charge.id) {
          // Existing charge - update via PUT
          await updateCharge(charge.id, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
        } else {
          // New charge - create via POST
          await createCharge(docketId, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
        }
      }

      // Reload charges from server to get updated IDs
      const updatedCharges = await fetchCharges(docketId);
      setChargeList(updatedCharges);
    } catch (err) {
      console.error("Failed to save charges:", err);
    }
  };

  const updateChargeRow = (index, field, value) => {
    setChargeList((prev) => {
      const updated = [...prev];
      const existingRow = updated[index] || {};
      const defaults =
        field === "charge_code" ? chargeDefaults[value] || {} : {};

      updated[index] = {
        ...existingRow,
        ...defaults,
        [field]: value,
      };

      return recalculateChargeList(updated);
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
        rows={chargeList}
        getKey={(row, idx) => idx}
        actions={[
          { label: "Edit", onClick: editCharge },
          { label: "Delete", onClick: (row) => deleteCharge(row) },
        ]}
        editable
        onCellChange={(rowIndex, key, value) =>
          updateChargeRow(rowIndex, key, value)
        }
      />
    </div>
  );
}