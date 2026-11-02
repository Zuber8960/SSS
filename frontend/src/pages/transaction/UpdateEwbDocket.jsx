import { useRef, useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { DataTable, FormField, PageBody } from "../../components/common/MasterPage";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";
import useLoading from "../../components/common/UseLoading";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { AddIcon, ClearIcon, DeleteIcon, SaveIcon, SearchIcon } from "../../components/common/icons";
import { fetchDocketByDocketNo, fetchEwayBillFromDB, fetchUpdateEwbDocket, saveUpdateEwbDocket } from "../../utils/docket";
import { formatDateDisplay, formatDateIso } from "../../utils/tenantService";

const btn = (from, to) => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  borderRadius: "6px",
  fontWeight: 700,
  textTransform: "none",
  boxShadow: "none",
  minWidth: "110px",
  "&:hover": { opacity: 0.92, background: `linear-gradient(135deg, ${from}, ${to})` },
});

const columns = [
  { key: "ewb_no", label: "EWB No", editable: true, minWidth: 170, align: "left" },
  { key: "ewb_date", label: "EWB Date", editable: true, isDate: true, minWidth: 140 },
  { key: "ewb_valid", label: "EWB Expiry Date", editable: true, isDate: true, minWidth: 150 },
  { key: "inv_no", label: "Invoice No", editable: true, minWidth: 150, align: "left" },
  { key: "inv_date", label: "Invoice Date", editable: true, isDate: true, minWidth: 140 },
  { key: "inv_value", label: "Invoice Value", editable: true, type: "number", minWidth: 130, align: "right" },
];

let rowSeq = 0;
const newRow = (seed = {}) => ({
  rowId: `ewbrow_${++rowSeq}`,
  ewb_no: seed.ewb_no || "",
  ewb_date: seed.ewb_date ? formatDateDisplay(seed.ewb_date) : "",
  ewb_valid: seed.ewb_valid ? formatDateDisplay(seed.ewb_valid) : "",
  inv_no: seed.inv_no || "",
  inv_date: seed.inv_date ? formatDateDisplay(seed.inv_date) : "",
  inv_value: seed.inv_value ?? "",
});

const isBlank = (row) =>
  !String(row.ewb_no || "").trim() &&
  !String(row.ewb_date || "").trim() &&
  !String(row.ewb_valid || "").trim() &&
  !String(row.inv_no || "").trim() &&
  !String(row.inv_date || "").trim() &&
  (row.inv_value === "" || row.inv_value == null);

const firstDetail = (rec) => {
  if (Array.isArray(rec?.dtl_rows) && rec.dtl_rows.length) return rec.dtl_rows[0];
  if (Array.isArray(rec?.itemList) && rec.itemList.length) return rec.itemList[0];
  return null;
};

const lookupFields = (rec) => {
  const dtl = firstDetail(rec);
  const invNo = rec?.INV_NO || rec?.invoice_no || rec?.inv_no || rec?.docNo || dtl?.INV_NO || dtl?.invoice_no || dtl?.inv_no || "";
  const invDateRaw = rec?.INV_DATE || rec?.invoice_date || rec?.inv_date || rec?.docDate || dtl?.INV_DATE || dtl?.invoice_date || dtl?.inv_date || "";
  const value = parseFloat(
    rec?.TOTAL_INV_VALUE ?? rec?.invoice_total ?? rec?.totInvValue ?? rec?.INV_VALUE ?? dtl?.INV_VALUE ?? dtl?.invoice_total
  );
  const dateRaw = rec?.EWB_DATE || rec?.ewb_date || rec?.ewayBillDate || "";
  const validRaw = rec?.EWB_VALID_UPTO || rec?.ewb_valid_upto || rec?.validUpto || rec?.ewb_valid || "";
  return {
    ewb_date: dateRaw ? formatDateDisplay(dateRaw) : "",
    ewb_valid: validRaw ? formatDateDisplay(validRaw) : "",
    inv_no: invNo ? String(invNo) : "",
    inv_date: invDateRaw ? formatDateDisplay(invDateRaw) : "",
    inv_value: Number.isFinite(value) ? value : "",
  };
};

