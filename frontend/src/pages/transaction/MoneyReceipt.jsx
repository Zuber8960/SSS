import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete, Button, Chip, TextField,
} from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, FormField, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, PrintIcon, DeleteIcon, ClearIcon, EditIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchAllCompanies } from "../../utils/companyMaster";
import { getSessionLocCode } from "../../utils/authService";
import { printMoneyReceipt } from "../../components/common/MoneyReceiptPrint";
import {
  fetchMrBanks,
  fetchOutstandingDockets,
  fetchMoneyReceiptByNumber,
  saveMoneyReceipt,
  deleteMoneyReceipt,
} from "../../utils/moneyReceipt";
import moment from "moment";

const today = () => moment().format("YYYY-MM-DD");

const locCodeOf = (v) => String(v || "").split(" - ")[0].trim();

const sessionBranchLabel = (locations = []) => {
  const loc = String(getSessionLocCode() || "").trim();
  if (!loc) return "";
  const row = (locations || []).find((l) => String(l.loc_code || "").trim().toUpperCase() === loc.toUpperCase());
  return row?.loc_name ? `${loc} - ${row.loc_name}` : loc;
};

const PAY_MODES = ["CASH", "CHEQUE", "NEFT/RTGS", "UPI"];

const MR_REASONS = [
  { value: "1", label: "PAID BOOKING" },
  { value: "2", label: "TO PAY DELIVERY" },
  { value: "3", label: "BILL COLLECTION" },
  { value: "4", label: "OTHERS" },
];

const mrReasonLabel = (v) => MR_REASONS.find((r) => r.value === String(v))?.label || "";

const fieldSx = {
  "& .MuiInputBase-input": { fontSize: 11, fontWeight: 700 },
  "& .MuiInputLabel-root": { fontSize: 11, fontWeight: 700 },
};

const fmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const blankForm = (locations = []) => ({
  mr_no: "AUTO",
  mr_date: today(),
  loc_code: sessionBranchLabel(locations),
  customer: "",
  pay_mode: "CASH",
  instr_no: "",
  instr_date: "",
  bank_name: "",
  mr_reason: "",
  remarks: "",
  received_amt: "",
});

const docketColumns = [
  { key: "docket_no", label: "Docket No", minWidth: 130, align: "left" },
  { key: "docket_date", label: "Date", minWidth: 90 },
  { key: "loc_code", label: "From Loc", minWidth: 90 },
  { key: "docket_from_town", label: "From Town", minWidth: 140, align: "left", headerAlign: "left" },
  { key: "docket_to_loc", label: "To Loc", minWidth: 90 },
  { key: "docket_to_town", label: "To Town", minWidth: 140, align: "left", headerAlign: "left" },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 90 },
  { key: "party_name", label: "Party Name", minWidth: 260, align: "left", headerAlign: "left" },
  { key: "bill_amt", label: "Freight", minWidth: 90, align: "right" },
  { key: "sgst_amt", label: "SGST", minWidth: 80, align: "right" },
  { key: "cgst_amt", label: "CGST", minWidth: 80, align: "right" },
  { key: "igst_amt", label: "IGST", minWidth: 80, align: "right" },
  { key: "tds_amt", label: "TDS", minWidth: 90, editable: true, type: "number", align: "right" },
  { key: "deduction_amt", label: "Other Ded", minWidth: 100, editable: true, type: "number", align: "right" },
  { key: "net_received", label: "Net Received", minWidth: 120, align: "right" },
];

const gstStateKey = (gstin, stateName) => {
  const g = String(gstin || "").replace(/\s/g, "").toUpperCase();
  if (/^[0-9]{2}/.test(g) && g.length >= 2) return g.slice(0, 2);
  return String(stateName || "").trim().toUpperCase();
};

