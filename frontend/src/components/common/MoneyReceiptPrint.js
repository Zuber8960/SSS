import moment from "moment";
import { getTenantConfig, getDateFormat } from "../../utils/tenantService";
import { openPrintDocument } from "../../utils/printBridge";

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format(getDateFormat()) : v;
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isRealBpCode = (v) => {
  const s = String(v ?? "").trim();
  return !!s && s !== "0";
};

const addressBlock = ({ title, name, address, city, state, pin, gstin, code, phone, extra }) => {
  const cityLine = [city, state].filter(Boolean).join(", ")
    + (pin ? `${city || state ? " - " : ""}${pin}` : "");
  const lines = [];
  if (name) lines.push(`<strong>${esc(name)}</strong>`);
  if (address) lines.push(esc(address).replace(/\n/g, "<br/>"));
  if (cityLine.trim()) lines.push(esc(cityLine.trim()));
  if (gstin) lines.push(`GSTIN: ${esc(gstin)}`);
  if (isRealBpCode(code)) lines.push(`${title === "RECEIVED FROM" ? "Customer Code" : "Branch Code"}: ${esc(code)}`);
  if (phone) lines.push(`Tel: ${esc(phone)}`);
  if (extra) lines.push(esc(extra));
  return lines.join("<br/>");
};

const partyLines = (customer = {}, receipt = {}) => {
  const p = customer || {};
  const rawName = String(p.bp_name || receipt.bp_name || "").trim();
  const name = rawName.includes(" - ") && isRealBpCode(rawName.split(" - ")[0])
    ? rawName.split(" - ").slice(1).join(" - ").trim()
    : rawName;
  return addressBlock({
    title: "RECEIVED FROM",
    name,
    address: p.bp_addres || p.bp_address || "",
    city: p.bp_city || "",
    state: p.bp_state || "",
    pin: p.bp_pincode || "",
    gstin: p.bp_gstin || "",
    code: p.bp_grp_code || p.bp_code || receipt.bp_code || "",
    phone: p.bp_mobile1 || p.bp_mobile2 || "",
  });
};

const branchLines = (receipt = {}, loc = {}) => {
  const label = receipt.loc_label || "";
  const name = loc.loc_name
    ? `${loc.loc_code || ""} - ${loc.loc_name}`.replace(/^ - /, "")
    : (label.includes(" - ") ? label : (loc.loc_code || label || receipt.loc_code || ""));
  return addressBlock({
    title: "COLLECTION BRANCH",
    name,
    address: loc.loc_address || "",
    city: loc.loc_town || loc.loc_city || "",
    state: loc.loc_state || "",
    pin: loc.loc_postal_code || loc.loc_pincode || "",
    gstin: loc.loc_gstin || loc.gstin_no || "",
    code: loc.loc_code || receipt.loc_code || "",
    phone: loc.telephone_no || loc.mobile_no || "",
    extra: receipt.mr_reason_label ? `MR Reason: ${receipt.mr_reason_label}` : "",
  });
};

