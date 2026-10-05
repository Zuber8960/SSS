import { useEffect, useState } from "react";
import { SaveIcon } from "../../components/common/icons";
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
  FormControlLabel,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
} from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import {
  fetchPendingBills,
  fetchBillAnnexures,
  saveBillSubmission,
} from "../../utils/billSubmission";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/app\/?$/, "");

function resolvePodUrl(url) {
  if (!url) return "";
  if (/^blob:/i.test(url)) return "";
  if (/^(data:|https?:)/i.test(url)) {
    const m = String(url).match(/\/uploads\/pod\/([^/?#]+)/i);
    if (m) return `${API_BASE}/app/public/pod-file/${m[1]}`;
    return url;
  }
  if (/^\/?uploads\/pod\//i.test(url)) {
    return `${API_BASE}/app/public/pod-file/${url.replace(/^\/?uploads\/pod\//i, "")}`;
  }
  return `${API_BASE}/app/public/pod-file/${String(url).replace(/^\/+/, "")}`;
}

export default function BillSubmissionPage() {
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [locCode, setLocCode] = useState("");
  const [bpCode, setBpCode] = useState("");
  const [submitType, setSubmitType] = useState("B");
  const [annexureNo, setAnnexureNo] = useState("");
  const [annexures, setAnnexures] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submissionDate, setSubmissionDate] = useState(today());
  const [submitTo, setSubmitTo] = useState("");
  const [emailId, setEmailId] = useState("");
  const [contactNo, setContactNo] = useState("");
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

  const byLoc = partners.filter((p) => !locCode || p.loc_code === locCode);
  const source = byLoc.length ? byLoc : partners;
  const seenCust = new Set();
  const customers = [];
  for (const p of source) {
    const code = String(p.bp_grp_code || "").trim();
    if (!code || seenCust.has(code)) continue;
    seenCust.add(code);
    customers.push({
      value: code,
      label: `${code} > ${p.bp_name || ""}`,
    });
  }

  const loadBills = async (station = locCode, customer = bpCode, type = submitType, annex = annexureNo) => {
    if (!station || !customer) {
      setRows([]);
      return;
    }
    const data = await fetchPendingBills({
      loc_code: station,
      bp_code: customer,
      submit_type: type,
      annexure_no: annex,
    });
    const list = Array.isArray(data) ? data : [];
    setRows(list);
    setSelectedIds(type === "A" ? list.map((r) => r.id) : []);
  };

  useEffect(() => {
    (async () => {
      try {
        const [locs, bps] = await Promise.all([fetchAllLocations(), fetchAllBusinessPartners()]);
        setLocations(Array.isArray(locs) ? locs : []);
        setPartners(Array.isArray(bps) ? bps : []);
      } catch (err) {
        showError(err.message || "Failed to load masters");
      }
    })();
  }, []);

  const onStationChange = async (value) => {
    setLocCode(value);
    setBpCode("");
    setAnnexureNo("");
    setAnnexures([]);
    setRows([]);
  };

  const onCustomerChange = async (value) => {
    setBpCode(value);
    setAnnexureNo("");
    try {
      if (submitType === "A" && locCode && value) {
        const list = await fetchBillAnnexures({ loc_code: locCode, bp_code: value });
        setAnnexures(Array.isArray(list) ? list : []);
      }
      await loadBills(locCode, value, submitType, "");
    } catch (err) {
      showError(err.message || "Failed to load bills");
    }
  };

  const onTypeChange = async (value) => {
    setSubmitType(value);
    setAnnexureNo("");
    setRows([]);
    try {
      if (value === "A" && locCode && bpCode) {
        const list = await fetchBillAnnexures({ loc_code: locCode, bp_code: bpCode });
        setAnnexures(Array.isArray(list) ? list : []);
      } else {
        setAnnexures([]);
        if (locCode && bpCode) await loadBills(locCode, bpCode, value, "");
      }
    } catch (err) {
      showError(err.message || "Failed to load annexures");
    }
  };

  const showBills = async () => {
    if (!locCode) {
      showError("Please select Billing Station");
      return;
    }
    if (!bpCode) {
      showError("Please select Customer");
      return;
    }
    if (submitType === "A" && !annexureNo) {
      showError("Please select Annexure first");
      return;
    }
    try {
      await loadBills(locCode, bpCode, submitType, annexureNo);
    } catch (err) {
      showError(err.message || "Failed to show bills");
    }
  };

  const clearForm = () => {
    setLocCode("");
    setBpCode("");
    setSubmitType("B");
    setAnnexureNo("");
    setAnnexures([]);
    setRows([]);
    setSelectedIds([]);
    setSubmissionDate(today());
    setSubmitTo("");
    setEmailId("");
    setContactNo("");
  };

  const save = async () => {
    if (!submissionDate) {
      showError("Please enter Submission Date");
      return;
    }
    if (!submitTo.trim()) {
      showError("Please enter Submit To");
      return;
    }
    if (!emailId.trim() || !emailId.includes("@")) {
      showError("Please enter a valid Email ID");
      return;
    }
    const bills = rows.filter((r) => selectedIds.includes(r.id));
    if (!bills.length) {
      showError("Please select at least one bill");
      return;
    }
    try {
      const result = await saveBillSubmission({
        bills,
        submission_date: submissionDate,
        submit_to: submitTo.trim(),
        email_id: emailId.trim(),
        contact_no: contactNo.trim(),
        submit_type: submitType,
        annexure_no: annexureNo || null,
      });
      showSuccess(result?.message || `${result?.data?.saved || bills.length} record(s) saved`);
      await loadBills();
    } catch (err) {
      showError(err.message || "Failed to save");
    }
  };

  const onSelectionChange = (model) => {
    if (Array.isArray(model)) setSelectedIds(model);
    else if (model?.ids) setSelectedIds(Array.from(model.ids));
    else setSelectedIds([]);
  };

  return (
    <MainLayout>
      <PageBody title="Bill Submission">
        <PageToolbar
          actions={[
            { label: "Show", onClick: showBills },
            { label: "Save", icon: <SaveIcon />, onClick: save },
            { label: "Clear", onClick: clearForm },
          ]}
        />

        <FormPanel>
          <MuiSelect
            label="Billing Station"
            value={locCode}
            onChange={onStationChange}
            options={[
              { value: "", label: "[Select]" },
              ...locations.map((l) => ({
                value: l.loc_code,
                label: `${l.loc_code}${l.loc_name ? ` > ${l.loc_name}` : ""}`,
              })),
            ]}
          />
          <MuiSelect
            label="Customer"
            value={bpCode}
            onChange={onCustomerChange}
            options={[{ value: "", label: "Select" }, ...customers]}
          />
          <FormControl>
            <FormLabel sx={{ fontSize: 13 }}>Bill Submission Type</FormLabel>
            <RadioGroup row value={submitType} onChange={(e) => onTypeChange(e.target.value)}>
              <FormControlLabel value="B" control={<Radio size="small" />} label="Bill" />
              <FormControlLabel value="A" control={<Radio size="small" />} label="Annexure" />
            </RadioGroup>
          </FormControl>
          <MuiSelect
            label="Annexure"
            value={annexureNo}
            onChange={setAnnexureNo}
            disabled={submitType !== "A"}
            options={[
              { value: "", label: "Select" },
              ...annexures.map((a) => ({ value: a.annexure_no, label: a.label })),
            ]}
          />
          <TextField
            size="small"
            label="Submission Date"
            type="date"
            fullWidth
            sx={fieldSx}
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            label="Submit To (Name)"
            fullWidth
            sx={fieldSx}
            value={submitTo}
            onChange={(e) => setSubmitTo(e.target.value)}
          />
          <TextField
            size="small"
            label="Email ID"
            fullWidth
            sx={fieldSx}
            value={emailId}
            onChange={(e) => setEmailId(e.target.value)}
          />
          <TextField
            size="small"
            label="Contact No."
            fullWidth
            sx={fieldSx}
            slotProps={{ htmlInput: { maxLength: 23 } }}
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value)}
          />
        </FormPanel>

        <DataTable
          checkboxSelection
          columns={[
            { key: "invoice_no", label: "Bill No." },
            { key: "invoice_date", label: "Bill Date" },
            { key: "loc_code", label: "Branch Code" },
            { key: "sr_no", label: "Sr. No." },
            { key: "docket_no", label: "CNS No." },
            { key: "docket_date", label: "CNS Date" },
            { key: "docket_from_loc", label: "CNS Branch" },
            { key: "docket_to_loc", label: "Dly Station" },
            {
              key: "pod_url",
              label: "POD",
              minWidth: 180,
              render: (row) => {
                const href = resolvePodUrl(row.pod_url);
                if (!href) return "—";
                return (
                  <a href={href} target="_blank" rel="noreferrer" style={{ color: "#6d28d9", fontSize: 12 }}>
                    {row.pod_url}
                  </a>
                );
              },
            },
          ]}
          rows={rows}
          getKey={(row) => row.id}
          onRowSelectionModelChange={onSelectionChange}
          isHeight={320}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