const gstOnFreight = (freight, customer, branch) => {
  const amt = Math.round(num(freight) * 0.18 * 100) / 100;
  const half = Math.round((amt / 2) * 100) / 100;
  const custKey = gstStateKey(customer?.bp_gstin, customer?.bp_state);
  const locKey = gstStateKey(branch?.loc_gstin || branch?.gstin_no, branch?.loc_state);
  const interState = Boolean(custKey && locKey && custKey !== locKey);
  if (interState) return { sgst_amt: "0.00", cgst_amt: "0.00", igst_amt: fmt(amt) };
  return { sgst_amt: fmt(half), cgst_amt: fmt(half), igst_amt: "0.00" };
};

const applyNet = (row, tdsVal, dedVal) => {
  const freight = num(row.bill_amt);
  const gst = num(row.sgst_amt) + num(row.cgst_amt) + num(row.igst_amt);
  const gross = Math.round((freight + gst) * 100) / 100;
  let tds = Math.max(0, num(tdsVal));
  let ded = Math.max(0, num(dedVal));
  if (tds + ded > gross) {
    if (tds > gross) {
      tds = gross;
      ded = 0;
    } else {
      ded = Math.round((gross - tds) * 100) / 100;
    }
  }
  const net = Math.round((gross - tds - ded) * 100) / 100;
  return {
    ...row,
    sgst_amt: fmt(row.sgst_amt),
    cgst_amt: fmt(row.cgst_amt),
    igst_amt: fmt(row.igst_amt),
    tds_amt: fmt(tds),
    deduction_amt: fmt(ded),
    net_received: fmt(net),
    received_amt: fmt(net),
  };
};

