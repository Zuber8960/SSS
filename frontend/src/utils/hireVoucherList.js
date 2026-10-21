import moment from "moment";
import { getDateFormat } from "./tenantService";

export const RATE_TYPE_LABELS = { 1: "Fixed", 2: "Per Kg", 3: "Per Ton" };

export const hireVoucherReportColumns = [
  { key: "vha_no", label: "Voucher No", minWidth: 100 },
  { key: "vha_date", label: "Voucher Date", minWidth: 110 },
  { key: "from_label", label: "From Loc", minWidth: 130 },
  { key: "to_label", label: "To Loc", minWidth: 130 },
  { key: "vha_from_town", label: "From Town", minWidth: 120 },
  { key: "vha_to_loc_town", label: "To Town", minWidth: 120 },
  { key: "vehicle_regis_no", label: "Vehicle No", minWidth: 120 },
  { key: "vha_sub_type", label: "Veh Type", minWidth: 90 },
  { key: "vendor_name", label: "Owner", minWidth: 160 },
  { key: "broker_name", label: "Broker", minWidth: 150 },
  { key: "vha_adv_paid_to", label: "Pay To", minWidth: 90 },
  { key: "rate_type_label", label: "Rate Type", minWidth: 90 },
  { key: "vha_rate_per_uom", label: "Rate", minWidth: 90 },
  { key: "dwb_actual_weight", label: "Act Wt", minWidth: 90 },
  { key: "vha_guarantee_weight", label: "Gtd Wt", minWidth: 90 },
  { key: "vha_hire_amt", label: "Hire", minWidth: 100 },
  { key: "vha_loading_amt", label: "Loading", minWidth: 90 },
  { key: "vha_dc_amt", label: "Other", minWidth: 90 },
  { key: "vha_advance_total", label: "Advance", minWidth: 100 },
  { key: "vha_tds_amt", label: "TDS", minWidth: 90 },
  { key: "vha_advance_net", label: "Net Adv", minWidth: 100 },
  { key: "vha_balance_amt", label: "Balance", minWidth: 100 },
  { key: "vha_final_pay_date", label: "Settlement Date", minWidth: 120 },
  { key: "vha_dtn_amt", label: "Paid Detention", minWidth: 120 },
  { key: "vha_dd_amt", label: "Paid Others", minWidth: 110 },
  { key: "vha_gross_payable", label: "Paid Gross", minWidth: 110 },
  { key: "vha_settle_tds_amt", label: "Paid TDS", minWidth: 100 },
  { key: "vha_net_payable", label: "Paid Net", minWidth: 100 },
  { key: "vha_remarks", label: "Remarks", minWidth: 140 },
  { key: "settled_label", label: "Status", minWidth: 100 },
];

export const HIRE_VOUCHER_AMOUNT_KEYS = [
  "dwb_actual_weight",
  "vha_guarantee_weight",
  "vha_hire_amt",
  "vha_loading_amt",
  "vha_dc_amt",
  "vha_advance_total",
  "vha_tds_amt",
  "vha_advance_net",
  "vha_balance_amt",
  "vha_dtn_amt",
  "vha_dd_amt",
  "vha_gross_payable",
  "vha_settle_tds_amt",
  "vha_net_payable",
];

export const hireVoucherFormColumns = [
  { key: "vha_no", label: "Voucher No", minWidth: 100 },
  { key: "vha_date", label: "Date", minWidth: 100 },
  { key: "vehicle_regis_no", label: "Vehicle No", minWidth: 120 },
  { key: "from_label", label: "From", minWidth: 110 },
  { key: "to_label", label: "To", minWidth: 110 },
  { key: "vendor_name", label: "Owner", minWidth: 150 },
  { key: "vha_hire_amt", label: "Hire", minWidth: 90 },
  { key: "vha_advance_total", label: "Advance", minWidth: 90 },
  { key: "vha_balance_amt", label: "Balance", minWidth: 90 },
  { key: "settled_label", label: "Status", minWidth: 90 },
];

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format(getDateFormat()) : String(v).slice(0, 10);
};

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
};

const fmtWt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export const locLabel = (code, lMap) => {
  if (!code) return "";
  const loc = lMap?.[code];
  return loc?.loc_name ? `${code} - ${loc.loc_name}` : code;
};

