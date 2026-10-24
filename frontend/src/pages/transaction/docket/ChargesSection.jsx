import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Typography, Box, TextField } from "@mui/material";

import {
  fetchChargeMaster,
  fetchCharges,
  createCharge,
  updateCharge,
} from "../../../utils/docket";
import useAlert from "../../../components/common/UseAlert";
import CommonAlertDialog from "../../../components/common/CommonAlertDialog";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normRateKey = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const matchChargeCode = (rateType, masterList) => {
  const key = normRateKey(rateType);
  if (!key) return null;
  if (key === "FREIGHT") return "DK01";
  const hit = (masterList || []).find((m) => {
    const desc = normRateKey(m.charge_desc);
    return desc === key || desc.startsWith(key) || key.startsWith(desc.replace("CHARGE", "")) || desc.includes(key);
  });
  return hit?.charge_code || null;
};

const formatAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const calculateChargeRow = (row, rows, invValue, docketRate = 0, rateUom = "", chargeWeight = 0, totalPkgs = 0, minFreightRate = 0) => {
  const inv = toNumber(invValue);
  let chargeAmount;
  let newUserCode = row.user_code;

  if (row.charge_code === "DK01") {
    // Rate auto-populated from docket rate field
    const rate = toNumber(docketRate);
    newUserCode = rate;
    if (rateUom === "Per KG") {
      chargeAmount = toNumber(chargeWeight) * rate;
    } else if (rateUom === "Fixed" || rateUom === "Per Trip") {
      chargeAmount = rate;
    } else if (rateUom === "Per Unit") {
      chargeAmount = toNumber(totalPkgs) * rate;
    } else if (rateUom === "Per Tonne") {
      chargeAmount = (toNumber(chargeWeight) / 1000) * rate;
    } else {
      chargeAmount = rate;
    }
    if (toNumber(minFreightRate) > 0) {
      chargeAmount = Math.max(chargeAmount, toNumber(minFreightRate));
    }
  } else if (row.charge_code === "DK02") {
    // Surcharge: user-entered rate % of DK01 charge amount
    const userValue = toNumber(row.user_code);
    const dk01Row = rows.find((r) => r.charge_code === "DK01");
    const dk01ChargeAmt = dk01Row ? toNumber(dk01Row.charge_amt) : 0;
    chargeAmount = (dk01ChargeAmt * userValue) / 100;
  } else if (row.charge_code === "DK03") {
    chargeAmount = (inv * toNumber(row.user_code)) / 100;
  } else if (row.charge_code === "DK04") {
    chargeAmount = (inv * toNumber(row.user_code))/100;
  } else {
    chargeAmount = toNumber(row.user_code);
  }

  return { ...row, user_code: newUserCode, charge_amt: formatAmount(chargeAmount) };
};

// Two-pass: DK01 first so its charge_amt is ready when DK02 is calculated
const recalculateChargeList = (rows, invValue, docketRate = 0, rateUom = "", chargeWeight = 0, totalPkgs = 0, minFreightRate = 0) => {
  const pass1 = rows.map((row) =>
    row.charge_code === "DK01"
      ? calculateChargeRow(row, rows, invValue, docketRate, rateUom, chargeWeight, totalPkgs, minFreightRate)
      : row
  );
  return pass1.map((row) =>
    row.charge_code !== "DK01"
      ? calculateChargeRow(row, pass1, invValue, docketRate, rateUom, chargeWeight, totalPkgs, minFreightRate)
      : row
  );
};