export default function MoneyReceipt() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [banks, setBanks] = useState([]);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(() => blankForm());
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState({ type: "include", ids: new Set() });
  const [editing, setEditing] = useState(null);
  const [editNoMode, setEditNoMode] = useState(false);

  useEffect(() => {
    fetchAllLocations().then((d) => {
      const list = Array.isArray(d) ? d : [];
      setLocations(list);
      setForm((prev) => ({ ...prev, loc_code: sessionBranchLabel(list) || prev.loc_code }));
    }).catch(() => {});
    fetchAllBusinessPartners().then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
    fetchMrBanks().then((d) => setBanks(Array.isArray(d) ? d : [])).catch(() => {});
    fetchAllCompanies().then((d) => { if (Array.isArray(d) && d.length) setCompany(d[0]); }).catch(() => {});
  }, []);

  const locCode = locCodeOf(form.loc_code) || getSessionLocCode();
  const loginLoc = useMemo(
    () => (locations || []).find((l) => String(l.loc_code || "").trim().toUpperCase() === String(locCode || "").toUpperCase()) || null,
    [locations, locCode]
  );
  const paidFull = form.mr_reason === "1";
  const showDocketGrid = (form.mr_reason === "1" || form.mr_reason === "2") && (Boolean(form.customer) || rows.length > 0);

  const customerOptions = useMemo(() => {
    const loc = String(locCode || "").toUpperCase();
    return partners
      .filter((p) => {
        const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return (!loc || !bpLoc || bpLoc === loc) && (p.bp_name || p.bp_grp_code || p.bp_code);
      })
      .map((p) => {
        const name = String(p.bp_name || "").trim();
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        return {
          value: String(p.record_id ?? p.bp_id ?? ""),
          code,
          name,
          label: code ? `${code} - ${name}` : name,
        };
      })
      .filter((o) => o.value);
  }, [partners, locCode]);

  const selectedCustomer = useMemo(
    () => partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(form.customer)) || null,
    [partners, form.customer]
  );

  const loadOutstanding = async (customer = selectedCustomer, reason = form.mr_reason) => {
    if (!customer || !locCode || (reason !== "1" && reason !== "2")) {
      setRows([]);
      setSelectedIds({ type: "include", ids: new Set() });
      return;
    }
    try {
      showLoading();
      const data = await fetchOutstandingDockets({
        loc_code: locCode,
        bp_code: customer.bp_grp_code || customer.bp_code || "",
        bp_name: customer.bp_name || "",
        bp_id: customer.record_id ?? customer.bp_id ?? "",
        mr_reason: reason,
      });
      setRows((Array.isArray(data) ? data : []).map((r) => applyNet({
        ...r,
        id: r.id || `${r.docket_no}_${r.docket_date}_${r.loc_code}`,
        ...gstOnFreight(r.bill_amt, customer, loginLoc),
      }, r.tds_amt, r.deduction_amt)));
      setSelectedIds({ type: "include", ids: new Set() });
    } catch (e) {
      showError(e.message || "Failed to load outstanding dockets");
      setRows([]);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    if (editing) return;
    if (!form.customer || !selectedCustomer || (form.mr_reason !== "1" && form.mr_reason !== "2")) {
      if (!form.customer || form.mr_reason === "3" || form.mr_reason === "4") {
        setRows([]);
        setSelectedIds({ type: "include", ids: new Set() });
      }
      return;
    }
    loadOutstanding(selectedCustomer, form.mr_reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, form.mr_reason, locCode, selectedCustomer, editing]);

  const selectedRows = useMemo(() => {
    const ids = selectedIds?.ids instanceof Set ? selectedIds.ids : new Set();
    return rows.filter((r) => ids.has(r.id));
  }, [rows, selectedIds]);

  const totals = useMemo(() => selectedRows.reduce((a, r) => {
    a.sgst += num(r.sgst_amt);
    a.cgst += num(r.cgst_amt);
    a.igst += num(r.igst_amt);
    a.tds += num(r.tds_amt);
    a.ded += num(r.deduction_amt);
    a.net += num(r.net_received);
    return a;
  }, { sgst: 0, cgst: 0, igst: 0, tds: 0, ded: 0, net: 0 }), [selectedRows]);

  const handleSetForm = (next) => {
    const prev = form;
    let updated = next;
    if (String(updated.pay_mode || "") === "CASH" && String(prev.pay_mode || "") !== "CASH") {
      updated = { ...updated, instr_no: "", instr_date: "", bank_name: "" };
    }
    setForm(updated);
  };

  const onSelect = (sm) => {
    const nextIds = sm?.ids instanceof Set ? sm.ids : new Set([...(sm?.ids ?? sm ?? [])]);
    setSelectedIds({ type: "include", ids: nextIds });
    setRows((prev) => prev.map((r) => applyNet(r, r.tds_amt, r.deduction_amt)));
  };

  const onCellChange = (id, field, value) => {
    const amt = fmt(value);
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const tds = field === "tds_amt" ? amt : r.tds_amt;
      const ded = field === "deduction_amt" ? amt : r.deduction_amt;
      return applyNet(r, tds, ded);
    }));
    if (["tds_amt", "deduction_amt"].includes(field)) {
      setSelectedIds((prev) => {
        const ids = prev?.ids instanceof Set ? new Set(prev.ids) : new Set();
        ids.add(id);
        return { type: "include", ids };
      });
    }
  };

  const handleClear = () => {
    setForm(blankForm(locations));
    setRows([]);
    setSelectedIds({ type: "include", ids: new Set() });
    setEditing(null);
    setEditNoMode(false);
  };

  const loadByNo = async () => {
    const no = String(form.mr_no || "").trim();
    if (!no || no.toUpperCase() === "AUTO") {
      showError("Enter a receipt number");
      return;
    }
    try {
      showLoading();
      const data = await fetchMoneyReceiptByNumber(no, locCode);
      if (!data) {
        showError("Receipt " + no + " not found for this branch");
        return;
      }
      const hdr = data.header ? data : data;
      const details = data.details || hdr.details || [];
      const partner = partners.find((p) => {
        const code = String(p.bp_grp_code ?? p.bp_code ?? "").trim();
        const id = String(p.record_id ?? p.bp_id ?? "").trim();
        const hdrCode = String(hdr.bp_code ?? "").trim();
        return (code && code === hdrCode)
          || (id && id === hdrCode)
          || String(p.bp_name || "").trim().toLowerCase() === String(hdr.bp_name || "").trim().toLowerCase();
      });
      setForm({
        mr_no: String(hdr.mr_no || "").trim(),
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : hdr.mr_date,
        loc_code: sessionBranchLabel(locations),
        customer: partner ? String(partner.record_id ?? partner.bp_id ?? "") : "",
        pay_mode: hdr.pay_mode || "CASH",
        instr_no: hdr.instr_no || "",
        instr_date: hdr.instr_date ? moment(hdr.instr_date).format("YYYY-MM-DD") : "",
        bank_name: hdr.bank_name || "",
        mr_reason: hdr.mr_reason != null && hdr.mr_reason !== "" ? String(hdr.mr_reason) : "",
        remarks: hdr.remarks || "",
        received_amt: fmt(hdr.received_amt),
      });
      const mapped = details
        .filter((d) => d.docket_no || d.invoice_no)
        .map((d) => applyNet({
          id: `${d.docket_no || d.invoice_no}_${moment(d.docket_date || d.invoice_date).format("YYYY-MM-DD")}_${d.docket_loc || d.invoice_loc}`,
          docket_no: d.docket_no || "",
          docket_date: d.docket_date ? moment(d.docket_date).format("YYYY-MM-DD") : "",
          loc_code: d.docket_loc || d.invoice_loc,
          docket_from_town: d.docket_from_town || d.docket_pickup_town || "",
          docket_to_loc: d.docket_to_loc || "",
          docket_to_town: d.docket_to_town || d.docket_dly_town || "",
          docket_pay_type: d.docket_pay_type || "",
          party_name: d.party_name || hdr.bp_name || "",
          bill_amt: fmt(d.bill_amt),
          sgst_amt: fmt(d.sgst_amt),
          cgst_amt: fmt(d.cgst_amt),
          igst_amt: fmt(d.igst_amt),
        }, d.tds_amt, d.deduction_amt));
      setRows(mapped);
      setSelectedIds({ type: "include", ids: new Set(mapped.map((r) => r.id)) });
      setEditing({
        mr_no: hdr.mr_no,
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : hdr.mr_date,
        loc_code: hdr.loc_code,
      });
      setEditNoMode(false);
      showSuccess("Receipt " + hdr.mr_no + " loaded");
    } catch (e) {
      showError(e.message || "Failed to load receipt");
    } finally {
      hideLoading();
    }
  };

  const handleEditClick = () => {
    if (!editNoMode) {
      setEditNoMode(true);
      setForm((prev) => ({ ...prev, mr_no: prev.mr_no === "AUTO" ? "" : String(prev.mr_no || "") }));
      return;
    }
    loadByNo();
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      showError("Please select a customer");
      return;
    }
    if (!form.mr_date) {
      showError("Please select receipt date");
      return;
    }
    if (!["1", "2", "3", "4"].includes(String(form.mr_reason))) {
      showError("Please select MR Reason");
      return;
    }
    if (form.pay_mode !== "CASH" && !form.instr_no) {
      showError("Enter cheque / UTR number");
      return;
    }
    const needsDetails = form.mr_reason === "1" || form.mr_reason === "2";
    const lines = selectedRows;
    if (needsDetails && !lines.length) {
      showError("Select at least one consignment");
      return;
    }
    const over = lines.find((r) => {
      const gross = num(r.bill_amt) + num(r.sgst_amt) + num(r.cgst_amt) + num(r.igst_amt);
      return num(r.tds_amt) + num(r.deduction_amt) - 0.009 > gross;
    });
    if (over) {
      showError(`TDS + Other Ded cannot exceed freight + GST for docket ${over.docket_no}`);
      return;
    }
    if (!needsDetails && num(form.received_amt) <= 0) {
      showError("Enter received amount");
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    try {
      showLoading();
      const result = await saveMoneyReceipt({
        header: {
          mr_no: editing?.mr_no || (form.mr_no && form.mr_no !== "AUTO" ? form.mr_no : null),
          mr_date: form.mr_date,
          loc_code: locCode,
          bp_code: selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? 0,
          bp_name: selectedCustomer.bp_name,
          pay_mode: form.pay_mode,
          instr_no: form.instr_no,
          instr_date: form.instr_date || null,
          bank_name: form.bank_name,
          mr_reason: Number(form.mr_reason),
          remarks: form.remarks,
          received_amt: needsDetails ? totals.net : form.received_amt,
          division_code: currentUser?.division_code ?? null,
        },
        details: needsDetails ? lines.map((r) => ({
          docket_no: r.docket_no,
          docket_date: r.docket_date,
          docket_loc: r.loc_code || locCode,
          bill_amt: r.bill_amt,
          sgst_amt: r.sgst_amt,
          cgst_amt: r.cgst_amt,
          igst_amt: r.igst_amt,
          received_amt: num(r.net_received),
          tds_amt: r.tds_amt,
          deduction_amt: r.deduction_amt,
        })) : [],
      });
      const hdr = result?.header || result;
      showSuccess("Money receipt " + hdr.mr_no + " saved");
      setForm((prev) => ({ ...prev, mr_no: String(hdr.mr_no || prev.mr_no).trim() }));
      setEditing({
        mr_no: hdr.mr_no,
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : form.mr_date,
        loc_code: hdr.loc_code || locCode,
      });
    } catch (e) {
      showError(e.message || "Failed to save receipt");
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async () => {
    if (!editing) {
      showError("Load a saved receipt before deleting");
      return;
    }
    try {
      showLoading();
      await deleteMoneyReceipt(editing.mr_no, editing.mr_date, editing.loc_code);
      showSuccess("Receipt deleted");
      handleClear();
    } catch (e) {
      showError(e.message || "Delete failed");
    } finally {
      hideLoading();
    }
  };

  const handlePrint = () => {
    if (!selectedCustomer && !form.mr_no) {
      showError("Nothing to print");
      return;
    }
    const paidOrToPay = form.mr_reason === "1" || form.mr_reason === "2";
    const lines = paidOrToPay
      ? (selectedRows.length ? selectedRows : rows)
      : [];
    try {
      printMoneyReceipt({
        receipt: {
          mr_no: form.mr_no,
          mr_date: form.mr_date,
          loc_code: locCode,
          loc_label: form.loc_code,
          bp_name: selectedCustomer?.bp_name || "",
          bp_code: selectedCustomer?.bp_grp_code || selectedCustomer?.bp_code || "",
          pay_mode: form.pay_mode,
          instr_no: form.instr_no,
          instr_date: form.instr_date,
          bank_name: form.bank_name,
          remarks: form.remarks,
          mr_reason_label: mrReasonLabel(form.mr_reason),
          received_amt: paidOrToPay ? totals.net : form.received_amt,
        },
        details: lines,
        company,
        locationsMap: Object.fromEntries(locations.map((l) => [l.loc_code, l])),
        customer: selectedCustomer,
      });
    } catch (e) {
      showError(e.message || "Popup blocked");
    }
  };

  const cash = form.pay_mode === "CASH";

  return (
    <MainLayout>
      <PageBody title="Money Receipt">
        <div className="pageToolbar" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick} sx={btn("#7e22ce", "#6b21a8")}>Edit</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={btn("#1ca562", "#119154")}>Save</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={btn("#1f6feb", "#1d4ed8")}>Print</Button>
          <Button variant="contained" startIcon={<DeleteIcon />} onClick={handleDelete} sx={btn("#dc2626", "#b91c1c")}>Delete</Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={btn("#8c98ab", "#6a7280")}>Clear</Button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8 }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, color: "#0d6efd", background: "#dfeeff" }}>
            Receipt Information
            {editNoMode && <Chip size="small" label="Enter receipt no, then click Edit again" sx={{ ml: 2, fontWeight: 700 }} />}
            {editing && <Chip size="small" label={`Editing MR ${editing.mr_no}`} sx={{ ml: 2, bgcolor: "#f3e8ff", fontWeight: 700 }} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "12px 14px", padding: 16, background: "#f8fafc" }}>
            <FormField label="MR No" name="mr_no" form={form} setForm={handleSetForm} disabled={!editNoMode} />
            <FormField label="MR Date" name="mr_date" type="date" form={form} setForm={handleSetForm} required />
            <FormField label="Branch" name="loc_code" form={form} setForm={handleSetForm} disabled />
            <FormField label="MR Reason" name="mr_reason" form={form} setForm={handleSetForm} options={MR_REASONS} required />
            <FormField label="Pay Mode" name="pay_mode" form={form} setForm={handleSetForm} options={PAY_MODES} required />
            <FormField label="Cheque / UTR No" name="instr_no" form={form} setForm={handleSetForm} disabled={cash} />
            <FormField label="Instrument Date" name="instr_date" type="date" form={form} setForm={handleSetForm} disabled={cash} />
            <div style={{ gridColumn: "span 5" }}>
              <Autocomplete
                size="small"
                options={banks.map((b) => b.bank_name).filter(Boolean)}
                value={form.bank_name || null}
                disabled={cash}
                onChange={(_, v) => handleSetForm({ ...form, bank_name: v || "" })}
                renderInput={(p) => <TextField {...p} label="Bank" size="small" sx={fieldSx} />}
              />
            </div>
            <div style={{ gridColumn: "span 3" }}>
              <Autocomplete
                size="small"
                options={customerOptions}
                value={customerOptions.find((o) => String(o.value) === String(form.customer)) || null}
                getOptionLabel={(o) => (typeof o === "string" ? o : (o?.label || ""))}
                isOptionEqualToValue={(a, b) => String(a?.value ?? a) === String(b?.value ?? b)}
                onChange={(_, v) => {
                  handleSetForm({ ...form, customer: v?.value || "" });
                  setEditing(null);
                  if (!v || (form.mr_reason !== "1" && form.mr_reason !== "2")) {
                    setRows([]);
                    setSelectedIds({ type: "include", ids: new Set() });
                    return;
                  }
                  const cust = partners.find((p) => String(p.record_id ?? p.bp_id ?? "") === String(v.value))
                    || { record_id: v.value, bp_id: v.value, bp_grp_code: v.code, bp_code: v.code, bp_name: v.name };
                  loadOutstanding(cust, form.mr_reason);
                }}
                renderInput={(p) => <TextField {...p} label="Customer" size="small" sx={fieldSx} placeholder="Search code or name" />}
              />
            </div>
            <div style={{ gridColumn: showDocketGrid ? "span 2" : "span 2" }}>
              <FormField label="Remarks" name="remarks" form={form} setForm={handleSetForm} />
            </div>
            {showDocketGrid ? (
              <TextField
                label="Total Net Receipt"
                size="small"
                value={fmt(totals.net)}
                disabled
                sx={fieldSx}
              />
            ) : (
              <FormField label="Received Amount" name="received_amt" form={form} setForm={handleSetForm} />
            )}
          </div>
        </div>

        {showDocketGrid && (
        <div style={{ marginTop: 12, padding: "8px 14px", background: "#e3f2fd", border: "1.5px solid #90caf9", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#0d6efd" }}>
          Total Net Receipt {fmt(totals.net)} &nbsp;|&nbsp; SGST {fmt(totals.sgst)} &nbsp;|&nbsp; CGST {fmt(totals.cgst)} &nbsp;|&nbsp; IGST {fmt(totals.igst)} &nbsp;|&nbsp; TDS {fmt(totals.tds)} &nbsp;|&nbsp; Other Ded {fmt(totals.ded)} &nbsp;|&nbsp; {selectedRows.length} consignment(s)
          {paidFull ? " — PAID: one-time full clearance" : " — TO PAY: delivered at this To Loc, consignee = customer"}
        </div>
        )}

        {showDocketGrid && (
        <div style={{ marginTop: 10 }}>
          <DataTable
            columns={docketColumns}
            rows={rows}
            getKey={(r) => r.id}
            dense
            rowHeight={42}
            headerHeight={44}
            autoHeight={false}
            isHeight={360}
            scroll={{ horizontal: true }}
            checkboxSelection
            selectedRowColor="#dcfce7"
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={onSelect}
            singleClick
            onCellChange={onCellChange}
          />
        </div>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Working..." />
      </PageBody>
    </MainLayout>
  );
}

const btn = (from, to) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "110px",
  "&:hover": { opacity: 0.92, background: `linear-gradient(135deg, ${from}, ${to})` },
});
