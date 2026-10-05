import { useEffect, useRef, useState } from "react";
import { SaveIcon, ViewIcon, ClearIcon } from "../../components/common/icons";
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

// Local (not UTC) calendar date — toISOString() rolls over to the previous day
// for users east of UTC during the evening hours.
const today = () => {
  const d = new Date();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${day}`;
};

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

  // Fixed-layout support: the page must fill the viewport without any
  // page-level vertical scroll, so the grid gets whatever height is left
  // after the toolbar and the form panel. Measured with a ResizeObserver so
  // it stays correct on window resize / zoom changes.
  const gridHostRef = useRef(null);
  const [gridHeight, setGridHeight] = useState(320);

  useEffect(() => {
    const host = gridHostRef.current;
    if (!host) return undefined;
    const measure = () => setGridHeight(Math.max(180, host.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

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
      setSelectedIds([]);
      return;
    }
    // In Annexure mode the backend filters on the annexure no., so it must be
    // chosen before the grid can be populated. Bail out instead of silently
    // returning the customer's entire pending-bill list.
    if (type === "A" && !annex) {
      setRows([]);
      setSelectedIds([]);
      return;
    }
    const data = await fetchPendingBills({
      loc_code: station,
      bp_code: customer,
      submit_type: type,
      annexure_no: annex || "",
    });
    const list = Array.isArray(data) ? data : [];
    setRows(list);
    // Annexure submissions cover the whole annexure, so every returned row
    // starts selected. The grid is controlled (rowSelectionModel), so the
    // checkboxes render in sync with this state.
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

  const onStationChange = (value) => {
    setLocCode(value);
    setBpCode("");
    setAnnexureNo("");
    setAnnexures([]);
    setRows([]);
    setSelectedIds([]);
  };

  const onCustomerChange = async (value) => {
    setBpCode(value);
    setAnnexureNo("");
    setRows([]);
    setSelectedIds([]);
    try {
      if (submitType === "A" && locCode && value) {
        const list = await fetchBillAnnexures({ loc_code: locCode, bp_code: value });
        setAnnexures(Array.isArray(list) ? list : []);
      }
      // In Annexure mode the grid stays empty until an annexure is picked.
      await loadBills(locCode, value, submitType, "");
    } catch (err) {
      showError(err.message || "Failed to load bills");
    }
  };

  const onTypeChange = async (value) => {
    setSubmitType(value);
    setAnnexureNo("");
    setRows([]);
    setSelectedIds([]);
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

  // Picking an annexure changes which bills belong to the grid, so reload it.
  const onAnnexureChange = async (value) => {
    setAnnexureNo(value);
    setRows([]);
    setSelectedIds([]);
    if (!value || !locCode || !bpCode) return;
    try {
      await loadBills(locCode, bpCode, submitType, value);
    } catch (err) {
      showError(err.message || "Failed to load bills");
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
    if (submitType === "A" && !annexureNo) {
      showError("Please select Annexure first");
      return;
    }
    const bills = rows.filter((r) => selectedIds.includes(r.id));
    if (!bills.length) {
      showError(
        rows.length
          ? "Please select at least one bill"
          : "No bills to submit. Please click Show first."
      );
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

  /*
   * MUI DataGrid v9 emits an OPTIMISED selection model: ticking the header
   * "select all" box returns { type: 'exclude', ids: Set{} } — an empty set
   * meaning "every row EXCEPT these". Reading only `model.ids` (as this page
   * originally did) therefore resolved that to [] and made Save report
   * "Please select at least one bill" while every checkbox was visibly ticked.
   *
   * Normalise both model shapes against the current row ids:
   *   include → ids are the selected rows
   *   exclude → ids are the UNselected rows
   */
  const onSelectionChange = (model) => {
    const allIds = rows.map((r) => r.id);
    if (!model) {
      setSelectedIds([]);
      return;
    }
    // Legacy / defensive: a plain array of ids.
    if (Array.isArray(model)) {
      setSelectedIds(model);
      return;
    }
    const ids = model.ids instanceof Set ? model.ids : new Set(model.ids || []);
    if (model.type === "exclude") {
      setSelectedIds(allIds.filter((id) => !ids.has(id)));
    } else {
      setSelectedIds(allIds.filter((id) => ids.has(id)));
    }
  };

  return (
    <MainLayout>
      <PageBody title="Bill Submission">
        {/* Fixed layout: the pageBody is capped to the viewport and the grid
            takes all remaining space, so the page never scrolls as a whole.
            Mirrors the approach already used by manifestUnloading.jsx. */}
        <style>{`
          .pageBody:has(.billSubmissionFixed) {
            height: calc(100vh - 125px);
            min-height: 0;
            padding-top: 12px;
            padding-bottom: 12px;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .billSubmissionFixed {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            height: 100%;
          }
          .billSubmissionFixed .formPanel {
            flex-shrink: 0;
          }
          .billSubmissionFixed .pageToolbar {
            flex-shrink: 0;
          }
          .billSubmissionGrid {
            flex: 1;
            min-height: 0;
          }
          .billSubmissionGrid .dataTableWrapper {
            margin-bottom: 0 !important;
          }
        `}</style>
        <div className="billSubmissionFixed">
          <PageToolbar
            actions={[
              { label: "Show", icon: <ViewIcon />, onClick: showBills },
              { label: "Save", icon: <SaveIcon />, onClick: save },
              { label: "Clear", icon: <ClearIcon />, onClick: clearForm },
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
            onChange={onAnnexureChange}
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

          <div className="billSubmissionGrid" ref={gridHostRef}>
            <DataTable
              checkboxSelection
              scroll={{ horizontal: true }}
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
              // Controlled selection keeps the checkboxes in sync with
              // selectedIds, which is what Save reads. Without this the grid
              // keeps its own internal model and the two drift apart.
              rowSelectionModel={selectedIds}
              onRowSelectionModelChange={onSelectionChange}
              isHeight={gridHeight}
            />
          </div>
        </div>
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
