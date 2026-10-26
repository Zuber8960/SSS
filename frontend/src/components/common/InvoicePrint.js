import moment from "moment";
import { getTenantConfig, getDateFormat } from "../../utils/tenantService";
import { openPrintDocument } from "../../utils/printBridge";
import { formatSac } from "../../utils/sacCodes";

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

const findBillToPartner = (invoice = {}, partners = [], customer = null) => {
  if (customer && (customer.bp_addres || customer.bp_address || customer.bp_name)) return customer;
  const list = Array.isArray(partners) ? partners : [];
  const rawCode = String(invoice.bp_code ?? "").trim();
  const rawName = String(invoice.bp_name ?? invoice.customer ?? "").trim();
  const name = rawName.includes(" - ") ? rawName.split(" - ").slice(1).join(" - ").trim() : rawName;
  const loc = String(invoice.loc_code ?? "").split(" - ")[0].trim().toUpperCase();
  const norm = (s) => String(s || "").replace(/["']/g, "").trim().toLowerCase();

  if (isRealBpCode(rawCode)) {
    const byCode = list.find((p) => {
      const grp = String(p.bp_grp_code ?? "").trim();
      const code = String(p.bp_code ?? "").trim();
      return grp === rawCode || code === rawCode;
    });
    if (byCode) return byCode;
  }
  if (name) {
    const want = norm(name);
    const matches = list.filter((p) => norm(p.bp_name) === want || norm(p.bp_name) === norm(rawName));
    if (loc) {
      const atLoc = matches.find((p) => {
        const bpLoc = String(p.loc_code || "").split(" - ")[0].trim().toUpperCase();
        return !bpLoc || bpLoc === loc;
      });
      if (atLoc) return atLoc;
    }
    if (matches[0]) return matches[0];
  }
  return null;
};

export function resolveBillToCustomer(invoice = {}, partners = [], customer = null) {
  return findBillToPartner(invoice, partners, customer);
}

const addressBlock = ({ title, name, address, city, state, pin, gstin, code, phone, extra }) => {
  const cityLine = [city, state].filter(Boolean).join(", ")
    + (pin ? `${city || state ? " - " : ""}${pin}` : "");
  const lines = [];
  if (name) lines.push(`<strong>${esc(name)}</strong>`);
  if (address) lines.push(esc(address).replace(/\n/g, "<br/>"));
  if (cityLine.trim()) lines.push(esc(cityLine.trim()));
  if (gstin) lines.push(`GSTIN: ${esc(gstin)}`);
  if (isRealBpCode(code)) lines.push(`${title === "BILL TO" ? "Customer Code" : "Branch Code"}: ${esc(code)}`);
  if (phone) lines.push(`Tel: ${esc(phone)}`);
  if (extra) lines.push(esc(extra));
  return lines.join("<br/>");
};

const billToLines = (invoice = {}, partner = {}) => {
  const p = partner || {};
  const rawName = String(p.bp_name || invoice.bp_name || invoice.customer || "").trim();
  const name = rawName.includes(" - ") && isRealBpCode(rawName.split(" - ")[0])
    ? rawName.split(" - ").slice(1).join(" - ").trim()
    : rawName;
  return addressBlock({
    title: "BILL TO",
    name,
    address: invoice.bp_address || p.bp_addres || p.bp_address || "",
    city: invoice.bp_city || p.bp_city || "",
    state: invoice.bp_state || p.bp_state || "",
    pin: invoice.bp_pincode || p.bp_pincode || "",
    gstin: invoice.bp_gstin || p.bp_gstin || "",
    code: invoice.bp_code || p.bp_grp_code || p.bp_code || "",
    phone: invoice.bp_phone || p.bp_mobile1 || p.bp_mobile2 || "",
  });
};

const branchLines = (invoice = {}, loc = {}) => {
  const label = invoice.loc_label || "";
  const name = loc.loc_name
    ? `${loc.loc_code || ""} - ${loc.loc_name}`.replace(/^ - /, "")
    : (label.includes(" - ") ? label : (loc.loc_code || label || invoice.loc_code || ""));
  const type = ({ R: "Regular", C: "Regular", D: "Debit Note", DN: "Debit Note", CM: "Complimentary" })[invoice.invoice_type]
    || invoice.billing_type || invoice.invoice_type || "";
  return addressBlock({
    title: "BILLING BRANCH",
    name,
    address: loc.loc_address || "",
    city: loc.loc_town || loc.loc_city || "",
    state: loc.loc_state || "",
    pin: loc.loc_postal_code || loc.loc_pincode || "",
    gstin: loc.loc_gstin || loc.gstin_no || invoice.loc_gstin || "",
    code: loc.loc_code || invoice.loc_code || "",
    phone: loc.telephone_no || loc.mobile_no || "",
    extra: type ? `Type: ${type}` : "",
  });
};

/**
 * Prints an invoice using the given header + detail rows.
 * Both CustomerBill (in-memory billingRows) and InvoiceReport (fetched details)
 * can use this shared print utility.
 *
 * @param {object} props
 * @param {object} props.invoice      - Invoice header object (invoice_no, invoice_date, bp_name, etc.)
 * @param {Array}  props.details      - Detail rows (one per docket line)
 * @param {object} props.company      - Company master record
 * @param {object} props.locationsMap - Map of loc_code -> location record
 */
export function printInvoice({ invoice, details, company, locationsMap, customer, partners }) {
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

  const loc = (locationsMap || {})[invoice.loc_code]
    || (locationsMap || {})[String(invoice.loc_code || "").split(" - ")[0].trim()]
    || {};
  const billToPartner = resolveBillToCustomer(invoice, partners, customer);
  const billToHtml = billToLines(invoice, billToPartner);
  const branchHtml = branchLines(invoice, loc);

  const rows = Array.isArray(details) ? details : [];
  const hasDetails = rows.length > 0;

  // Compute totals
  const sums = rows.reduce(
    (a, d) => {
      a.freight += parseFloat(d.freight) || 0;
      a.loading += parseFloat(d.handling ?? d.loading) || 0;
      a.unloading += parseFloat(d.fuel_surcharge ?? d.unloading) || 0;
      a.detention += parseFloat(d.factory_charge ?? d.detention) || 0;
      a.toll += parseFloat(d.oda_charge ?? d.add_toll ?? d.additional_toll) || 0;
      a.greenTax += parseFloat(d.fov ?? d.green_tax) || 0;
      a.other += parseFloat(d.stationery ?? d.other_charges) || 0;
      a.taxable += parseFloat(d.taxable ?? d.taxable_amt) || 0;
      a.cgst += parseFloat(d.cgst) || 0;
      a.sgst += parseFloat(d.sgst) || 0;
      a.igst += parseFloat(d.igst) || 0;
      a.total += parseFloat(d.amount ?? d.total_amt) || 0;
      return a;
    },
    { freight: 0, loading: 0, unloading: 0, detention: 0, toll: 0, greenTax: 0, other: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  // Detail rows table HTML (supports both CustomerBill row shape and API detail shape)
  const rowsHtml = rows
    .map((d, i) => {
      const isBillRow = d.docket_no && d.amount !== undefined;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${d.docket_no || ""}</td>
          <td>${toDate(d.docket_date || d.docket_date)}</td>
          <td>${d.origin || d.docket_from_loc || ""}</td>
          <td>${d.destination || d.docket_to_loc || ""}</td>
          <td>${d.charge_wt ?? d.docket_chrwt ?? ""}</td>
          <td>${fmtAmt(d.freight)}</td>
          <td>${fmtAmt(d.handling ?? d.loading)}</td>
          <td>${fmtAmt(d.fuel_surcharge ?? d.unloading)}</td>
          <td>${fmtAmt(d.factory_charge ?? d.detention)}</td>
          <td>${fmtAmt(d.oda_charge ?? d.add_toll ?? d.additional_toll)}</td>
          <td>${fmtAmt(d.fov ?? d.green_tax)}</td>
          <td>${fmtAmt(d.stationery ?? d.other_charges)}</td>
          <td>${fmtAmt(d.taxable ?? d.taxable_amt)}</td>
          <td>${fmtAmt(d.cgst)}</td>
          <td>${fmtAmt(d.sgst)}</td>
          <td>${fmtAmt(d.igst)}</td>
          <td>${fmtAmt(d.amount ?? d.total_amt)}</td>
        </tr>`;
    })
    .join("");

  const totalAmt = hasDetails ? sums.total.toFixed(2) : fmtAmt(invoice.total_inv_amt);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoice_no || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 8mm; }
    html, body { height: auto; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 12px; }
    @media print {
      .no-print { display: none !important; }
      html, body {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
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
    <button class="btn" style="background:#1976d2;color:#fff" onclick="window.print()">&#128424; Print</button>
    <button class="btn" style="background:#333;color:#fff" onclick="window.close()">Close</button>
  </div>

  <div class="header">
    <div>
      ${logoUrl ? `<img src="${logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain"/>` : ""}
      <div class="company">${coName}</div>
      ${coAddr ? `<div class="sub">${coAddr}</div>` : ""}
      <div class="sub">
        ${gstin ? `GSTIN: ${gstin}` : ""}${pan ? ` | PAN: ${pan}` : ""}
        ${email ? `<br/>&#9993; ${email}` : ""}${phone ? ` | &#9990; ${phone}` : ""}
      </div>
    </div>
    <div class="inv-box">
      <h2>INVOICE</h2>
      <div>No: <strong>${invoice.invoice_no || ""}</strong></div>
      <div>Date: <strong>${toDate(invoice.invoice_date)}</strong></div>
      ${invoice.sac_code || invoice.sac_label ? `<div style="margin-top:6px;font-size:11px">SAC: <strong>${invoice.sac_label || formatSac(invoice.sac_code)}</strong></div>` : ""}
    </div>
  </div>

  <div class="info-row">
    <div class="info-box">
      <h4>BILL TO</h4>
      ${billToHtml || esc(invoice.bp_name || invoice.customer || "")}
    </div>
    <div class="info-box">
      <h4>BILLING BRANCH</h4>
      ${branchHtml || esc(invoice.loc_label || invoice.loc_code || "")}
    </div>
  </div>

  ${hasDetails ? `
  <table>
    <thead>
      <tr>
        <th>Sr</th><th>Docket No</th><th>Date</th><th>Origin</th><th>Dest</th><th>Wt</th>
        <th>Freight</th><th>Handling</th><th>Fuel Surcharge</th><th>Factory Charge</th><th>ODA Charge</th><th>FOV</th><th>Stationery</th>
        <th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="tot-row">
        <td colspan="6" style="text-align:right">TOTAL</td>
        <td>${sums.freight.toFixed(2)}</td>
        <td>${sums.loading.toFixed(2)}</td>
        <td>${sums.unloading.toFixed(2)}</td>
        <td>${sums.detention.toFixed(2)}</td>
        <td>${sums.toll.toFixed(2)}</td>
        <td>${sums.greenTax.toFixed(2)}</td>
        <td>${sums.other.toFixed(2)}</td>
        <td>${sums.taxable.toFixed(2)}</td>
        <td>${sums.cgst.toFixed(2)}</td>
        <td>${sums.sgst.toFixed(2)}</td>
        <td>${sums.igst.toFixed(2)}</td>
        <td><strong>${totalAmt}</strong></td>
      </tr>
    </tbody>
  </table>` : `
  <table>
    <tbody>
      <tr><td style="text-align:center;padding:16px;font-size:13px"><strong>Invoice Amount: &#8377; ${totalAmt}</strong></td></tr>
    </tbody>
  </table>`}

  <div class="footer">
    <div>
      <strong>Notes:</strong><br/>
      * Subject to jurisdiction of local courts.<br/>
      * Payment by cheque in favour of ${coName}.<br/>
      * Computer generated invoice.
    </div>
    <div class="sign">
      Authorised Signatory
      <div style="border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">${coName}</div>
    </div>
  </div>
</body>
</html>`;

  openPrintDocument({
    html,
    title: `Invoice ${invoice.invoice_no || ""}`,
    features: "width=1200,height=800",
  });
}