const numVal = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const mapHireVoucherRow = (row, lMap = {}) => {
  const uom = Number(row.vha_rate_uom);
  const isSettled =
    String(row.vha_settled || "").trim().toUpperCase() === "Y" ||
    Boolean(String(row.vha_final_pay_date || "").trim());
  const paid = (v) => (isSettled ? numVal(v) : 0);
  return {
    ...row,
    id: `${row.vha_no || ""}_${row.vha_loc || ""}_${row.vha_date || ""}`,
    vha_date: toDate(row.vha_date),
    vha_date_raw: row.vha_date,
    from_label: locLabel(row.vha_loc, lMap),
    to_label: locLabel(row.vha_to_loc, lMap),
    rate_type_label: RATE_TYPE_LABELS[uom] || RATE_TYPE_LABELS[Math.trunc(uom)] || String(row.vha_rate_uom || ""),
    vha_rate_per_uom: fmtAmt(row.vha_rate_per_uom),
    dwb_actual_weight: fmtWt(row.dwb_actual_weight),
    dwb_actual_weight_n: numVal(row.dwb_actual_weight),
    vha_guarantee_weight: fmtWt(row.vha_guarantee_weight),
    vha_guarantee_weight_n: numVal(row.vha_guarantee_weight),
    vha_hire_amt: fmtAmt(row.vha_hire_amt),
    vha_hire_amt_n: numVal(row.vha_hire_amt),
    vha_loading_amt: fmtAmt(row.vha_loading_amt),
    vha_loading_amt_n: numVal(row.vha_loading_amt),
    vha_dc_amt: fmtAmt(row.vha_dc_amt),
    vha_dc_amt_n: numVal(row.vha_dc_amt),
    vha_advance_total: fmtAmt(row.vha_advance_total),
    vha_advance_total_n: numVal(row.vha_advance_total),
    vha_tds_amt: fmtAmt(row.vha_tds_amt),
    vha_tds_amt_n: numVal(row.vha_tds_amt),
    vha_advance_net: fmtAmt(row.vha_advance_net),
    vha_advance_net_n: numVal(row.vha_advance_net),
    vha_balance_amt: fmtAmt(row.vha_balance_amt),
    vha_balance_amt_n: numVal(row.vha_balance_amt),
    vha_final_pay_date: isSettled ? toDate(row.vha_final_pay_date) : "",
    vha_dtn_amt: fmtAmt(paid(row.vha_dtn_amt)),
    vha_dtn_amt_n: paid(row.vha_dtn_amt),
    vha_dd_amt: fmtAmt(paid(row.vha_dd_amt)),
    vha_dd_amt_n: paid(row.vha_dd_amt),
    vha_gross_payable: fmtAmt(paid(row.vha_gross_payable)),
    vha_gross_payable_n: paid(row.vha_gross_payable),
    vha_settle_tds_amt: fmtAmt(paid(row.vha_settle_tds_amt)),
    vha_settle_tds_amt_n: paid(row.vha_settle_tds_amt),
    vha_net_payable: fmtAmt(paid(row.vha_net_payable)),
    vha_net_payable_n: paid(row.vha_net_payable),
    settled_label: isSettled ? "Settled" : "Open",
    row_tone: isSettled ? "Settled" : "Open",
  };
};

export const buildHireVoucherTotalRow = (rows) => {
  const sums = {};
  HIRE_VOUCHER_AMOUNT_KEYS.forEach((k) => { sums[k] = 0; });
  (rows || []).forEach((r) => {
    HIRE_VOUCHER_AMOUNT_KEYS.forEach((k) => {
      sums[k] += Number(r[`${k}_n`]) || numVal(r[k]);
    });
  });
  const total = {
    id: "__total__",
    is_total: true,
    vha_no: "TOTAL",
    vha_date: "",
    from_label: `${(rows || []).length} voucher(s)`,
    to_label: "",
    vha_from_town: "",
    vha_to_loc_town: "",
    vehicle_regis_no: "",
    vha_sub_type: "",
    vendor_name: "",
    broker_name: "",
    vha_adv_paid_to: "",
    rate_type_label: "",
    vha_rate_per_uom: "",
    vha_final_pay_date: "",
    vha_remarks: "",
    settled_label: "",
    row_tone: "Total",
  };
  HIRE_VOUCHER_AMOUNT_KEYS.forEach((k) => {
    total[k] = (k.includes("weight") ? fmtWt(sums[k]) : fmtAmt(sums[k]));
    total[`${k}_n`] = sums[k];
  });
  return total;
};

export const filterHireVoucherRows = (rows, { searchText, fFromLoc, fToLoc, fStatus, dFrom, dTo } = {}) => {
  const q = String(searchText || "").toLowerCase().trim();
  const ff = String(fFromLoc || "").toLowerCase();
  const ft = String(fToLoc || "").toLowerCase();
  const fs = String(fStatus || "").toLowerCase();
  const df = dFrom ? moment(dFrom, "YYYY-MM-DD") : null;
  const dt = dTo ? moment(dTo, "YYYY-MM-DD") : null;
  return (rows || []).filter((row) => {
    if (ff && !String(row.from_label ?? "").toLowerCase().includes(ff)) return false;
    if (ft && !String(row.to_label ?? "").toLowerCase().includes(ft)) return false;
    if (fs && fs !== "both" && !String(row.settled_label ?? "").toLowerCase().includes(fs)) return false;
    if (df || dt) {
      const rd = moment(row.vha_date, getDateFormat());
      if (rd.isValid()) {
        if (df && rd.isBefore(df, "day")) return false;
        if (dt && rd.isAfter(dt, "day")) return false;
      }
    }
    if (q && !["vha_no", "from_label", "to_label", "vehicle_regis_no", "vendor_name", "broker_name", "vha_from_town", "vha_to_loc_town", "vha_remarks", "vha_final_pay_date"]
      .some((k) => String(row[k] ?? "").toLowerCase().includes(q))) return false;
    return true;
  });
};

export const exportHireVouchersExcel = (displayRows, filename) => {
  const escape = (v) => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const heads = hireVoucherReportColumns.map((c) => c.label);
  const header = `<tr>${heads.map((h) => `<th style="background:#0d6efd;color:#ffffff;font-weight:700;border:1px solid #90caf9">${escape(h)}</th>`).join("")}</tr>`;
  const body = (displayRows || []).map((r) => {
    const bg = r.is_total ? "#f3e8ff" : r.settled_label === "Settled" ? "#7CFC00" : "#ffffff";
    return `<tr style="background-color:${bg}">${hireVoucherReportColumns.map((c) => `<td style="background-color:${bg};border:1px solid #d1d5db">${escape(r[c.key])}</td>`).join("")}</tr>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>${header}${body}</table></body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `hire_voucher_report_${moment().format("YYYYMMDD_HHmmss")}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