export function printMoneyReceipt({ receipt, details, company, locationsMap, customer }) {
  const co = company || {};
  const tc = getTenantConfig();
  const logoUrl = tc?.logo_url || "";
  const coName = co.company_name || tc?.tenant_name || "";
  const coAddr = [co.company_address, co.company_city, co.company_state, co.company_pincode]
    .filter(Boolean)
    .join(", ");
  const gstin = co.gstin_no || "";
  const pan = co.pan_no || "";
  const phone = co.mobile_no || "";
  const email = co.email_id || "";

  const loc = (locationsMap || {})[receipt.loc_code]
    || (locationsMap || {})[String(receipt.loc_code || "").split(" - ")[0].trim()]
    || {};
  const partyHtml = partyLines(customer, receipt);
  const branchHtml = branchLines(receipt, loc);

  const rows = Array.isArray(details) ? details : [];
  const hasDetails = rows.length > 0;

  const sums = rows.reduce(
    (a, d) => {
      a.freight += parseFloat(d.bill_amt) || 0;
      a.sgst += parseFloat(d.sgst_amt) || 0;
      a.cgst += parseFloat(d.cgst_amt) || 0;
      a.igst += parseFloat(d.igst_amt) || 0;
      a.tds += parseFloat(d.tds_amt) || 0;
      a.ded += parseFloat(d.deduction_amt) || 0;
      a.net += parseFloat(d.net_received ?? d.received_amt) || 0;
      return a;
    },
    { freight: 0, sgst: 0, cgst: 0, igst: 0, tds: 0, ded: 0, net: 0 }
  );

  const totalAmt = hasDetails ? sums.net.toFixed(2) : fmtAmt(receipt.received_amt);

  const rowsHtml = rows
    .map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(d.docket_no)}</td>
          <td>${toDate(d.docket_date)}</td>
          <td>${esc(d.loc_code || d.docket_loc || "")}</td>
          <td>${esc(d.docket_from_town || "")}</td>
          <td>${esc(d.docket_to_loc || "")}</td>
          <td>${esc(d.docket_to_town || "")}</td>
          <td>${esc(d.docket_pay_type || "")}</td>
          <td>${fmtAmt(d.bill_amt)}</td>
          <td>${fmtAmt(d.sgst_amt)}</td>
          <td>${fmtAmt(d.cgst_amt)}</td>
          <td>${fmtAmt(d.igst_amt)}</td>
          <td>${fmtAmt(d.tds_amt)}</td>
          <td>${fmtAmt(d.deduction_amt)}</td>
          <td>${fmtAmt(d.net_received ?? d.received_amt)}</td>
        </tr>`)
    .join("");

  const payBits = [
    receipt.pay_mode ? `Mode: <strong>${esc(receipt.pay_mode)}</strong>` : "",
    receipt.instr_no ? `Instrument: <strong>${esc(receipt.instr_no)}</strong>` : "",
    receipt.instr_date ? `Date: <strong>${toDate(receipt.instr_date)}</strong>` : "",
    receipt.bank_name ? `Bank: <strong>${esc(receipt.bank_name)}</strong>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Money Receipt ${receipt.mr_no || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 8mm; }
    html, body { height: auto; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 12px; }
    @media print {
      .no-print { display: none !important; }
      html, body { width: auto !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
      .header { margin-bottom: 8px !important; padding-bottom: 8px !important; }
      .info-row { margin-bottom: 8px !important; }
      .footer { margin-top: 10px !important; padding-top: 8px !important; }
    }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
    .company { font-size: 22px; font-weight: 800; }
    .sub { font-size: 11px; color: #555; margin-top: 2px; }
    .inv-box { text-align: center; border: 2px solid #333; padding: 10px 24px; }
    .inv-box h2 { font-size: 16px; margin-bottom: 4px; }
    .info-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .info-box { flex: 1; border: 1px solid #ccc; padding: 10px; }
    .info-box h4 { background: #eee; margin: -10px -10px 8px; padding: 4px 8px; font-size: 11px; }
    .pay { border: 1px solid #ccc; padding: 8px 10px; margin-bottom: 10px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
    th { background: #2d3748; color: #fff; padding: 6px 4px; }
    td { border: 1px solid #ccc; padding: 4px; }
    .tot-row td { background: #edf2f7; font-weight: 700; }
    .footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; }
    .sign { text-align: center; }
    .btn { padding: 10px 32px; font-size: 14px; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center; padding:16px 0;">
    <button class="btn" style="background:#1976d2;color:#fff" onclick="window.print()">Print</button>
    <button class="btn" style="background:#333;color:#fff" onclick="window.close()">Close</button>
  </div>

  <div class="header">
    <div>
      ${logoUrl ? `<img src="${logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain"/>` : ""}
      <div class="company">${esc(coName)}</div>
      ${coAddr ? `<div class="sub">${esc(coAddr)}</div>` : ""}
      <div class="sub">
        ${gstin ? `GSTIN: ${esc(gstin)}` : ""}${pan ? ` | PAN: ${esc(pan)}` : ""}
        ${email ? `<br/>${esc(email)}` : ""}${phone ? ` | ${esc(phone)}` : ""}
      </div>
    </div>
    <div class="inv-box">
      <h2>MONEY RECEIPT</h2>
      <div>No: <strong>${esc(receipt.mr_no === "AUTO" ? "" : (receipt.mr_no || ""))}</strong></div>
      <div>Date: <strong>${toDate(receipt.mr_date)}</strong></div>
      ${receipt.mr_reason_label ? `<div style="margin-top:6px;font-size:11px">${esc(receipt.mr_reason_label)}</div>` : ""}
    </div>
  </div>

  <div class="info-row">
    <div class="info-box">
      <h4>RECEIVED FROM</h4>
      ${partyHtml || esc(receipt.bp_name || "")}
    </div>
    <div class="info-box">
      <h4>COLLECTION BRANCH</h4>
      ${branchHtml || esc(receipt.loc_label || receipt.loc_code || "")}
    </div>
  </div>

  ${payBits ? `<div class="pay">${payBits}${receipt.remarks ? `<br/>Remarks: ${esc(receipt.remarks)}` : ""}</div>` : ""}

  ${hasDetails ? `
  <table>
    <thead>
      <tr>
        <th>Sr</th><th>Docket No</th><th>Date</th><th>From Loc</th><th>From Town</th>
        <th>To Loc</th><th>To Town</th><th>Pay Type</th>
        <th>Freight</th><th>SGST</th><th>CGST</th><th>IGST</th>
        <th>TDS</th><th>Other Ded</th><th>Net Received</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="tot-row">
        <td colspan="8" style="text-align:right">TOTAL</td>
        <td>${sums.freight.toFixed(2)}</td>
        <td>${sums.sgst.toFixed(2)}</td>
        <td>${sums.cgst.toFixed(2)}</td>
        <td>${sums.igst.toFixed(2)}</td>
        <td>${sums.tds.toFixed(2)}</td>
        <td>${sums.ded.toFixed(2)}</td>
        <td><strong>${totalAmt}</strong></td>
      </tr>
    </tbody>
  </table>` : `
  <table>
    <tbody>
      <tr><td style="text-align:center;padding:16px;font-size:13px"><strong>Received Amount: &#8377; ${totalAmt}</strong></td></tr>
    </tbody>
  </table>`}

  <div class="footer">
    <div>
      <strong>Notes:</strong><br/>
      * This is a computer generated money receipt.<br/>
      * Subject to jurisdiction of local courts.<br/>
      * Payment received towards the consignments listed above.
    </div>
    <div class="sign">
      Authorised Signatory
      <div style="border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">${esc(coName)}</div>
    </div>
  </div>
</body>
</html>`;

  openPrintDocument({
    html,
    title: `Money Receipt ${receipt.mr_no || ""}`,
    features: "width=1200,height=800",
  });
}
