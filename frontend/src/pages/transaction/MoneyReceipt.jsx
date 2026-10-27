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
import { getSessionLocCode } from "../../utils/authService";
import {
  fetchMrBanks,
  fetchOutstandingInvoices,
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
  remarks: "",
});

const columns = [
  { key: "invoice_no", label: "Inv No", minWidth: 80, align: "left" },
  { key: "invoice_date", label: "Inv Date", minWidth: 90 },
  { key: "bill_amt", label: "Bill Amt", minWidth: 90 },
  { key: "already_received", label: "Already Recd", minWidth: 100 },
  { key: "balance", label: "Balance", minWidth: 90 },
  { key: "received_amt", label: "This Receipt", minWidth: 100, editable: true },
  { key: "tds_amt", label: "TDS", minWidth: 80, editable: true },
  { key: "deduction_amt", label: "Deduction", minWidth: 90, editable: true },
];

export default function MoneyReceipt() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [banks, setBanks] = useState([]);
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
  }, []);

  const locCode = locCodeOf(form.loc_code) || getSessionLocCode();

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

  const loadOutstanding = async (customer = selectedCustomer) => {
    if (!customer || !locCode) {
      setRows([]);
      return;
    }
    try {
      showLoading();
      const data = await fetchOutstandingInvoices({
        loc_code: locCode,
        bp_code: customer.bp_grp_code || customer.bp_code || "",
        bp_name: customer.bp_name || "",
      });
      setRows(Array.isArray(data) ? data : []);
      setSelectedIds({ type: "include", ids: new Set() });
    } catch (e) {
      showError(e.message || "Failed to load outstanding bills");
      setRows([]);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    if (editing) return;
    if (!form.customer || !selectedCustomer) {
      setRows([]);
      return;
    }
    loadOutstanding(selectedCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, locCode, editing]);

  const selectedRows = useMemo(() => {
    const ids = selectedIds?.ids instanceof Set ? selectedIds.ids : new Set();
    return rows.filter((r) => ids.has(r.id));
  }, [rows, selectedIds]);

  const totals = useMemo(() => selectedRows.reduce((a, r) => {
    a.received += num(r.received_amt);
    a.tds += num(r.tds_amt);
    a.ded += num(r.deduction_amt);
    return a;
  }, { received: 0, tds: 0, ded: 0 }), [selectedRows]);

  const handleSetForm = (next) => setForm(next);

  const onSelect = (sm) => {
    const nextIds = sm?.ids instanceof Set ? sm.ids : new Set([...(sm?.ids ?? sm ?? [])]);
    setSelectedIds({ type: "include", ids: nextIds });
    setRows((prev) => prev.map((r) => {
      if (!nextIds.has(r.id)) return { ...r, received_amt: "0.00" };
      if (num(r.received_amt) > 0) return r;
      return { ...r, received_amt: r.balance };
    }));
  };

  const onCellChange = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: fmt(value) } : r)));
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
        return (code && code === String(hdr.bp_code || "").trim())
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
        remarks: hdr.remarks || "",
      });
      const mapped = details.map((d) => ({
        id: `${d.invoice_no}_${moment(d.invoice_date).format("YYYY-MM-DD")}_${d.invoice_loc}`,
        invoice_no: String(Math.trunc(num(d.invoice_no))),
        invoice_date: moment(d.invoice_date).isValid() ? moment(d.invoice_date).format("YYYY-MM-DD") : d.invoice_date,
        loc_code: d.invoice_loc,
        bill_amt: fmt(d.bill_amt),
        already_received: "0.00",
        balance: fmt(d.bill_amt),
        received_amt: fmt(d.received_amt),
        tds_amt: fmt(d.tds_amt),
        deduction_amt: fmt(d.deduction_amt),
      }));
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
    if (form.pay_mode !== "CASH" && !form.instr_no) {
      showError("Enter cheque / UTR number");
      return;
    }
    const lines = selectedRows.filter((r) => num(r.received_amt) > 0 || num(r.tds_amt) > 0 || num(r.deduction_amt) > 0);
    if (!lines.length) {
      showError("Tick bills and enter This Receipt amount");
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
          remarks: form.remarks,
          division_code: currentUser?.division_code ?? null,
        },
        details: lines.map((r) => ({
          invoice_no: r.invoice_no,
          invoice_date: r.invoice_date,
          invoice_loc: r.loc_code || locCode,
          bill_amt: r.bill_amt,
          received_amt: r.received_amt,
          tds_amt: r.tds_amt,
          deduction_amt: r.deduction_amt,
        })),
      });
      const hdr = result?.header || result;
      showSuccess("Money receipt " + hdr.mr_no + " saved");
      setForm((prev) => ({ ...prev, mr_no: String(hdr.mr_no || prev.mr_no).trim() }));
      setEditing({
        mr_no: hdr.mr_no,
        mr_date: moment(hdr.mr_date).isValid() ? moment(hdr.mr_date).format("YYYY-MM-DD") : form.mr_date,
        loc_code: hdr.loc_code || locCode,
      });
      await loadOutstanding(selectedCustomer);
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
    const lines = (selectedRows.length ? selectedRows : rows).filter((r) => num(r.received_amt) > 0);
    const html = `<!DOCTYPE html><html><head><title>MR ${form.mr_no}</title>
      <style>@page{size:A4 landscape;margin:10mm} body{font-family:Arial;font-size:12px}
      table{width:100%;border-collapse:collapse} th,td{border:1px solid #999;padding:4px}</style></head><body>
      <h2>Money Receipt ${form.mr_no === "AUTO" ? "" : form.mr_no}</h2>
      <p>Date: ${form.mr_date} &nbsp; Branch: ${form.loc_code}</p>
      <p>Customer: ${selectedCustomer ? `${selectedCustomer.bp_grp_code || selectedCustomer.bp_code || ""} - ${selectedCustomer.bp_name}` : ""}</p>
      <p>Mode: ${form.pay_mode} ${form.instr_no ? `&nbsp; Instrument: ${form.instr_no}` : ""} ${form.bank_name || ""}</p>
      <table><tr><th>Inv No</th><th>Date</th><th>Bill Amt</th><th>Received</th><th>TDS</th><th>Deduction</th></tr>
      ${lines.map((r) => `<tr><td>${r.invoice_no}</td><td>${r.invoice_date}</td><td>${r.bill_amt}</td><td>${r.received_amt}</td><td>${r.tds_amt}</td><td>${r.deduction_amt}</td></tr>`).join("")}
      <tr><td colspan="3"><b>TOTAL</b></td><td><b>${fmt(totals.received)}</b></td><td><b>${fmt(totals.tds)}</b></td><td><b>${fmt(totals.ded)}</b></td></tr>
      </table></body></html>`;
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) { showError("Popup blocked"); return; }
    w.document.write(html);
    w.document.close();
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
            <FormField label="Pay Mode" name="pay_mode" form={form} setForm={handleSetForm} options={PAY_MODES} required />
            <FormField label="Cheque / UTR No" name="instr_no" form={form} setForm={handleSetForm} disabled={cash} />
            <FormField label="Instrument Date" name="instr_date" type="date" form={form} setForm={handleSetForm} disabled={cash} />
            <div style={{ gridColumn: "span 2" }}>
              <Autocomplete
                size="small"
                options={banks.map((b) => b.bank_name).filter(Boolean)}
                value={form.bank_name || null}
                disabled={cash}
                onChange={(_, v) => handleSetForm({ ...form, bank_name: v || "" })}
                renderInput={(p) => <TextField {...p} label="Bank" size="small" sx={fieldSx} />}
              />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <Autocomplete
                size="small"
                options={customerOptions}
                value={customerOptions.find((o) => String(o.value) === String(form.customer)) || null}
                getOptionLabel={(o) => o?.label || ""}
                isOptionEqualToValue={(a, b) => String(a?.value) === String(b?.value)}
                onChange={(_, v) => handleSetForm({ ...form, customer: v?.value || "" })}
                renderInput={(p) => <TextField {...p} label="Customer" size="small" sx={fieldSx} placeholder="Search code or name" />}
              />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <FormField label="Remarks" name="remarks" form={form} setForm={handleSetForm} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: "8px 14px", background: "#e3f2fd", border: "1.5px solid #90caf9", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#0d6efd" }}>
          Received {fmt(totals.received)} &nbsp;|&nbsp; TDS {fmt(totals.tds)} &nbsp;|&nbsp; Deduction {fmt(totals.ded)} &nbsp;|&nbsp; {selectedRows.length} bill(s)
        </div>

        <div style={{ marginTop: 10 }}>
          <DataTable
            columns={columns}
            rows={rows}
            getKey={(r) => r.id}
            dense
            rowHeight={28}
            headerHeight={42}
            autoHeight={false}
            isHeight={360}
            checkboxSelection
            selectedRowColor="#dcfce7"
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={onSelect}
            editable
            onCellChange={onCellChange}
          />
        </div>

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
