import { useEffect, useMemo, useState } from "react";
import { SaveIcon, ClearIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
} from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import {
  fetchJobApprovalBranches,
  fetchJobApprovalJobs,
  fetchJobApprovalJob,
  fetchJobApprovalVehicleCost,
  fetchJobApprovalHistory,
  saveJobApproval,
} from "../../utils/jobApproval";

const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiSelect-select": { fontSize: 13 },
  "& .MuiInputLabel-root": { fontSize: 13 },
};

function MuiSelect({ label, value, onChange, options, minWidth, disabled = false }) {
  return (
    <FormControl size="small" sx={{ ...fieldSx, minWidth: minWidth || 160 }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        sx={{ fontSize: 13 }}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value) || "blank"} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const money = (v) => n(v).toFixed(2);

// MUI v9 removed InputProps/InputLabelProps; read-only fields must use slotProps.
const readOnlySlot = { input: { readOnly: true } };

export default function JobApprovalPage() {
  const { dialog, closeAlert, showSuccess, showError } = useAlert();
  const [branches, setBranches] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [branch, setBranch] = useState("");
  const [jobDisp, setJobDisp] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [lines, setLines] = useState([]);
  const [vehRows, setVehRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(0);
  const [jobMeta, setJobMeta] = useState(null);

  const selectedBranch = branches.find((b) => b.branch_code === branch);

  const loadBranches = async () => {
    try {
      const data = await fetchJobApprovalBranches();
      setBranches(data);
    } catch (e) {
      showError(e.response?.data?.message || e.message || "Error loading branches");
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const clearForm = () => {
    setJobDisp("");
    setBulkAction("");
    setLines([]);
    setVehRows([]);
    setHistory([]);
    setHistoryFilter("");
    setHistoryPage(0);
    setJobMeta(null);
  };

  const onBranchChange = async (code) => {
    setBranch(code);
    clearForm();
    if (!code) {
      setJobs([]);
      return;
    }
    try {
      const data = await fetchJobApprovalJobs(code);
      setJobs(data);
    } catch (e) {
      showError(e.response?.data?.message || e.message || "Error loading jobs");
    }
  };

  const onJobChange = async (disp) => {
    setJobDisp(disp);
    setBulkAction("");
    setLines([]);
    setVehRows([]);
    setHistory([]);
    setJobMeta(null);
    if (!disp) return;
    try {
      const job = await fetchJobApprovalJob(disp);
      setJobMeta(job);
      setLines(
        (job.lines || []).map((l) => ({
          ...l,
          action: "A",
          revised_rate: l.revised_rate ?? l.rate_rm,
          revised_qty: l.revised_qty ?? l.quantity_rm,
          approvedamount: l.approvedamount ?? l.rm_app_amt,
          remark: l.remark || "",
        }))
      );
      const [cost, hist] = await Promise.all([
        fetchJobApprovalVehicleCost(job.lorry_no),
        fetchJobApprovalHistory(job.lorry_no),
      ]);
      setVehRows(cost);
      setHistory(hist);
    } catch (e) {
      showError(e.response?.data?.message || e.message || "Error loading job");
    }
  };

  const patchLine = (idx, patch) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const recalcApproved = (idx, next = {}) => {
    const row = { ...lines[idx], ...next };
    if (n(row.revised_rate) > n(row.rate_rm)) {
      showError("Revised Rate Should not be greater than actual rate!! ");
      patchLine(idx, { revised_rate: row.rate_rm, approvedamount: row.rm_app_amt, revised_qty: row.quantity_rm });
      return;
    }
    const app = n(row.revised_rate) * n(row.revised_qty);
    if (app > n(row.proposedamount)) {
      showError("Approved Amount Should not be greater than Proposed Amount!! ");
      patchLine(idx, { revised_rate: row.rate_rm, revised_qty: row.quantity_rm, approvedamount: row.rm_app_amt });
      return;
    }
    patchLine(idx, { ...next, approvedamount: app.toFixed(2) });
  };

  const recalcRm = (idx, next = {}) => {
    const row = { ...lines[idx], ...next };
    if (n(row.rate_rm) > n(row.rate)) {
      showError("Revised Rate Should not be greater than actual rate!! ");
      patchLine(idx, { rate_rm: row.rate, rm_app_amt: row.estimateamount, quantity_rm: row.quantity });
      return;
    }
    const amt = n(row.rate_rm) * n(row.quantity_rm);
    if (amt > n(row.proposedamount)) {
      showError("RM Approved Amount Should not be greater than Proposed Amount!! ");
      patchLine(idx, { rate_rm: row.rate_brn, quantity_rm: row.quantity, rm_app_amt: row.estimateamount });
      return;
    }
    patchLine(idx, { ...next, rm_app_amt: amt.toFixed(2) });
  };

  const onBulkAction = (v) => {
    setBulkAction(v);
    if (v === "1") setLines((prev) => prev.map((r) => ({ ...r, action: "A" })));
    if (v === "0") setLines((prev) => prev.map((r) => ({ ...r, action: "R" })));
  };

  const sums = useMemo(() => {
    let est = 0;
    let prop = 0;
    let rm = 0;
    let app = 0;
    for (const r of lines) {
      if (r.action !== "A") continue;
      est += n(r.estimateamount);
      prop += n(r.proposedamount);
      rm += n(r.rm_app_amt);
      app += n(r.approvedamount);
    }
    return { est, prop, rm, app };
  }, [lines]);

  const filteredHistory = history.filter((r) => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return true;
    return Object.values(r).some((v) => String(v || "").toLowerCase().includes(q));
  });

  const onSave = async () => {
    if (!branch) {
      showError("Please Select Branch !");
      return;
    }
    if (!jobDisp) {
      showError("Please Select JobCode !");
      return;
    }
    try {
      await saveJobApproval({
        job_disp: jobDisp,
        job_branch: branch,
        job_code: jobMeta?.job_code,
        job_date: jobMeta?.job_date,
        lorry_no: jobMeta?.lorry_no,
        lines: lines.map((l) => ({
          sr_no: l.sr_no,
          action: l.action,
          job_group_code: l.job_group_code,
          item_code: l.item_code,
          rate: l.rate,
          revised_rate: l.revised_rate,
          revised_qty: l.revised_qty,
          est_amt: l.estimateamount,
          prop_amt: l.proposedamount,
          approved_amt: l.approvedamount,
          rate_rm: l.rate_rm,
          quantity_rm: l.quantity_rm,
          rm_app_amt: l.rm_app_amt,
          remark: l.remark,
        })),
      });
      showSuccess("Record Saved");
      await onBranchChange(branch);
    } catch (e) {
      showError(e.response?.data?.message || e.message || "Data can not be inserted.");
    }
  };

  return (
    <MainLayout>
      <PageToolbar
        actions={[
          { label: "Save", icon: <SaveIcon />, onClick: onSave },
          { label: "Clear", icon: <ClearIcon />, onClick: () => onBranchChange(branch) },
        ]}
      />
      <PageBody title="Srs Job Approval">
        <FormPanel>
          <MuiSelect
            label="Fleet Branch"
            value={branch}
            minWidth={200}
            onChange={onBranchChange}
            options={[
              { value: "", label: "SELECT" },
              ...branches.map((b) => ({ value: b.branch_code, label: b.branchname })),
            ]}
          />
          <TextField
            label="Region"
            size="small"
            sx={{ ...fieldSx, minWidth: 140 }}
            value={selectedBranch?.region || jobMeta?.region || ""}
            slotProps={readOnlySlot}
          />
          <TextField
            label="Controlling"
            size="small"
            sx={{ ...fieldSx, minWidth: 160 }}
            value={selectedBranch?.cntrling || jobMeta?.cntrling || ""}
            slotProps={readOnlySlot}
          />
          <MuiSelect
            label="Job"
            value={jobDisp}
            minWidth={420}
            onChange={onJobChange}
            options={[
              { value: "", label: "SELECT" },
              ...jobs.map((j) => ({ value: j.disp, label: j.disp })),
            ]}
          />
        </FormPanel>

        {vehRows.length > 0 && (
          <div style={{ overflow: "auto", marginTop: 8, maxWidth: 900 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#6B696B", color: "#fff" }}>
                  <th style={{ padding: 6 }}>Ac Year</th>
                  <th style={{ padding: 6 }}>Year</th>
                  <th style={{ padding: 6 }}>Lorry No.</th>
                  <th style={{ padding: 6 }}>Make</th>
                  <th style={{ padding: 6 }}>Model</th>
                  <th style={{ padding: 6 }}>Body Type</th>
                  <th style={{ padding: 6 }}>Approved Tyre Amount</th>
                  <th style={{ padding: 6 }}>Approved Other Amount</th>
                </tr>
              </thead>
              <tbody>
                {vehRows.map((x) => (
                  <tr key={`${x.acYear}-${x.YEAR}`}>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.acYear}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.YEAR}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.lorryNo}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.make}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.model}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{x.bodyType}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{money(x.appTyreAmt)}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{money(x.appOthAmt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FormPanel>
          <MuiSelect
            label="--Select Action--"
            value={bulkAction}
            minWidth={170}
            onChange={onBulkAction}
            options={[
              { value: "", label: "--Select Action--" },
              { value: "1", label: "Approve" },
              { value: "0", label: "Reject" },
            ]}
          />
          <TextField label="Estimate Amt" size="small" sx={fieldSx} value={money(sums.est)} slotProps={readOnlySlot} />
          <TextField label="Proposed Amt" size="small" sx={fieldSx} value={money(sums.prop)} slotProps={readOnlySlot} />
          <TextField label="RM Approved Amt" size="small" sx={fieldSx} value={money(sums.rm)} slotProps={readOnlySlot} />
          <TextField label="Total Approved AMT" size="small" sx={fieldSx} value={money(sums.app)} slotProps={readOnlySlot} />
        </FormPanel>

        <div style={{ overflow: "auto", maxHeight: 350, border: "1px solid #ccc", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#6B696B", color: "#fff" }}>
                <th style={{ padding: 6 }}>Sr No</th>
                <th style={{ padding: 6 }}>Action</th>
                <th style={{ padding: 6 }}>Job Group</th>
                <th style={{ padding: 6 }}>Item Desc</th>
                <th style={{ padding: 6 }}>Rate</th>
                <th style={{ padding: 6 }}>BRN Prop Rate</th>
                <th style={{ padding: 6 }}>RM Approved Rate</th>
                <th style={{ padding: 6 }}>Revised Rate</th>
                <th style={{ padding: 6 }}>BRN Prop Qty</th>
                <th style={{ padding: 6 }}>RM Approved Qty</th>
                <th style={{ padding: 6 }}>Revised Qty</th>
                <th style={{ padding: 6 }}>RM Approved Amt</th>
                <th style={{ padding: 6 }}>Estimate Amt</th>
                <th style={{ padding: 6 }}>Proposed Amt(Fleet)</th>
                <th style={{ padding: 6 }}>Approved Amt</th>
                <th style={{ padding: 6 }}>Job Start Date</th>
                <th style={{ padding: 6 }}>Show</th>
                <th style={{ padding: 6 }}>Used Date</th>
                <th style={{ padding: 6 }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, idx) => (
                <tr
                  key={row.sr_no || idx}
                  style={{
                    background: row.delear_billing_code === "LC" ? "aqua" : idx % 2 ? "#fff" : "#F7F7DE",
                  }}
                >
                  <td style={{ padding: 4, textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                    <RadioGroup
                      row
                      value={row.action}
                      onChange={(e) => patchLine(idx, { action: e.target.value })}
                    >
                      <FormControlLabel value="A" control={<Radio size="small" />} label="Approve" />
                      <FormControlLabel value="R" control={<Radio size="small" />} label="Reject" />
                    </RadioGroup>
                  </td>
                  <td style={{ padding: 4, minWidth: 140 }}>
                    {row.job_group_code}
                    {row.item_group_desc ? ` > ${row.item_group_desc}` : ""}
                  </td>
                  <td style={{ padding: 4, minWidth: 180 }}>
                    {row.item_code} {row.item_desc ? ` > ${row.item_desc}` : ""}
                  </td>
                  <td style={{ padding: 4 }}>{row.rate}</td>
                  <td style={{ padding: 4 }}>{row.rate_brn}</td>
                  <td style={{ padding: 4 }}>
                    <TextField
                      size="small"
                      sx={{ width: 70, ...fieldSx }}
                      value={row.rate_rm}
                      onChange={(e) => patchLine(idx, { rate_rm: e.target.value })}
                      onBlur={() => recalcRm(idx)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField
                      size="small"
                      sx={{ width: 70, ...fieldSx }}
                      value={row.revised_rate}
                      onChange={(e) => patchLine(idx, { revised_rate: e.target.value })}
                      onBlur={() => recalcApproved(idx)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>{row.quantity}</td>
                  <td style={{ padding: 4 }}>
                    <TextField
                      size="small"
                      sx={{ width: 60, ...fieldSx }}
                      value={row.quantity_rm}
                      onChange={(e) => patchLine(idx, { quantity_rm: e.target.value })}
                      onBlur={() => recalcRm(idx)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField
                      size="small"
                      sx={{ width: 60, ...fieldSx }}
                      value={row.revised_qty}
                      onChange={(e) => patchLine(idx, { revised_qty: e.target.value })}
                      onBlur={() => recalcApproved(idx)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField size="small" sx={{ width: 80, ...fieldSx }} value={money(row.rm_app_amt)} slotProps={readOnlySlot} />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField size="small" sx={{ width: 80, ...fieldSx }} value={money(row.estimateamount)} slotProps={readOnlySlot} />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField size="small" sx={{ width: 80, ...fieldSx }} value={money(row.proposedamount)} slotProps={readOnlySlot} />
                  </td>
                  <td style={{ padding: 4 }}>
                    <TextField size="small" sx={{ width: 80, ...fieldSx }} value={money(row.approvedamount)} slotProps={readOnlySlot} />
                  </td>
                  <td style={{ padding: 4 }}>{row.job_start_date}</td>
                  <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                    <Button size="small" variant="outlined" onClick={() => showError("Scan/upload is not converted yet")}>Quot</Button>
                    <Button size="small" variant="outlined" sx={{ ml: 0.5 }} onClick={() => showError("Scan/upload is not converted yet")}>Image</Button>
                    <Button size="small" variant="outlined" sx={{ ml: 0.5 }} onClick={() => showError("Scan/upload is not converted yet")}>Doc</Button>
                  </td>
                  <td style={{ padding: 4 }}>{row.used_date}</td>
                  <td style={{ padding: 4 }}>
                    <TextField
                      size="small"
                      sx={{ width: 180, ...fieldSx }}
                      value={row.remark}
                      onChange={(e) => patchLine(idx, { remark: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, background: "#ffcc66", textAlign: "center", padding: 6, letterSpacing: 2, fontVariant: "small-caps" }}>
          Vehicle SRS History
        </div>
        <FormPanel>
          <TextField
            size="small"
            label="Filter text"
            sx={{ ...fieldSx, maxWidth: 240 }}
            value={historyFilter}
            onChange={(e) => {
              setHistoryFilter(e.target.value);
              setHistoryPage(0);
            }}
          />
          <MuiSelect
            label="Page size"
            value={pageSize}
            minWidth={90}
            onChange={(v) => setPageSize(Number(v))}
            options={[5, 10, 15, 20].map((p) => ({ value: p, label: String(p) }))}
          />
        </FormPanel>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Button size="small" disabled={historyPage === 0} onClick={() => setHistoryPage((p) => p - 1)}>Previous</Button>
          <span>{historyPage + 1}/{Math.max(1, Math.ceil(filteredHistory.length / pageSize))}</span>
          <Button
            size="small"
            disabled={historyPage >= Math.ceil(filteredHistory.length / pageSize) - 1}
            onClick={() => setHistoryPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
        <DataTable
          rows={filteredHistory.slice(historyPage * pageSize, historyPage * pageSize + pageSize)}
          getKey={(r) => r.id}
          autoHeight
          columns={[
            { key: "sr_no", label: "SR_No", minWidth: 70 },
            { key: "job_type", label: "Job_Type", minWidth: 140 },
            { key: "job_desc", label: "Job_Desc", minWidth: 160 },
            { key: "job_date", label: "Job_Date", minWidth: 110 },
            { key: "vendor_name", label: "Vendor_Name", minWidth: 140 },
            { key: "item", label: "Item", minWidth: 180 },
            { key: "quantity", label: "Quantity", minWidth: 90 },
            { key: "amount", label: "Amount", minWidth: 100 },
          ]}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
