import { useEffect, useMemo, useState } from "react";
import { SaveIcon, ClearIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import { PageBody, PageToolbar, FormPanel } from "../../components/common/MasterPage";
import {
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  Button,
} from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllItemGroups } from "../../utils/itemGroupMaster";
import { fetchAllItems } from "../../utils/itemMaster";
import {
  lookupJobCardLorry,
  fetchJobCardHistory,
  fetchJobCardLorries,
  saveJobCard,
} from "../../utils/jobCard";

const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiSelect-select": { fontSize: 13 },
  "& .MuiInputLabel-root": { fontSize: 13 },
};

function MuiSelect({ label, value, onChange, options, disabled = false, minWidth }) {
  return (
    <FormControl size="small" sx={{ ...fieldSx, minWidth: minWidth || 120 }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        sx={{ fontSize: 13 }}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const LINE_COUNTS = Array.from({ length: 21 }, (_, i) => 50 + i * 5);
const inputStyle = { fontSize: 12, height: 28, padding: "2px 4px", width: "100%", boxSizing: "border-box" };

// MUI v9 removed InputProps/InputLabelProps; read-only fields must use slotProps.
const readOnlySlot = { input: { readOnly: true } };

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

function blankLine(i) {
  return {
    id: `line-${i}`,
    job_group_code: "",
    item_code: "",
    item_desc: "",
    gst_rate: "",
    rate: 0,
    rate_brn: 0,
    quantity: 0,
    estimateamount: 0,
    proposedamount: 0,
    job_start: today(),
    start_hr: "00",
    start_min: "00",
    estimatetime: 0,
    labour: 0,
  };
}

function makeLines(n) {
  return Array.from({ length: n }, (_, i) => blankLine(i));
}

function recalc(line) {
  const qty = Number(line.quantity) || 0;
  const rate = Number(line.rate) || 0;
  const rev = Number(line.rate_brn) || 0;
  return {
    ...line,
    estimateamount: Number((qty * rate).toFixed(2)),
    proposedamount: Number((qty * rev).toFixed(2)),
  };
}

function parseLorryNo(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes(">")) {
    const parts = s.split(">").map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[1] : parts[0];
  }
  return s;
}

export default function JobCardCreationPage() {
  const user = sessionUser();
  const locCode = user.loc_code || user.location_id || localStorage.getItem("loc_code") || "";
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [lineCount, setLineCount] = useState(50);
  const [lines, setLines] = useState(() => makeLines(50));
  const [form, setForm] = useState({
    lorry_no: "",
    job_no: "",
    job_date: today(),
    km_from: "",
    branch: locCode,
    make: "",
    driver_code: "",
    engine_no: "",
    chassis_no: "",
    vehicle_type: "N/A",
    job_type_code: "N",
    supervisor_code: user.user_id || user.userId || "",
    supervisor_name: user.user_name || user.userName || "",
  });
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, i, lorryList] = await Promise.all([
          fetchAllItemGroups(),
          fetchAllItems(),
          fetchJobCardLorries(locCode),
        ]);
        if (cancelled) return;
        setGroups(Array.isArray(g) ? g : []);
        setItems(Array.isArray(i) ? i : []);
        setLorries(Array.isArray(lorryList) ? lorryList : []);
      } catch (err) {
        if (!cancelled) showError(errMsg(err, "Failed to load item masters"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupOptions = useMemo(() => {
    const filtered =
      form.job_type_code === "AMC"
        ? groups.filter((g) => String(g.item_group_code) === "1030")
        : groups.filter((g) => String(g.item_group_code) !== "1030" && String(g.item_group_code) !== "7777");
    return [
      { value: "", label: "[Select]" },
      ...filtered.map((g) => ({
        value: g.item_group_code,
        label: `${g.item_group_code} > ${g.item_group_desc || ""}`,
      })),
    ];
  }, [groups, form.job_type_code]);

  const itemsByGroup = (code) => items.filter((it) => String(it.item_group_code) === String(code));

  const totEst = lines.reduce((s, l) => s + (Number(l.estimateamount) || 0), 0);
  const totProp = lines.reduce((s, l) => s + (Number(l.proposedamount) || 0), 0);

  const onLineCount = (n) => {
    const count = Number(n) || 50;
    setLineCount(count);
    setLines((prev) => {
      if (count > prev.length) return [...prev, ...makeLines(count - prev.length).map((row, i) => ({ ...row, id: `line-${prev.length + i}` }))];
      return prev.slice(0, count);
    });
  };

  const onJobType = (value) => {
    setForm((p) => ({ ...p, job_type_code: value }));
    setLines(makeLines(lineCount));
  };

  const patchLine = (idx, patch) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? recalc({ ...row, ...patch }) : row)));
  };

  const onGroupChange = (idx, groupCode) => {
    patchLine(idx, {
      job_group_code: groupCode,
      item_code: "",
      item_desc: "",
      gst_rate: "",
      rate: 0,
      rate_brn: 0,
      labour: 0,
      quantity: 0,
    });
  };

  const onItemChange = (idx, itemCode) => {
    const line = lines[idx];
    const item = itemsByGroup(line.job_group_code).find((it) => String(it.item_code) === String(itemCode));
    const rate = Number(item?.rate) || 0;
    patchLine(idx, {
      item_code: itemCode,
      item_desc: item?.item_desc || "",
      gst_rate: item?.gst_rate ?? "",
      rate,
      rate_brn: rate,
      labour: Number(item?.labor) || 0,
    });
  };

  const lookupLorry = async (rawNo) => {
    const no = parseLorryNo(rawNo ?? form.lorry_no);
    if (!no) {
      showError("Please enter Lorry No");
      return;
    }
    try {
      const data = await lookupJobCardLorry(no, locCode);
      setForm((p) => ({
        ...p,
        lorry_no: data.lorry_no || no,
        job_no: data.job_code || p.job_no,
        job_date: today(),
        km_from: data.km_from === "" || data.km_from == null ? p.km_from : data.km_from,
        branch: data.branch || locCode,
        make: data.make || "",
        engine_no: data.engine_no || "",
        chassis_no: data.chassis_no || "",
        vehicle_type: data.vehicle_type || "N/A",
        supervisor_code: p.supervisor_code || user.user_id || user.userId || "",
        supervisor_name: p.supervisor_name || user.user_name || user.userName || "",
      }));
      const hist = await fetchJobCardHistory(data.lorry_no || no);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      setHistory([]);
      setForm((p) => ({
        ...p,
        lorry_no: "",
        make: "",
        engine_no: "",
        chassis_no: "",
        branch: locCode,
        km_from: "",
        job_no: "",
      }));
      showError(errMsg(err, "Lorry No is not Exist!!!"));
    }
  };

  const clearForm = () => {
    const u = sessionUser();
    setForm({
      lorry_no: "",
      job_no: "",
      job_date: today(),
      km_from: "",
      branch: u.loc_code || locCode,
      make: "",
      driver_code: "",
      engine_no: "",
      chassis_no: "",
      vehicle_type: "N/A",
      job_type_code: "N",
      supervisor_code: u.user_id || u.userId || "",
      supervisor_name: u.user_name || u.userName || "",
    });
    setLineCount(50);
    setLines(makeLines(50));
    setHistory([]);
    setHistoryFilter("");
  };

  const save = async () => {
    if (!String(form.lorry_no || "").trim()) {
      showError("Please enter Lorry No");
      return;
    }
    if (!String(form.driver_code || "").trim()) {
      showError("Please enter Driver Name");
      return;
    }
    if (!form.job_date) {
      showError("Please enter Job Date");
      return;
    }
    const filled = lines.filter((l) => l.job_group_code && l.item_code);
    if (!filled.length) {
      showError("Please fill at least one job group and item");
      return;
    }
    if (filled.some((l) => !l.job_start)) {
      showError("Please fill Job Start Date on all selected rows");
      return;
    }
    try {
      const result = await saveJobCard({
        lorry_no: String(form.lorry_no).trim(),
        job_branch: form.branch || locCode,
        job_date: form.job_date,
        km_from: form.km_from,
        driver_code: form.driver_code,
        vehicle_made: form.make,
        chassis_no: form.chassis_no,
        engine_no: form.engine_no,
        vehicle_type: form.vehicle_type,
        job_type_code: form.job_type_code,
        job_supervisor_code: form.supervisor_code,
        job_supervisor_name: form.supervisor_name,
        lines: filled,
      });
      showSuccess(`Job card ${result?.data?.job_code || ""} saved`);
      clearForm();
    } catch (err) {
      showError(errMsg(err, "Failed to save job card"));
    }
  };

  const histRows = history.filter((r) => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return true;
    return Object.values(r).some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <MainLayout>
      <PageBody title="Job Card Creation">
        <PageToolbar
          actions={[
            { label: "Save", icon: <SaveIcon />, onClick: save },
            { label: "Clear", icon: <ClearIcon />, onClick: clearForm },
          ]}
        />

        <FormPanel>
          <TextField
            label="Lorry No"
            size="small"
            sx={fieldSx}
            value={form.lorry_no}
            onChange={(e) => setField("lorry_no", e.target.value.toUpperCase())}
            onBlur={() => parseLorryNo(form.lorry_no) && lookupLorry(form.lorry_no)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookupLorry(form.lorry_no);
              }
            }}
            slotProps={{ htmlInput: { list: "job-card-lorry-list" } }}
          />
          <datalist id="job-card-lorry-list">
            {lorries.map((l) => (
              <option key={l.vehicle_no || l.label} value={l.label || l.vehicle_no} />
            ))}
          </datalist>
          <TextField label="Job No." size="small" sx={fieldSx} value={form.job_no} slotProps={readOnlySlot} />
          <TextField
            label="Job Date"
            type="date"
            size="small"
            sx={fieldSx}
            value={form.job_date}
            slotProps={{ ...readOnlySlot, inputLabel: { shrink: true } }}
          />
          <TextField label="Kms" size="small" sx={fieldSx} value={form.km_from} onChange={(e) => setField("km_from", e.target.value)} />
          <TextField label="Branch" size="small" sx={fieldSx} value={form.branch} slotProps={readOnlySlot} />
          <TextField label="MAKE" size="small" sx={fieldSx} value={form.make} slotProps={readOnlySlot} />
          <TextField
            label="Driver Name"
            size="small"
            sx={fieldSx}
            value={form.driver_code}
            onChange={(e) => setField("driver_code", e.target.value.toUpperCase())}
          />
          <TextField
            label="Supervisor"
            size="small"
            sx={fieldSx}
            value={`${form.supervisor_code || ""}${form.supervisor_name ? `  ${form.supervisor_name}` : ""}`}
            slotProps={readOnlySlot}
          />
          <FormControl>
            <FormLabel sx={{ fontSize: 13 }}>Job Type</FormLabel>
            <RadioGroup row value={form.job_type_code} onChange={(e) => onJobType(e.target.value)}>
              <FormControlLabel value="PM" control={<Radio size="small" />} label="Preventive Maintenance" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="Normal" />
              <FormControlLabel value="A" control={<Radio size="small" />} label="Accidental" />
              <FormControlLabel value="AMC" control={<Radio size="small" />} label="AMC Charges" />
            </RadioGroup>
          </FormControl>
          <TextField label="Total Est Amt" size="small" sx={fieldSx} value={totEst.toFixed(2)} slotProps={readOnlySlot} />
          <MuiSelect
            label="Approx Items"
            value={String(lineCount)}
            onChange={onLineCount}
            options={LINE_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          />
          <TextField label="Total Proposed Amt" size="small" sx={fieldSx} value={totProp.toFixed(2)} slotProps={readOnlySlot} />
        </FormPanel>

        <div style={{ overflow: "auto", maxHeight: 380, border: "1px solid #ccc", marginTop: 8, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#6B696B", color: "#fff" }}>
                <th style={{ padding: 6 }}>Sr</th>
                <th style={{ padding: 6 }}>Job Group</th>
                <th style={{ padding: 6 }}>Item Desc</th>
                <th style={{ padding: 6 }}>Rate</th>
                <th style={{ padding: 6 }}>Revised Rate</th>
                <th style={{ padding: 6 }}>Qty</th>
                <th style={{ padding: 6 }}>Estimate Amount</th>
                <th style={{ padding: 6 }}>Proposed Amount</th>
                <th style={{ padding: 6 }}>Job Start Date</th>
                <th style={{ padding: 6 }}>Est Time</th>
                <th style={{ padding: 6 }}>Labour Charge</th>
                <th style={{ padding: 6 }}>Scan/Upload</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const rowItems = itemsByGroup(line.job_group_code);
                return (
                  <tr key={line.id} style={{ background: idx % 2 ? "#fff" : "#F7F7DE" }}>
                    <td style={{ padding: 4, textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: 4, minWidth: 160 }}>
                      <select value={line.job_group_code} onChange={(e) => onGroupChange(idx, e.target.value)} style={inputStyle}>
                        {groupOptions.map((opt) => (
                          <option key={`${line.id}-${opt.value || "blank"}`} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 4, minWidth: 220 }}>
                      <select
                        value={line.item_code}
                        onChange={(e) => onItemChange(idx, e.target.value)}
                        disabled={!line.job_group_code}
                        style={inputStyle}
                      >
                        <option value="">[Select]</option>
                        {rowItems.map((it) => (
                          <option key={it.item_code} value={it.item_code}>
                            {`${it.item_code} > ${it.item_desc || ""} > ${it.gst_rate ?? ""}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 4, textAlign: "right" }}>{Number(line.rate) || 0}</td>
                    <td style={{ padding: 4 }}>
                      <input style={{ ...inputStyle, width: 80 }} value={line.rate_brn} onChange={(e) => patchLine(idx, { rate_brn: e.target.value })} />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input style={{ ...inputStyle, width: 60 }} value={line.quantity} onChange={(e) => patchLine(idx, { quantity: e.target.value })} />
                    </td>
                    <td style={{ padding: 4, textAlign: "right" }}>{Number(line.estimateamount).toFixed(2)}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>{Number(line.proposedamount).toFixed(2)}</td>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                      <input
                        type="date"
                        style={{ ...inputStyle, width: 130 }}
                        value={line.job_start}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v && v > today()) {
                            showError("Date can't be greater than Current Date !");
                            patchLine(idx, { job_start: "" });
                            return;
                          }
                          patchLine(idx, { job_start: v });
                        }}
                      />
                      <select value={line.start_hr} onChange={(e) => patchLine(idx, { start_hr: e.target.value })} style={{ ...inputStyle, width: 52, marginLeft: 4 }}>
                        {HOURS.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select value={line.start_min} onChange={(e) => patchLine(idx, { start_min: e.target.value })} style={{ ...inputStyle, width: 52, marginLeft: 4 }}>
                        {MINS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 4 }}>
                      <input style={{ ...inputStyle, width: 70 }} value={line.estimatetime} onChange={(e) => patchLine(idx, { estimatetime: e.target.value })} />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input style={{ ...inputStyle, width: 80 }} value={line.labour} onChange={(e) => patchLine(idx, { labour: e.target.value })} />
                    </td>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                      <Button size="small" variant="outlined" onClick={() => showError("Scan/upload is not converted yet")}>Quot</Button>
                      <Button size="small" variant="outlined" sx={{ ml: 0.5 }} onClick={() => showError("Scan/upload is not converted yet")}>Image</Button>
                      <Button size="small" variant="outlined" sx={{ ml: 0.5 }} onClick={() => showError("Scan/upload is not converted yet")}>Doc</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, background: "#ffcc66", textAlign: "center", padding: 6, letterSpacing: 2, fontVariant: "small-caps" }}>
          Vehicle SRS History
        </div>
        <TextField
          size="small"
          label="Filter text"
          sx={{ ...fieldSx, maxWidth: 240, mt: 1, mb: 1 }}
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
        />
        <div style={{ overflow: "auto", maxHeight: 260, border: "1px solid #ccc", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#6B696B", color: "#fff" }}>
                <th style={{ padding: 6 }}>SR_No</th>
                <th style={{ padding: 6 }}>Job_Type</th>
                <th style={{ padding: 6 }}>Job_Desc</th>
                <th style={{ padding: 6 }}>Job_Date</th>
                <th style={{ padding: 6 }}>Vendor_Name</th>
                <th style={{ padding: 6 }}>Item</th>
                <th style={{ padding: 6 }}>Quantity</th>
                <th style={{ padding: 6 }}>Amount</th>
                <th style={{ padding: 6 }}>Km_From</th>
                <th style={{ padding: 6 }}>Item_Life</th>
                <th style={{ padding: 6 }}>Due_Kms</th>
              </tr>
            </thead>
            <tbody>
              {histRows.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 8, textAlign: "center" }}>No history</td>
                </tr>
              ) : (
                histRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: 6, textAlign: "center" }}>{r.sr_no}</td>
                    <td style={{ padding: 6 }}>{r.job_type}</td>
                    <td style={{ padding: 6 }}>{r.job_desc}</td>
                    <td style={{ padding: 6 }}>{r.job_date}</td>
                    <td style={{ padding: 6 }}>{r.vendor_name}</td>
                    <td style={{ padding: 6 }}>{r.item}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{r.quantity}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{r.amount}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{r.km_from}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{r.item_life}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{r.due_kms}</td>
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
