import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Button, TextField } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, FormField, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { SaveIcon, ClearIcon } from "../../components/common/icons";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchAllLocations } from "../../utils/locationMaster";
import { getSessionLocCode } from "../../utils/authService";
import { fetchOpenReceipts, fetchOpenBills, saveBillAdjustment } from "../../utils/billAdjustment";
import moment from "moment";

const today = () => moment().format("YYYY-MM-DD");
const locCodeOf = (v) => String(v || "").split(" - ")[0].trim();

const sessionBranchLabel = (locations = []) => {
  const loc = String(getSessionLocCode() || "").trim();
  if (!loc) return "";
  const row = (locations || []).find((l) => String(l.loc_code || "").trim().toUpperCase() === loc.toUpperCase());
  return row?.loc_name ? `${loc} - ${row.loc_name}` : loc;
};

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

const round2 = (v) => Math.round(num(v) * 100) / 100;

const MR_REASON = { 3: "BILL COLLECTION", 4: "OTHERS" };

const emptySel = () => ({ type: "include", ids: new Set() });

const idsOf = (sm) => (sm?.ids instanceof Set ? sm.ids : new Set([...(sm?.ids ?? sm ?? [])]));

const mrColumns = [
  { key: "mr_no", label: "MR No", minWidth: 130, align: "left" },
  { key: "mr_date", label: "MR Date", minWidth: 100 },
  { key: "loc_code", label: "Branch", minWidth: 80 },
  { key: "pay_mode", label: "Pay Mode", minWidth: 90 },
  { key: "mr_reason_label", label: "Reason", minWidth: 130 },
  { key: "received_amt", label: "Received", minWidth: 100, align: "right" },
  { key: "balance_amt", label: "Balance", minWidth: 110, align: "right" },
];

const billColumns = [
  { key: "invoice_no", label: "Bill No", minWidth: 110, align: "left" },
  { key: "invoice_date", label: "Bill Date", minWidth: 100 },
  { key: "loc_code", label: "Branch", minWidth: 80 },
  { key: "bill_amt", label: "Bill Amt", minWidth: 100, align: "right" },
  { key: "balance_amt", label: "Unadjusted", minWidth: 110, align: "right" },
  { key: "adj_enter", label: "Adjusted Amt", minWidth: 120, align: "right", editable: true, type: "number" },
];

const comboColumns = [
  { key: "mr_no", label: "MR No", minWidth: 130, align: "left" },
  { key: "mr_date", label: "MR Date", minWidth: 100 },
  { key: "invoice_no", label: "Bill No", minWidth: 110, align: "left" },
  { key: "invoice_date", label: "Bill Date", minWidth: 100 },
  { key: "mr_amt", label: "MR Balance", minWidth: 110, align: "right" },
  { key: "bill_amt", label: "Bill Balance", minWidth: 110, align: "right" },
  { key: "adj_amt", label: "Adjusted", minWidth: 110, align: "right" },
];

const maxBillAdj = (row) => round2(Math.min(num(row.balance_amt), num(row.bill_amt)));

const clampBillAdj = (row, value) => {
  const max = maxBillAdj(row);
  let amt = round2(value);
  if (amt < 0) amt = 0;
  if (amt > max) amt = max;
  return amt;
};

const billAdjAmt = (row) => clampBillAdj(row, row.adj_enter ?? row.balance_amt);

