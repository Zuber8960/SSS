import { useEffect, useMemo, useState } from "react";
import { SaveIcon, ClearIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { PageBody, PageToolbar, FormPanel, ToggleSwitch } from "../../components/common/MasterPage";
import { FormControl, FormControlLabel, FormLabel, InputLabel, Select, MenuItem, Radio, RadioGroup, Autocomplete, TextField } from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllLocations, fetchLocationTowns } from "../../utils/locationMaster";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { previewAutoDocketNos, saveDocketPreAlloc, fetchPreAllocatedDockets } from "../../utils/docketPreAlloc";

const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiSelect-select": { fontSize: 13 },
  "& .MuiInputLabel-root": { fontSize: 13 },
};
const MAX_DOCKETS = 10;
const inputStyle = { fontSize: 12, height: 30, padding: "2px 4px", width: "100%", boxSizing: "border-box" };

function MuiSelect({ label, value, onChange, options, minWidth, disabled = false }) {
  return (
    <FormControl size="small" sx={{ ...fieldSx, minWidth: minWidth || 180 }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={String(opt.value) || "blank"} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function sessionUser() {
  try {
    return JSON.parse(localStorage.getItem("current_user") || "null") || {};
  } catch {
    return {};
  }
}

function errMsg(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

function blankRow(i, docket_no = "") {
  return {
    id: `pre-${i}`,
    docket_no,
    from_loc: "",
    from_town: "",
    to_loc: "",
    to_town: "",
  };
}

export default function DocketPreAllocPage() {
  const user = sessionUser();
  const locCode = user.loc_code || user.location_id || localStorage.getItem("loc_code") || "";
  const { dialog, closeAlert, showSuccess, showError } = useAlert();
  const [stationery, setStationery] = useState("P");
  const [customerCode, setCustomerCode] = useState("");
  const [countInput, setCountInput] = useState("1");
  const [rows, setRows] = useState(() => [blankRow(0)]);
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [townsByLoc, setTownsByLoc] = useState({});
  const [allocated, setAllocated] = useState([]);
  const [usedFilter, setUsedFilter] = useState("ALL");

  const customers = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const p of partners) {
      const code = String(p.bp_grp_code || "").trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      list.push({ value: code, label: `${code} > ${p.bp_name || ""}`, name: p.bp_name || "" });
    }
    return list;
  }, [partners]);

  const selectedCustomer = customers.find((c) => c.value === customerCode);

  const locOptions = useMemo(
    () => [
      { value: "", label: "[Select]" },
      ...locations.map((l) => ({
        value: l.loc_code,
        label: `${l.loc_code}${l.loc_name ? ` > ${l.loc_name}` : ""}`,
      })),
    ],
    [locations]
  );

  const townOptions = (loc) => {
    const list = townsByLoc[loc] || [];
    return [
      { value: "", label: "[Select]" },
      ...list.map((t) => ({
        value: t.town_name,
        label: t.town_name,
      })),
    ];
  };

  const loadTowns = async (loc) => {
    if (!loc || townsByLoc[loc]) return;
    try {
      const towns = await fetchLocationTowns(loc);
      setTownsByLoc((prev) => ({ ...prev, [loc]: Array.isArray(towns) ? towns : [] }));
    } catch {
      setTownsByLoc((prev) => ({ ...prev, [loc]: [] }));
    }
  };

  const loadAllocated = async (used = usedFilter) => {
    try {
      const data = await fetchPreAllocatedDockets({ used });
      setAllocated(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(errMsg(err, "Failed to load pre-allocated dockets"));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [locs, bps] = await Promise.all([fetchAllLocations(), fetchAllBusinessPartners()]);
        setLocations(Array.isArray(locs) ? locs : []);
        setPartners(Array.isArray(bps) ? bps : []);
        await loadAllocated("ALL");
      } catch (err) {
        showError(errMsg(err, "Failed to load masters"));
      }
    })();
  }, []);

  const rebuildRows = async (count, type = stationery, keep = rows) => {
    const n = Math.min(Math.max(Number(count) || 0, 0), MAX_DOCKETS);
    if (!n) {
      setRows([]);
      return;
    }
    let nos = keep.map((r) => r.docket_no);
    if (type === "A") {
      try {
        nos = await previewAutoDocketNos(locCode, n);
      } catch (err) {
        showError(errMsg(err, "Failed to generate docket numbers"));
        nos = Array.from({ length: n }, () => "");
      }
    }
    setRows(
      Array.from({ length: n }, (_, i) => ({
        ...blankRow(i, type === "A" ? nos[i] || "" : type === "P" ? keep[i]?.docket_no || "" : ""),
        from_loc: keep[i]?.from_loc || "",
        from_town: keep[i]?.from_town || "",
        to_loc: keep[i]?.to_loc || "",
        to_town: keep[i]?.to_town || "",
        docket_no: type === "A" ? nos[i] || "" : keep[i]?.docket_no || "",
      }))
    );
  };

  const onStationeryToggle = () => {
    const next = stationery === "A" ? "P" : "A";
    setStationery(next);
    rebuildRows(countInput, next);
  };

  const patchRow = (idx, patch) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const onFromLoc = (idx, loc) => {
    patchRow(idx, { from_loc: loc, from_town: "" });
    loadTowns(loc);
  };
  const onToLoc = (idx, loc) => {
    patchRow(idx, { to_loc: loc, to_town: "" });
    loadTowns(loc);
  };

  const clearForm = () => {
    setStationery("P");
    setCustomerCode("");
    setCountInput("1");
    setRows([blankRow(0)]);
  };

  const save = async () => {
    if (!customerCode) {
      showError("Please select Customer");
      return;
    }
    const n = Math.min(Number(countInput) || 0, MAX_DOCKETS);
    if (!n) {
      showError("Please enter Number of Dockets");
      return;
    }
    if (rows.length !== n) {
      await rebuildRows(n, stationery);
    }
    try {
      const result = await saveDocketPreAlloc({
        stationery_type: stationery,
        customer_code: customerCode,
        customer_name: selectedCustomer?.name || "",
        no_of_dockets: n,
        loc_code: locCode,
        lines: rows.slice(0, n),
      });
      showSuccess(`${result?.data?.count || n} docket(s) pre-allocated`);
      clearForm();
      await loadAllocated(usedFilter);
    } catch (err) {
      showError(errMsg(err, "Failed to save pre-allocation"));
    }
  };

  return (
    <MainLayout>
      <PageBody title="Docket Pre Allocation">
        <PageToolbar
          actions={[
            { label: "Save", icon: <SaveIcon />, onClick: save },
            { label: "Clear", icon: <ClearIcon />, onClick: clearForm },
          ]}
        />

        <FormPanel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40 }}>
            <span style={{ fontSize: 13, color: "#475569" }}>Stationery Type</span>
            <ToggleSwitch
              checked={stationery === "A"}
              onChange={onStationeryToggle}
              labelOff="Pre numbered"
              labelOn="Auto numbered"
            />
          </div>
          <Autocomplete
            size="small"
            sx={{ ...fieldSx, minWidth: 280 }}
            options={customers}
            value={selectedCustomer || null}
            getOptionLabel={(opt) => {
              if (!opt) return "";
              if (typeof opt === "string") return opt;
              return opt.label || `${opt.value || ""} > ${opt.name || ""}`;
            }}
            isOptionEqualToValue={(a, b) => a?.value === b?.value}
            filterOptions={(opts, state) => {
              const q = String(state.inputValue || "").trim().toLowerCase();
              if (!q) return opts;
              return opts.filter((o) => {
                const code = String(o.value || "").toLowerCase();
                const name = String(o.name || "").toLowerCase();
                const label = String(o.label || "").toLowerCase();
                return code.includes(q) || name.includes(q) || label.includes(q);
              });
            }}
            onChange={(_, v) => setCustomerCode(v?.value || "")}
            renderInput={(params) => (
              <TextField {...params} label="Customer" size="small" sx={fieldSx} placeholder="Search code or name" />
            )}
          />
          <MuiSelect
            label="No. of Dockets"
            value={String(Math.min(Number(countInput) || 1, MAX_DOCKETS))}
            minWidth={140}
            onChange={(v) => {
              setCountInput(v);
              rebuildRows(v, stationery);
            }}
            options={Array.from({ length: MAX_DOCKETS }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
          />
        </FormPanel>

        <div style={{ overflow: "auto", maxHeight: 420, border: "1px solid #ccc", marginTop: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#6B696B", color: "#fff" }}>
                <th style={{ padding: 6 }}>Sr</th>
                <th style={{ padding: 6 }}>Docket Number</th>
                <th style={{ padding: 6 }}>From Location</th>
                <th style={{ padding: 6 }}>From Town</th>
                <th style={{ padding: 6 }}>To Location</th>
                <th style={{ padding: 6 }}>To Town</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 ? "#fff" : "#F7F7DE" }}>
                  <td style={{ padding: 4, textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: 4, minWidth: 160 }}>
                    <input
                      style={inputStyle}
                      value={row.docket_no}
                      readOnly={stationery === "A"}
                      onChange={(e) => patchRow(idx, { docket_no: e.target.value.toUpperCase() })}
                    />
                  </td>
                  <td style={{ padding: 4, minWidth: 160 }}>
                    <select style={inputStyle} value={row.from_loc} onChange={(e) => onFromLoc(idx, e.target.value)}>
                      {locOptions.map((opt) => (
                        <option key={`f-${row.id}-${opt.value || "x"}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 4, minWidth: 140 }}>
                    <select style={inputStyle} value={row.from_town} onChange={(e) => patchRow(idx, { from_town: e.target.value })} disabled={!row.from_loc}>
                      {townOptions(row.from_loc).map((opt) => (
                        <option key={`ft-${row.id}-${opt.value || "x"}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 4, minWidth: 160 }}>
                    <select style={inputStyle} value={row.to_loc} onChange={(e) => onToLoc(idx, e.target.value)}>
                      {locOptions.map((opt) => (
                        <option key={`t-${row.id}-${opt.value || "x"}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 4, minWidth: 140 }}>
                    <select style={inputStyle} value={row.to_town} onChange={(e) => patchRow(idx, { to_town: e.target.value })} disabled={!row.to_loc}>
                      {townOptions(row.to_loc).map((opt) => (
                        <option key={`tt-${row.id}-${opt.value || "x"}`} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, background: "#ffcc66", textAlign: "center", padding: 6, letterSpacing: 2, fontVariant: "small-caps" }}>
          Pre Allocated Dockets
        </div>
        <FormPanel>
          <FormControl>
            <FormLabel sx={{ fontSize: 13 }}>Show</FormLabel>
            <RadioGroup
              row
              value={usedFilter}
              onChange={(e) => {
                const v = e.target.value;
                setUsedFilter(v);
                loadAllocated(v);
              }}
            >
              <FormControlLabel value="ALL" control={<Radio size="small" />} label="All" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="Unused" />
              <FormControlLabel value="Y" control={<Radio size="small" />} label="Used" />
            </RadioGroup>
          </FormControl>
        </FormPanel>
        <div style={{ overflow: "auto", maxHeight: 280, border: "1px solid #ccc", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#6B696B", color: "#fff" }}>
                <th style={{ padding: 6 }}>Docket Number</th>
                <th style={{ padding: 6 }}>Customer</th>
                <th style={{ padding: 6 }}>Stationery</th>
                <th style={{ padding: 6 }}>From Location</th>
                <th style={{ padding: 6 }}>From Town</th>
                <th style={{ padding: 6 }}>To Location</th>
                <th style={{ padding: 6 }}>To Town</th>
                <th style={{ padding: 6 }}>Used</th>
                <th style={{ padding: 6 }}>Allocated On</th>
              </tr>
            </thead>
            <tbody>
              {allocated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 8, textAlign: "center" }}>No pre-allocated dockets</td>
                </tr>
              ) : (
                allocated.map((r) => (
                  <tr key={r.record_id || r.docket_no} style={{ background: r.used_flag === "Y" ? "#fee2e2" : "#ecfdf5" }}>
                    <td style={{ padding: 6 }}>{r.docket_no}</td>
                    <td style={{ padding: 6 }}>{r.customer_code}{r.customer_name ? ` > ${r.customer_name}` : ""}</td>
                    <td style={{ padding: 6 }}>{r.stationery_label || r.stationery_type}</td>
                    <td style={{ padding: 6 }}>{r.from_loc}</td>
                    <td style={{ padding: 6 }}>{r.from_town}</td>
                    <td style={{ padding: 6 }}>{r.to_loc}</td>
                    <td style={{ padding: 6 }}>{r.to_town}</td>
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>{r.used_label || (r.used_flag === "Y" ? "USED" : "UNUSED")}</td>
                    <td style={{ padding: 6 }}>{r.aud_date ? String(r.aud_date).slice(0, 19).replace("T", " ") : ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