const ChargesSection = forwardRef(function ChargesSection({
  docketId,
  invoiceValue,
  docketRate = 0,
  rateUom = "",
  chargeWeight = 0,
  totalPkgs = 0,
  freightMinRate = 0,
  sectionHeaderStyle,
  onChargesChange,
  singleClick = false,
}, ref) {
  const { dialog, closeAlert, showSuccess, showError } = useAlert();
  const [chargeMaster, setChargeMaster] = useState([]);
  const [chargeList, setChargeList] = useState([]);
  const [dirtyRecIds, setDirtyRecIds] = useState(new Set());
  const tempIdCounter = useRef(-1);
  const chargesLoaded = useRef(false);
  const onChargesChangeRef = useRef(onChargesChange);
  onChargesChangeRef.current = onChargesChange;
  // Refs so effects always see the latest values without stale closures
  const chargeMasterRef = useRef([]);
  const docketIdRef = useRef(docketId);
  const invoiceValueRef = useRef(invoiceValue);
  const docketRateRef = useRef(docketRate);
  const rateUomRef = useRef(rateUom);
  const chargeWeightRef = useRef(chargeWeight);
  const totalPkgsRef = useRef(totalPkgs);
  const freightMinRateRef = useRef(freightMinRate);

  // Keep refs in sync with props on every render
  docketIdRef.current = docketId;
  invoiceValueRef.current = invoiceValue;
  docketRateRef.current = docketRate;
  rateUomRef.current = rateUom;
  chargeWeightRef.current = chargeWeight;
  totalPkgsRef.current = totalPkgs;
  freightMinRateRef.current = freightMinRate;

  const buildMasterRows = (master) =>
    recalculateChargeList(
      master.map((m) => ({
        rec_id: tempIdCounter.current--,
        charge_code: m.charge_code,
        user_code: m.default_rate ?? "",
      })),
      invoiceValueRef.current,
      docketRateRef.current,
      rateUomRef.current,
      chargeWeightRef.current,
      totalPkgsRef.current,
      freightMinRateRef.current,
    );

  const mergeSavedWithMaster = (saved, master) => {
    const list = Array.isArray(saved) ? saved : [];
    const masters = Array.isArray(master) ? master : [];
    const byCode = Object.fromEntries(list.map((r) => [r.charge_code, r]));
    const used = new Set();
    const rows = masters.map((m) => {
      used.add(m.charge_code);
      const existing = byCode[m.charge_code];
      if (existing) return existing;
      return {
        rec_id: tempIdCounter.current--,
        charge_code: m.charge_code,
        user_code: m.default_rate ?? "",
      };
    });
    list.forEach((r) => {
      if (!used.has(r.charge_code)) rows.push(r);
    });
    return recalculateChargeList(
      rows,
      invoiceValueRef.current,
      docketRateRef.current,
      rateUomRef.current,
      chargeWeightRef.current,
      totalPkgsRef.current,
      freightMinRateRef.current,
    );
  };

  // Load charge master once on mount
  useEffect(() => {
    fetchChargeMaster()
      .then((master) => {
        chargeMasterRef.current = master;
        setChargeMaster(master);
        if (!master.length) return;
        if (!docketIdRef.current) {
          setChargeList(buildMasterRows(master));
          chargesLoaded.current = true;
          return;
        }
        setChargeList((prev) => mergeSavedWithMaster(prev, master));
      })
      .catch(console.error);
  }, []);

  // Expose saveCharges, getChargeList, and reset to parent via ref
  useImperativeHandle(ref, () => ({
    getChargeList: () => chargeList.map((row) => {
      const master = chargeMasterRef.current.find((m) => m.charge_code === row.charge_code);
      return { ...row, charge_name: master ? master.charge_desc : row.charge_code };
    }),
    reset: () => {
      const master = chargeMasterRef.current;
      tempIdCounter.current = -1;
      setChargeList(
        master.length > 0
          ? recalculateChargeList(
              master.map((m) => ({
                rec_id: tempIdCounter.current--,
                charge_code: m.charge_code,
                user_code: m.default_rate ?? "",
              })),
              invoiceValueRef.current,
              docketRateRef.current,
              rateUomRef.current,
              chargeWeightRef.current,
              totalPkgsRef.current,
              freightMinRateRef.current,
            )
          : []
      );
      setDirtyRecIds(new Set());
    },
    applyCustRates: (items = [], extras = {}) => {
      const rate = extras.rate ?? docketRateRef.current;
      const uom = extras.rateUom ?? rateUomRef.current;
      const minRate = extras.minRate ?? freightMinRateRef.current;
      const master = chargeMasterRef.current;
      setChargeList((prev) => {
        const source = mergeSavedWithMaster(prev, master);
        const next = source.map((row) => {
          const item = items.find((it) => matchChargeCode(it.rate_type, master) === row.charge_code);
          if (!item) return row;
          const mappedUom = String(item.uom || "").toUpperCase();
          const isFixed = mappedUom.includes("FIX");
          const value = isFixed
            ? Math.max(toNumber(item.rate), toNumber(item.min_rate))
            : toNumber(item.rate);
          return { ...row, user_code: value };
        });
        const recalculated = recalculateChargeList(
          next,
          invoiceValueRef.current,
          rate,
          uom,
          chargeWeightRef.current,
          totalPkgsRef.current,
          minRate
        );
        setDirtyRecIds((d) => {
          const n = new Set(d);
          recalculated.forEach((r) => { if (r.rec_id > 0) n.add(r.rec_id); });
          return n;
        });
        return recalculated;
      });
    },
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
          //  console.log({
          //   charge_code: charge.charge_code,
          //   user_code: charge.user_code,
          //   charge_amt: charge.charge_amt
          // });
          await updateCharge(charge.rec_id, {
            charge_code: charge.charge_code,
            user_code: charge.user_code,
            charge_amt: charge.charge_amt,
          });
          updated++;
        }
      }

      const updatedCharges = await fetchCharges(targetDocketId);
      setChargeList(mergeSavedWithMaster(updatedCharges, chargeMasterRef.current));
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
      setDirtyRecIds(new Set());
      tempIdCounter.current = -1;
      // No docket loaded — show all master rows for a new entry
      const master = chargeMasterRef.current;
      if (master.length > 0) {
        setChargeList(buildMasterRows(master));
      } else {
        setChargeList([]);
      }
      chargesLoaded.current = true;
      return;
    }
    chargesLoaded.current = false;
    fetchCharges(docketId)
      .then((charges) => {
        chargesLoaded.current = true;
        const master = chargeMasterRef.current;
        setChargeList(mergeSavedWithMaster(charges, master.length ? master : []));
        setDirtyRecIds(new Set());
        tempIdCounter.current = -1;
      })
      .catch(console.error);
  }, [docketId]);

  // Recalculate whenever any docket field that affects charge amounts changes
  useEffect(() => {
    if (!chargesLoaded.current) return;
    setChargeList((prev) => {
      if (prev.length === 0) return prev;
      const recalculated = recalculateChargeList(prev, invoiceValue, docketRate, rateUom, chargeWeight, totalPkgs, freightMinRate);
      // Mark existing DB rows whose amount changed as dirty so saveCharges persists them
      const changedIds = recalculated
        .filter((r, i) => r.rec_id > 0 && r.charge_amt !== prev[i]?.charge_amt)
        .map((r) => r.rec_id);
      if (changedIds.length > 0) {
        setDirtyRecIds((d) => {
          const next = new Set(d);
          changedIds.forEach((id) => next.add(id));
          return next;
        });
      }
      return recalculated;
    });
  }, [invoiceValue, docketRate, rateUom, chargeWeight, totalPkgs, freightMinRate]);

  // Notify parent of chargeList changes (ref avoids making the callback a dependency)
  useEffect(() => {
    if (onChargesChangeRef.current) onChargesChangeRef.current(chargeList);
  }, [chargeList]);

  const chargeLabel = (m) => m.charge_desc;

  // Build dropdown options from charge master
  const chargeDescOptions = chargeMaster.map(chargeLabel);

  const chargeColumns = [
    { key: "charge_code", label: "Charge Desc", options: chargeDescOptions },
    { key: "user_code", label: "Rate", type: "number" },
    { key: "charge_amt", label: "Charge Amount", editable: false },
  ];

  // --- Handlers ---


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

    const recalculated = recalculateChargeList(updated, invoiceValue, docketRate, rateUom, chargeWeight, totalPkgs, freightMinRate);
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

  const totalChargeAmount = chargeList.reduce((sum, r) => sum + toNumber(r.charge_amt), 0);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fffefe",
        borderRadius: 12,
        border: "1px solid #e9e5f0",
        boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "6px 14px",
          background: "linear-gradient(135deg, #f6f3ff 0%, #f0ecf9 100%)",
          borderBottom: "1px solid #e9e5f0",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, fontSize: 12, color: "#4a3466", textTransform: "uppercase", letterSpacing: 0.4 }}
        >
          Charges
        </Typography>
      </Box>

      <div
        style={{
          flex: 1,
          background: "linear-gradient(180deg, #ffffff 0%, #fcfbff 100%)",
          overflow: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {chargeColumns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                    color: "#fff",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr
                key={row.rec_id}
                style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfbff" }}
              >
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #f3e8ff" }}>
                  <select
                    value={row.charge_code || ""}
                    onChange={(e) => updateChargeRow(row.rec_id, "charge_code", e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #e9d5ff",
                      borderRadius: 6,
                      padding: "4px 6px",
                      fontSize: 12,
                      background: "#fff",
                    }}
                  >
                    {!chargeDescOptions.includes(row.charge_code) && row.charge_code ? (
                      <option value={row.charge_code}>{row.charge_code}</option>
                    ) : null}
                    {chargeDescOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "4px 8px", borderBottom: "1px solid #f3e8ff" }}>
                  <input
                    type="number"
                    value={row.user_code ?? ""}
                    onChange={(e) => updateChargeRow(row.rec_id, "user_code", e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #e9d5ff",
                      borderRadius: 6,
                      padding: "4px 6px",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </td>
                <td style={{ padding: "4px 10px", borderBottom: "1px solid #f3e8ff", fontWeight: 600 }}>
                  {formatAmount(row.charge_amt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "8px 12px",
          borderTop: "1px solid #e9e5f0",
          background: "#faf7ff",
        }}
      >
        <TextField
          label="Total Charge Amount"
          value={formatAmount(totalChargeAmount)}
          size="small"
          slotProps={{ input: { readOnly: true } }}
          sx={{ width: 180 }}
        />
      </Box>
      <CommonAlertDialog
        dialog={dialog}
        onClose={closeAlert}
      />
    </div>
  );
});

export default ChargesSection;