const buildLines = (mrs, bills) => {
  if (!mrs.length || !bills.length) {
    throw new Error("Select at least one money receipt and one bill");
  }
  if (mrs.length > 1 && bills.length > 1) {
    throw new Error("Many-to-many is not allowed. Select one receipt with many bills, or many receipts with one bill.");
  }
  const lines = [];
  if (mrs.length === 1) {
    let left = round2(mrs[0].balance_amt);
    for (const b of bills) {
      if (left <= 0.009) break;
      const take = round2(Math.min(left, billAdjAmt(b)));
      if (take <= 0.009) continue;
      lines.push({
        id: `${mrs[0].id}__${b.id}`,
        mr_no: mrs[0].mr_no,
        mr_date: mrs[0].mr_date,
        mr_loc: mrs[0].loc_code,
        invoice_no: b.invoice_no,
        invoice_date: b.invoice_date,
        invoice_loc: b.loc_code,
        mr_amt: fmt(mrs[0].balance_amt),
        bill_amt: fmt(b.balance_amt),
        adj_amt: fmt(take),
      });
      left = round2(left - take);
    }
  } else {
    let left = billAdjAmt(bills[0]);
    for (const m of mrs) {
      if (left <= 0.009) break;
      const take = round2(Math.min(left, num(m.balance_amt)));
      if (take <= 0.009) continue;
      lines.push({
        id: `${m.id}__${bills[0].id}`,
        mr_no: m.mr_no,
        mr_date: m.mr_date,
        mr_loc: m.loc_code,
        invoice_no: bills[0].invoice_no,
        invoice_date: bills[0].invoice_date,
        invoice_loc: bills[0].loc_code,
        mr_amt: fmt(m.balance_amt),
        bill_amt: fmt(bills[0].balance_amt),
        adj_amt: fmt(take),
      });
      left = round2(left - take);
    }
  }
  if (!lines.length) throw new Error("No amount left to adjust on the selected rows");
  return lines;
};

const panel = (title, color) => (
  <div style={{ padding: "8px 12px", fontWeight: 700, color, background: "#dfeeff", borderBottom: "1px solid #dfeaf8" }}>
    {title}
  </div>
);

