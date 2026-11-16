import { useEffect, useRef, useState } from "react";
import moment from "moment";
import { SaveIcon, ViewIcon, ClearIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import {
  Box,
  Button,
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
import { fetchPendingBills, saveBillSubmission } from "../../utils/billSubmission";
import { getDateFormat } from "../../utils/tenantService";
import { getSessionLocCode } from "../../utils/authService";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };
const DEFAULT_FROM = "2026-01-01";

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

const today = () => {
  const d = new Date();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${day}`;
};

const showDate = (value) => {
  if (!value) return "";
  const parsed = moment(value, ["YYYY-MM-DD", moment.ISO_8601], true);
  return parsed.isValid() ? parsed.format(getDateFormat()) : value;
};

const sessionBranch = (locations) => {
  const code = String(getSessionLocCode() || "").split(" - ")[0].trim();
  return locations.some((row) => row.loc_code === code) ? code : "";
};

export default function BillSubmissionPage() {
  const [locations, setLocations] = useState([]);
  const [locCode, setLocCode] = useState("");
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(today());
  const [status, setStatus] = useState("U");
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const { dialog, closeAlert, showSuccess, showError } = useAlert();

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

  useEffect(() => {
    (async () => {
      try {
        const locs = await fetchAllLocations();
        const list = Array.isArray(locs) ? locs : [];
        setLocations(list);
        setLocCode(sessionBranch(list));
      } catch (err) {
        showError(err.message || "Failed to load branches");
      }
    })();
  }, []);

  const loadBills = async (filters = {}) => {
    const station = filters.locCode ?? locCode;
    const from = filters.fromDate ?? fromDate;
    const to = filters.toDate ?? toDate;
    const mode = filters.status ?? status;
    const data = await fetchPendingBills({
      loc_code: station,
      from_date: from,
      to_date: to,
      status: mode,
    });
    setRows(Array.isArray(data) ? data : []);
    setSelectedIds([]);
  };

  const showBills = async () => {
    if (!locCode) {
      showError("Please select Billing Branch");
      return;
    }
    if (!fromDate || !toDate) {
      showError("Please select From Date and To Date");
      return;
    }
    if (fromDate > toDate) {
      showError("From Date cannot be after To Date");
      return;
    }
    try {
      await loadBills();
    } catch (err) {
      showError(err.message || "Failed to show bills");
    }
  };

  const clearForm = () => {
    setLocCode(sessionBranch(locations));
    setFromDate(DEFAULT_FROM);
    setToDate(today());
    setStatus("U");
    setRows([]);
    setSelectedIds([]);
  };

  const updateRowField = (id, key, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const save = async () => {
    if (status !== "U") {
      showError("Submitted bills are already saved");
      return;
    }
    const bills = rows.filter((row) => selectedIds.includes(row.id));
    if (!bills.length) {
      showError(rows.length ? "Please select at least one bill" : "No bills to submit. Please click Show first.");
      return;
    }
    for (const bill of bills) {
      if (!bill.submission_date) {
        showError(`Please select Submission Date for bill ${bill.invoice_no}`);
        return;
      }
      if (bill.submission_date < bill.invoice_date) {
        showError(`Submission Date cannot be before Bill Date for bill ${bill.invoice_no}`);
        return;
      }
      const email = String(bill.email_id || "").trim();
      if (email && !email.includes("@")) {
        showError(`Please enter a valid Email ID for bill ${bill.invoice_no}`);
        return;
      }
    }
    try {
      const result = await saveBillSubmission({
        bills: bills.map((bill) => ({
          invoice_no: bill.invoice_no,
          invoice_date: bill.invoice_date,
          loc_code: bill.loc_code,
          submission_date: bill.submission_date,
          submit_to: String(bill.submit_to || "").trim(),
          email_id: String(bill.email_id || "").trim(),
          contact_no: String(bill.contact_no || "").trim(),
        })),
      });
      showSuccess(result?.message || `${result?.data?.saved || bills.length} record(s) saved`);
      await loadBills();
    } catch (err) {
      showError(err.message || "Failed to save");
    }
  };

  const onSelectionChange = (model) => {
    const allIds = rows.map((row) => row.id);
    if (!model) {
      setSelectedIds([]);
      return;
    }
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

  const entryField = (row, key, type = "text", required = false) => (
    <TextField
      size="small"
      type={type}
      fullWidth
      required={required}
      disabled={!!row.submitted}
      placeholder={row.submitted ? "" : required ? "Required" : "Optional"}
      value={row[key] || ""}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => updateRowField(row.id, key, event.target.value)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { maxLength: key === "contact_no" ? 30 : key === "email_id" ? 120 : 100 },
      }}
      sx={{
        "& .MuiInputBase-input": { fontSize: 12, padding: "5px 8px" },
        "& .MuiInputBase-input::placeholder": { color: required ? "#d32f2f" : "#6b7280", opacity: 1 },
      }}
    />
  );

  return (
    <MainLayout>
      <PageBody title="Bill Submission">
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
              { label: "Save", icon: <SaveIcon />, onClick: save },
              { label: "Clear", icon: <ClearIcon />, onClick: clearForm },
            ]}
          />

          <FormPanel>
            <MuiSelect
              label="Billing Branch"
              value={locCode}
              onChange={setLocCode}
              options={[
                { value: "", label: "[Select]" },
                ...locations.map((row) => ({
                  value: row.loc_code,
                  label: `${row.loc_code}${row.loc_name ? ` > ${row.loc_name}` : ""}`,
                })),
              ]}
            />
            <TextField
              size="small"
              label="From Date"
              type="date"
              fullWidth
              sx={fieldSx}
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="To Date"
              type="date"
              fullWidth
              sx={fieldSx}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl>
              <FormLabel sx={{ fontSize: 13 }}>Bills</FormLabel>
              <RadioGroup row value={status} onChange={(event) => setStatus(event.target.value)}>
                <FormControlLabel value="U" control={<Radio size="small" />} label="Unsubmitted" />
                <FormControlLabel value="S" control={<Radio size="small" />} label="Submitted" />
              </RadioGroup>
            </FormControl>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button variant="contained" startIcon={<ViewIcon />} onClick={showBills}>
                Show
              </Button>
            </Box>
          </FormPanel>

          <div className="billSubmissionGrid" ref={gridHostRef}>
            <DataTable
              checkboxSelection
              rowHeight={52}
              columns={[
                { key: "invoice_no", label: "Bill No.", minWidth: 90 },
                { key: "invoice_date", label: "Bill Date", minWidth: 110, render: (row) => showDate(row.invoice_date) },
                { key: "bp_name", label: "Customer", minWidth: 180, align: "left" },
                { key: "total_inv_amt", label: "Amount", minWidth: 110, align: "right" },
                { key: "submission_date", label: "Submission Date", mark: "required", minWidth: 170, render: (row) => entryField(row, "submission_date", "date", true) },
                { key: "submit_to", label: "Submitted To", mark: "optional", minWidth: 170, render: (row) => entryField(row, "submit_to") },
                { key: "contact_no", label: "Mobile No", mark: "optional", minWidth: 150, render: (row) => entryField(row, "contact_no") },
                { key: "email_id", label: "Email ID", mark: "optional", minWidth: 190, render: (row) => entryField(row, "email_id") },
              ]}
              rows={rows}
              getKey={(row) => row.id}
              rowSelectionModel={selectedIds}
              onRowSelectionModelChange={onSelectionChange}
              isRowSelectable={(params) => !params.row.submitted}
              isHeight={gridHeight}
            />
          </div>
        </div>
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
