import moment from "moment";
import { getTenantConfig } from "../../utils/tenantService";
import { openPrintDocument } from "../../utils/printBridge";

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("DD-MM-YYYY") : v;
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
export function printInvoice({ invoice, details, company, locationsMap }) {
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

  const loc = (locationsMap || {})[invoice.loc_code] || {};
  const branchAddr = [loc.loc_address, loc.loc_town, loc.loc_state, loc.loc_postal_code]
    .filter(Boolean)
    .join(", ");

  const rows = Array.isArray(details) ? details : [];
  const hasDetails = rows.length > 0;

  // Compute totals
  const sums = rows.reduce(
    (a, d) => {
      a.freight += parseFloat(d.freight) || 0;
      a.loading += parseFloat(d.loading) || 0;
      a.unloading += parseFloat(d.unloading) || 0;
      a.detention += parseFloat(d.detention) || 0;
      a.toll += parseFloat(d.add_toll ?? d.additional_toll) || 0;
      a.greenTax += parseFloat(d.green_tax) || 0;
      a.other += parseFloat(d.other_charges) || 0;
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
          <td>${fmtAmt(d.loading)}</td>
          <td>${fmtAmt(d.unloading)}</td>
          <td>${fmtAmt(d.detention)}</td>
          <td>${fmtAmt(d.add_toll ?? d.additional_toll)}</td>
          <td>${fmtAmt(d.green_tax)}</td>
          <td>${fmtAmt(d.other_charges)}</td>
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
    body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
    @media print { .no-print { display: none !important; } }
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
    </div>
  </div>

  <div class="info-row">
    <div class="info-box">
      <h4>BILL TO</h4>
      <strong>${invoice.bp_name || invoice.customer || ""}</strong><br/>
      ${invoice.loc_label || ""}<br/>
      Customer Code: ${invoice.bp_code || ""}
    </div>
    <div class="info-box">
      <h4>BILLING BRANCH</h4>
      <strong>${invoice.loc_label || invoice.loc_code || invoice.billing_branch || ""}</strong><br/>
      ${branchAddr ? branchAddr + "<br/>" : ""}
      Type: ${invoice.invoice_type || invoice.billing_type || "Regular"}
    </div>
  </div>

  ${hasDetails ? `
  <table>
    <thead>
      <tr>
        <th>Sr</th><th>Docket No</th><th>Date</th><th>Origin</th><th>Dest</th><th>Wt</th>
        <th>Freight</th><th>Ldg</th><th>Uld</th><th>Det</th><th>Toll</th><th>Green Tax</th><th>Other</th>
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
    features: "width=1000,height=1200",
  });
}