export default function BillAdjustment() {
  const { dialog, closeAlert, showError, showSuccess } = useAlert();
  const { isLoading, showLoading, hideLoading } = useLoading();
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({
    adj_no: "AUTO",
    adj_date: today(),
    loc_code: "",
    customer: "",
    remarks: "",
  });
  const [receipts, setReceipts] = useState([]);
  const [bills, setBills] = useState([]);
  const [mrSel, setMrSel] = useState(emptySel);
  const [billSel, setBillSel] = useState(emptySel);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetchAllLocations().then((d) => {
      const list = Array.isArray(d) ? d : [];
      setLocations(list);
      setForm((prev) => ({ ...prev, loc_code: sessionBranchLabel(list) || prev.loc_code }));
    }).catch(() => {});
    fetchAllBusinessPartners().then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
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

  const loadOpen = async (customer = selectedCustomer) => {
    if (!customer || !locCode) {
      setReceipts([]);
      setBills([]);
      setMrSel(emptySel());
      setBillSel(emptySel());
      setLines([]);
      return;
    }
    try {
      showLoading();
      const params = {
        loc_code: locCode,
        bp_code: customer.bp_grp_code || customer.bp_code || "",
        bp_name: customer.bp_name || "",
        bp_id: customer.record_id ?? customer.bp_id ?? "",
      };
      const [mrRows, billRows] = await Promise.all([fetchOpenReceipts(params), fetchOpenBills(params)]);
      setReceipts((Array.isArray(mrRows) ? mrRows : []).map((r) => ({
        ...r,
        mr_reason_label: MR_REASON[r.mr_reason] || String(r.mr_reason || ""),
      })));
      setBills((Array.isArray(billRows) ? billRows : []).map((r) => ({
        ...r,
        adj_enter: fmt(r.balance_amt),
      })));
      setMrSel(emptySel());
      setBillSel(emptySel());
      setLines([]);
    } catch (e) {
      showError(e.message || "Failed to load open receipts / bills");
      setReceipts([]);
      setBills([]);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    loadOpen(selectedCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer, locCode, selectedCustomer]);

  const selectedMrs = useMemo(() => receipts.filter((r) => mrSel.ids.has(r.id)), [receipts, mrSel]);
  const selectedBills = useMemo(() => bills.filter((r) => billSel.ids.has(r.id)), [bills, billSel]);

  const onSelectMr = (sm) => {
    const next = idsOf(sm);
    if (next.size > 1 && billSel.ids.size > 1) {
      showError("Many-to-many is not allowed. Keep one receipt when several bills are selected.");
      return;
    }
    setMrSel({ type: "include", ids: next });
    setLines([]);
  };

  const onSelectBill = (sm) => {
    const next = idsOf(sm);
    if (next.size > 1 && mrSel.ids.size > 1) {
      showError("Many-to-many is not allowed. Keep one bill when several receipts are selected.");
      return;
    }
    setBillSel({ type: "include", ids: next });
    setLines([]);
  };

  const onBillCellChange = (id, field, value) => {
    if (field !== "adj_enter") return;
    setBills((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const max = maxBillAdj(r);
      const entered = round2(value);
      if (entered - 0.009 > max) {
        showError(`Adjusted amount cannot exceed unadjusted balance ${fmt(max)} for bill ${r.invoice_no}`);
      }
      return { ...r, adj_enter: fmt(clampBillAdj(r, value)) };
    }));
    setBillSel((prev) => {
      const ids = prev?.ids instanceof Set ? new Set(prev.ids) : new Set();
      ids.add(id);
      if (ids.size > 1 && mrSel.ids.size > 1) {
        showError("Many-to-many is not allowed. Keep one bill when several receipts are selected.");
        return prev;
      }
      return { type: "include", ids };
    });
    setLines([]);
  };

  const handleAdjust = () => {
    try {
      setLines(buildLines(selectedMrs, selectedBills));
    } catch (e) {
      showError(e.message);
    }
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      showError("Please select a customer");
      return;
    }
    if (!form.adj_date) {
      showError("Please select adjustment date");
      return;
    }
    if (!lines.length) {
      showError("Press Adjust to build the allocation before save");
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    try {
      showLoading();
      const result = await saveBillAdjustment({
        header: {
          adj_no: form.adj_no && form.adj_no !== "AUTO" ? form.adj_no : null,
          adj_date: form.adj_date,
          loc_code: locCode,
          bp_code: selectedCustomer.bp_grp_code ?? selectedCustomer.bp_code ?? 0,
          bp_name: selectedCustomer.bp_name,
          remarks: form.remarks,
          division_code: currentUser?.division_code ?? null,
        },
        details: lines,
      });
      const hdr = result?.header || result;
      showSuccess("Bill adjustment " + hdr.adj_no + " saved");
      setForm((prev) => ({ ...prev, adj_no: String(hdr.adj_no || prev.adj_no).trim() }));
      await loadOpen(selectedCustomer);
    } catch (e) {
      showError(e.message || "Failed to save adjustment");
    } finally {
      hideLoading();
    }
  };

  const handleClear = () => {
    setForm({
      adj_no: "AUTO",
      adj_date: today(),
      loc_code: sessionBranchLabel(locations),
      customer: "",
      remarks: "",
    });
    setReceipts([]);
    setBills([]);
    setMrSel(emptySel());
    setBillSel(emptySel());
    setLines([]);
  };

  const adjTotal = useMemo(() => lines.reduce((s, r) => s + num(r.adj_amt), 0), [lines]);

  return (
    <MainLayout>
      <PageBody title="Bill Adjustment">
        <div className="pageToolbar" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={btn("#1ca562", "#119154")}>Save</Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={btn("#8c98ab", "#6a7280")}>Clear</Button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8, marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, color: "#0d6efd", background: "#dfeeff" }}>
            Adjustment Header
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "12px 14px", padding: 16, background: "#f8fafc" }}>
            <FormField label="Adj No" name="adj_no" form={form} setForm={setForm} disabled />
            <FormField label="Adjustment Date" name="adj_date" type="date" form={form} setForm={setForm} required />
            <FormField label="Branch" name="loc_code" form={form} setForm={setForm} disabled />
            <div style={{ gridColumn: "span 2" }}>
              <Autocomplete
                size="small"
                options={customerOptions}
                value={customerOptions.find((o) => String(o.value) === String(form.customer)) || null}
                getOptionLabel={(o) => (typeof o === "string" ? o : (o?.label || ""))}
                isOptionEqualToValue={(a, b) => String(a?.value ?? a) === String(b?.value ?? b)}
                onChange={(_, v) => setForm((prev) => ({ ...prev, customer: v?.value || "", adj_no: "AUTO" }))}
                renderInput={(p) => (
                  <TextField {...p} label="Customer" required size="small" sx={fieldSx} placeholder="Search code or name" />
                )}
              />
            </div>
            <FormField label="Remarks" name="remarks" form={form} setForm={setForm} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8, minWidth: 0 }}>
            {panel("Money Receipts — balance for adjustment", "#0d6efd")}
            <div style={{ padding: 8 }}>
              <DataTable
                columns={mrColumns}
                rows={receipts}
                getKey={(r) => r.id}
                dense
                rowHeight={36}
                headerHeight={40}
                autoHeight={false}
                isHeight={280}
                scroll={{ horizontal: true }}
                checkboxSelection
                selectedRowColor="#dcfce7"
                rowSelectionModel={mrSel}
                onRowSelectionModelChange={onSelectMr}
              />
            </div>
            <div style={{ padding: "6px 12px 10px", fontSize: 12, fontWeight: 700, color: "#0369a1" }}>
              Selected receipts {selectedMrs.length} &nbsp;|&nbsp; Balance {fmt(selectedMrs.reduce((s, r) => s + num(r.balance_amt), 0))}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8, minWidth: 0 }}>
            {panel("Unadjusted / partly adjusted bills", "#0d6efd")}
            <div style={{ padding: 8 }}>
              <DataTable
                columns={billColumns}
                rows={bills}
                getKey={(r) => r.id}
                dense
                rowHeight={36}
                headerHeight={40}
                autoHeight={false}
                isHeight={280}
                scroll={{ horizontal: true }}
                checkboxSelection
                selectedRowColor="#ffedd5"
                rowSelectionModel={billSel}
                onRowSelectionModelChange={onSelectBill}
                singleClick
                onCellChange={onBillCellChange}
              />
            </div>
            <div style={{ padding: "6px 12px 10px", fontSize: 12, fontWeight: 700, color: "#9a3412" }}>
              Selected bills {selectedBills.length} &nbsp;|&nbsp; Unadjusted {fmt(selectedBills.reduce((s, r) => s + num(r.balance_amt), 0))}
              &nbsp;|&nbsp; Adjusted {fmt(selectedBills.reduce((s, r) => s + billAdjAmt(r), 0))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
          <Button variant="contained" onClick={handleAdjust} sx={{ ...btn("#1f6feb", "#1d4ed8"), minWidth: 180 }}>
            Adjust
          </Button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8 }}>
          {panel("Adjustment combination", "#0d6efd")}
          <div style={{ padding: 8 }}>
            <DataTable
              columns={comboColumns}
              rows={lines}
              getKey={(r) => r.id}
              dense
              rowHeight={36}
              headerHeight={40}
              autoHeight={false}
              isHeight={220}
              scroll={{ horizontal: true }}
            />
          </div>
          <div style={{ padding: "8px 12px 12px", fontSize: 13, fontWeight: 700, color: "#0d6efd" }}>
            Lines {lines.length} &nbsp;|&nbsp; Total adjusted {fmt(adjTotal)}
            <span style={{ marginLeft: 12, color: "#64748b", fontWeight: 600 }}>
              One receipt to many bills, or many receipts to one bill. Many-to-many is blocked.
            </span>
          </div>
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