export default function UpdateEwbDocket() {
  const { dialog, closeAlert, showSuccess, showError, showInfo, showWarning } = useAlert();
  const { isLoading, withLoading } = useLoading();
  const [query, setQuery] = useState({ docket_no: "" });
  const [docket, setDocket] = useState(null);
  const [rows, setRows] = useState([]);
  const rowsRef = useRef([]);
  rowsRef.current = rows;

  const applyRows = (list) => {
    const next = (Array.isArray(list) ? list : []).map((r) => newRow(r));
    setRows(next);
    return next;
  };

  const handleQuery = () => withLoading(async () => {
    const docketNo = String(query.docket_no || "").trim();
    if (!docketNo) {
      showError("Enter a docket number");
      return;
    }
    try {
      const found = await fetchDocketByDocketNo(docketNo);
      if (!found) {
        showError("Docket not found");
        setDocket(null);
        setRows([]);
        return;
      }
      const lines = await fetchUpdateEwbDocket(found.docket_no || docketNo);
      setDocket(found);
      setQuery({ docket_no: found.docket_no || docketNo });
      const next = applyRows(lines);
      if (next.length) {
        showInfo(`Docket ${found.docket_no} loaded with ${next.length} record${next.length === 1 ? "" : "s"}`);
      } else {
        showInfo(`Docket ${found.docket_no} has no EWB or invoice details. Use + to add.`);
      }
    } catch (err) {
      setDocket(null);
      setRows([]);
      const msg = err?.message || "";
      showError(
        /ECONNRESET/i.test(msg)
          ? "Database connection was interrupted. Query the docket again."
          : (msg || "Failed to query docket")
      );
    }
  });

  const addRow = () => {
    if (!docket) {
      showError("Query a docket before adding records");
      return;
    }
    setRows((prev) => [...prev, newRow()]);
  };

  const askDelete = (row) => {
    const label = row.ewb_no || row.inv_no || "this row";
    showWarning("Delete row", `Remove ${label} from the grid? Save to keep the change.`, () => {
      setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
    });
  };

  const fillFromEwb = async (rowId, ewbNo) => {
    const current = rowsRef.current.find((r) => r.rowId === rowId) || {};
    try {
      const body = (await fetchEwayBillFromDB([ewbNo]))?.data;
      const records = Array.isArray(body?.data) ? body.data : [];
      if (!records.length) {
        showInfo(`EWB ${ewbNo} was not found. Enter the invoice details manually.`);
        return {};
      }
      const picked = lookupFields(records[0]);
      const patch = {};
      if (!String(current.ewb_date || "").trim() && picked.ewb_date) patch.ewb_date = picked.ewb_date;
      if (!String(current.ewb_valid || "").trim() && picked.ewb_valid) patch.ewb_valid = picked.ewb_valid;
      if (!String(current.inv_no || "").trim() && picked.inv_no) patch.inv_no = picked.inv_no;
      if (!String(current.inv_date || "").trim() && picked.inv_date) patch.inv_date = picked.inv_date;
      if ((current.inv_value === "" || current.inv_value == null) && picked.inv_value !== "") patch.inv_value = picked.inv_value;
      return patch;
    } catch (err) {
      const msg = err?.message || "";
      const linked = msg.match(/already associated with docket\s+(\S+)/i);
      if (linked) {
        if (String(linked[1]) === String(docket?.docket_no || "")) {
          const sibling = rowsRef.current.find(
            (r) => r.rowId !== rowId && String(r.ewb_no || "").trim() === ewbNo && (r.ewb_date || r.ewb_valid)
          );
          return sibling ? { ewb_date: sibling.ewb_date || "", ewb_valid: sibling.ewb_valid || "" } : {};
        }
        showError(msg);
        return { ewb_no: "" };
      }
      showInfo(msg || "Could not fetch the e-way bill. Enter the invoice details manually.");
      return {};
    }
  };

  const onCellChange = async (rowId, key, value) => {
    let patch = { [key]: value };
    const ewbNo = String(value || "").trim();
    if (key === "ewb_no" && /^\d+$/.test(ewbNo)) {
      const filled = await fillFromEwb(rowId, ewbNo);
      patch = { ...patch, ...filled };
    }
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
    return patch;
  };

  const handleSave = () => withLoading(async () => {
    if (!docket?.docket_no) {
      showError("Query a docket before saving");
      return;
    }
    if (!docket.docket_loc || !docket.docket_date) {
      showError("This docket is missing location or date, so invoices cannot be saved");
      return;
    }
    const filled = rows.filter((r) => !isBlank(r));
    if (!filled.length) {
      showError("Add at least one invoice. EWB No can be left blank.");
      return;
    }
    const seen = new Set();
    for (let i = 0; i < filled.length; i++) {
      const row = filled[i];
      const invNo = String(row.inv_no || "").trim();
      const invDate = formatDateIso(row.inv_date);
      if (!invNo || !invDate) {
        showError(`Row ${i + 1}: Invoice No and Invoice Date are required. Leave EWB No blank when there is no e-way bill.`);
        return;
      }
      const key = `${invNo.toLowerCase()}|${invDate}`;
      if (seen.has(key)) {
        showError(`Invoice ${invNo} on ${row.inv_date} is entered more than once`);
        return;
      }
      seen.add(key);
    }
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    try {
      const saved = await saveUpdateEwbDocket(
        docket.docket_no,
        {
          docket_loc: docket.docket_loc,
          docket_date: formatDateIso(docket.docket_date) || docket.docket_date,
          user_code: currentUser?.user_code ?? currentUser?.rec_id ?? null,
          company_code: currentUser?.company_code ?? docket.company_code ?? null,
          division_code: currentUser?.division_code ?? docket.division_code ?? null,
          cnor_name: docket.cnor_name || "",
          cnor_address: docket.cnor_address || "",
          cnor_gstin: docket.cnor_gstin || "",
          cnor_pincode: docket.cnor_pincode || null,
          cnee_name: docket.cnee_name || "",
          cnee_address: docket.cnee_address || "",
          cnee_gstin: docket.cnee_gstin || "",
          cnee_pincode: docket.cnee_pincode || null,
        },
        filled.map((r) => ({
          ewb_no: String(r.ewb_no || "").trim() || null,
          ewb_date: formatDateIso(r.ewb_date) || null,
          ewb_valid: formatDateIso(r.ewb_valid) || null,
          inv_no: String(r.inv_no || "").trim(),
          inv_date: formatDateIso(r.inv_date),
          inv_value: r.inv_value === "" || r.inv_value == null ? null : r.inv_value,
        }))
      );
      applyRows(saved);
      showSuccess(`EWB and invoice details saved for docket ${docket.docket_no}`);
    } catch (err) {
      showError(err.message || "Failed to save EWB / invoice details");
    }
  });

  const handleClear = () => {
    setQuery({ docket_no: "" });
    setDocket(null);
    setRows([]);
  };

  const placeLabel = (loc, town) => [loc, town].map((v) => String(v || "").trim()).filter(Boolean).join(" - ");
  const summary = docket
    ? {
        docket_date: formatDateDisplay(docket.docket_date) || "",
        from_place: placeLabel(docket.docket_loc, docket.docket_pickup_town || docket.docket_from_town),
        to_place: placeLabel(docket.docket_to_loc, docket.docket_dly_town || docket.docket_to_town),
        packages: docket.docket_tot_pkgs ?? docket.tot_pkgs ?? "",
        act_wt: docket.docket_act_wt ?? docket.act_wt ?? "",
        chrg_wt: docket.docket_chrg_wt ?? docket.chrg_wt ?? "",
        cnor_name: docket.cnor_name || "",
        cnee_name: docket.cnee_name || "",
      }
    : null;

  return (
    <MainLayout>
      <PageBody title="Update EWB Docket">
        <div className="pageToolbar" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={btn("#1ca562", "#119154")}>Save</Button>
          <Button variant="contained" startIcon={<ClearIcon />} onClick={handleClear} sx={btn("#8c98ab", "#6a7280")}>Clear</Button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8, marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, color: "#0d6efd", background: "#dfeeff" }}>
            Query Docket
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "280px 140px", gap: 12, padding: 16, alignItems: "center", background: "#f8fafc" }}>
            <FormField
              label="Docket No"
              name="docket_no"
              form={query}
              setForm={setQuery}
              required
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuery();
                }
              }}
            />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={handleQuery} sx={btn("#0d6efd", "#0b5ed7")}>
              Query
            </Button>
          </div>
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, padding: "0 16px 16px", background: "#f8fafc" }}>
              <FormField label="Docket Date" name="docket_date" form={summary} setForm={() => {}} disabled />
              <FormField label="From Location / Town" name="from_place" form={summary} setForm={() => {}} disabled />
              <FormField label="To Location / Town" name="to_place" form={summary} setForm={() => {}} disabled />
              <FormField label="Packages" name="packages" form={summary} setForm={() => {}} disabled />
              <FormField label="Actual Weight" name="act_wt" form={summary} setForm={() => {}} disabled />
              <FormField label="Charged Weight" name="chrg_wt" form={summary} setForm={() => {}} disabled />
              <FormField label="Consignor" name="cnor_name" form={summary} setForm={() => {}} disabled />
              <FormField label="Consignee" name="cnee_name" form={summary} setForm={() => {}} disabled />
            </div>
          )}
        </div>

        {docket && (
          <div style={{ background: "#fff", border: "1px solid #dfeaf8", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontWeight: 700, color: "#0d6efd", background: "#dfeeff" }}>
              <span>EWB / Invoice Details</span>
              <Tooltip title="Add row">
                <IconButton size="small" onClick={addRow} sx={{ color: "#0d6efd" }}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </div>
            <div style={{ padding: "8px 14px 0", color: "#64748b", fontSize: 12 }}>
              Saved e-way bill and invoice rows are shown below. Use + to add another. Leave EWB No, EWB Date, and EWB Expiry Date blank when the docket has only an invoice.
            </div>
            <div style={{ padding: 12 }}>
              <DataTable
                columns={columns}
                rows={rows}
                getKey={(row) => row.rowId}
                editable
                singleClick
                autoHeight
                scroll={{ afterRows: 8 }}
                onCellChange={onCellChange}
                actions={[{ label: "Delete", icon: <DeleteIcon fontSize="small" />, onClick: askDelete }]}
              />
            </div>
          </div>
        )}

        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        <LoadingOverlay isLoading={isLoading} message="Working..." />
      </PageBody>
    </MainLayout>
  );
}
