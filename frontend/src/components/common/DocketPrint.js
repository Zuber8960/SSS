import moment from "moment";
import QRCode from "qrcode";
import { getTenantConfig } from "../../utils/tenantService";

const fmt = (val) => val || "";

const fmtDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format("DD-MM-YYYY") : val;
};

const fmtAmt = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const buildSlipHtml = ({ form, charges, ewb, printEwbNo, company, currentLoc, copyLabel, qrDataUrl }) => {
  const tenantConfig = getTenantConfig();
  const logoUrl = tenantConfig?.logo_url || "";

  const co = company || {};
  const coName = co.company_name || tenantConfig?.tenant_name || "";
  const locAddr = [currentLoc.loc_address, currentLoc.loc_town, currentLoc.loc_state, currentLoc.loc_postal_code].filter(Boolean).join(", ");
  const locPhone = currentLoc.mobile_no || currentLoc.telephone_no || "";
  const coGstin = co.gstin_no || "";
  const coPan = co.pan_no || "";
  const coPhone = co.mobile_no || "";
  const coEmail = co.email_id || "";

  const totalFreight = charges.reduce((s, c) => s + (parseFloat(c.charge_amt) || 0), 0);
  const gstPct = 0;
  const gstAmt = (totalFreight * gstPct) / 100;

  return `
    <div class="slip">
      <div class="slip-inner">
        <div class="header-row">
          <div class="logo-col">
            ${logoUrl ? `<img src="${logoUrl}" alt="logo" class="co-logo" />` : ""}
          </div>
          <div class="company-block">
            <div class="company-name">${fmt(coName)}</div>
            ${locAddr ? `<div class="company-addr">${locAddr}</div>` : ""}
            <div class="company-contact">
              ${coGstin ? `GSTIN: ${coGstin}` : ""}${coPan ? ` &nbsp;|&nbsp; PAN: ${coPan}` : ""}
            </div>
            <div class="company-contact">
              ${coEmail ? `&#9993; ${coEmail}` : ""}${coPhone ? ` &nbsp; &#9990; ${coPhone}` : ""}${locPhone && locPhone !== coPhone ? ` &nbsp; &#9990; ${locPhone}` : ""}
            </div>
            <div class="company-contact">Support: &#9990; 9212312222</div>
          </div>
          <div class="cn-block">
            <div class="cn-title">CONSIGNMENT</div>
            ${qrDataUrl ? `<img src="${qrDataUrl}" class="cn-qr" alt="QR" />` : ""}
            <div class="cn-no">${fmt(form.docket_no)}</div>
            <div class="cn-billed">${fmt(form.pay_type)}</div>
          </div>
        </div>

        <table class="route-table">
          <thead>
            <tr>
              <th>ORIGIN</th><th>DESTINATION</th><th>DISPATCH MODE</th>
              <th>BILLING STATION</th><th>Truck No.</th><th>Truck Size</th><th>C/N DATE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${fmt(form.docket_from_town || form.docket_loc)}</td>
              <td>${fmt(form.docket_to_town || form.docket_to_loc)}</td>
              <td>${fmt(form.transit_type)}</td>
              <td>${fmt(form.pay_loc)}</td>
              <td>${fmt(ewb.vehicle_no)}</td>
              <td>${fmt(form.load_type)}</td>
              <td>${fmtDate(form.docket_date)}</td>
            </tr>
          </tbody>
        </table>

        <div class="party-row">
          <div class="party-box">
            <div class="party-title">CONSIGNOR</div>
            <div class="party-name">${fmt(form.cnor_name)}</div>
            <div class="party-addr">${fmt(form.cnor_address)}${form.cnor_city ? ", " + form.cnor_city : ""}${form.cnor_state ? ", " + form.cnor_state : ""}${form.cnor_pincode ? " - " + form.cnor_pincode : ""}</div>
            <div class="party-gstin">GSTIN: ${fmt(form.cnor_gstin)}</div>
            <div class="party-state">STATE: ${fmt(form.cnor_state)} &nbsp;&nbsp; STATE CODE: ${fmt(form.cnor_gstin ? form.cnor_gstin.substring(0, 2) : "")}</div>
          </div>
          <div class="party-box">
            <div class="party-title">CONSIGNEE</div>
            <div class="party-name">${fmt(form.cnee_name)}</div>
            <div class="party-addr">${fmt(form.cnee_address)}${form.cnee_city ? ", " + form.cnee_city : ""}${form.cnee_state ? ", " + form.cnee_state : ""}${form.cnee_pincode ? " - " + form.cnee_pincode : ""}</div>
            <div class="party-gstin">GSTIN: ${fmt(form.cnee_gstin)}</div>
            <div class="party-state">STATE: ${fmt(form.cnee_state)} &nbsp;&nbsp; STATE CODE: ${fmt(form.cnee_gstin ? form.cnee_gstin.substring(0, 2) : "")}</div>
          </div>
        </div>

        <div class="pkg-charges-row">
          <div class="pkg-section">
            <table class="pkg-table">
              <tbody>
                <tr>
                  <td class="pkg-label">Delivery To</td>
                  <td colspan="2">${fmt(form.dly_type)}</td>
                  <td class="pkg-label">ACTUAL WEIGHT</td>
                  <td>${fmt(form.act_wt)} Kg</td>
                  <td class="pkg-label">CHARGE WEIGHT</td>
                  <td>${fmt(form.chrg_wt)} Kg</td>
                  <td class="pkg-label">PACKAGE</td>
                  <td>${fmt(form.tot_pkgs)} - ${fmt(form.goods_desc || "")}</td>
                </tr>
                <tr>
                  <td class="pkg-label">Inv No</td>
                  <td class="pkg-label">Inv Date</td>
                  <td class="pkg-label">Inv Value</td>
                  <td colspan="2" class="pkg-label">Eway Bill No.</td>
                  <td colspan="4" class="pkg-label">Expiry</td>
                </tr>
                <tr>
                  <td>${fmt(form.invoice_no || ewb.inv_no)}</td>
                  <td>${fmtDate(form.invoice_date || ewb.inv_date)}</td>
                  <td>${fmt(form.invoice_value)}</td>
                  <td colspan="2">${fmt(printEwbNo)}</td>
                  <td colspan="4">${fmtDate(ewb.ewb_valid)}</td>
                </tr>
                <tr>
                  <td class="pkg-label" colspan="9">Remark</td>
                </tr>
                <tr>
                  <td colspan="9">${fmt(form.remark)}</td>
                </tr>
              </tbody>
            </table>
            <div class="note-block">
              <strong>NOTE:</strong><br/>
              * NOT RESPONSIBLE FOR LEAKAGE OR BREAKAGE<br/>
              * Subject To ${fmt(currentLoc.loc_state || currentLoc.loc_town || "")} Jurisdiction Only.<br/>
              * Please Make Payment By Cheque In Favour Of ${fmt(coName)}.
            </div>
          </div>
          <div class="charges-section">
            <table class="charges-table">
              <thead>
                <tr><th>Freight Details</th><th>Amount</th></tr>
              </thead>
              <tbody>
                ${charges.map((c) => `
                  <tr>
                    <td>${c.charge_name || c.charge_code}</td>
                    <td class="amt-cell">${fmtAmt(c.charge_amt)}</td>
                  </tr>
                `).join("")}
                <tr><td>Total Freight</td><td class="amt-cell">${fmtAmt(totalFreight)}</td></tr>
                <tr><td>GST ${gstPct} %</td><td class="amt-cell">${fmtAmt(gstAmt)}</td></tr>
                <tr class="total-row"><td>Grand Total</td><td class="amt-cell">&#8377; ${fmtAmt(totalFreight + gstAmt)}</td></tr>
                <tr><td colspan="2" class="company-footer">${fmt(coName)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="copy-footer">
          <span class="copy-label">${copyLabel}</span>
          <span class="auth-sign">Auth. Sign.</span>
        </div>
      </div>
    </div>
  `;
};

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; overflow-x: hidden; }
  body { font-family: Arial, sans-serif; font-size: 8px; font-weight: 800; background: #fff; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  @page { size: A4 portrait; margin: 6mm; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
    .page-break { page-break-before: always; }
  }
  .page { width: 100%; max-width: 210mm; padding: 2mm; }
  .page-break { page-break-before: always; padding: 2mm; }
  .slip { border: 1.5px solid #222; margin-bottom: 4mm; page-break-inside: avoid; }
  .slip-inner { padding: 3px 6px; }

  .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #222; padding-bottom: 2px; margin-bottom: 2px; gap: 4px; }
  .logo-col { display: flex; align-items: center; justify-content: center; min-width: 40px; }
  .co-logo { max-height: 38px; max-width: 70px; object-fit: contain; }
  .company-block { flex: 1; }
  .company-name { font-size: 12px; font-weight: 900; letter-spacing: 0.3px; }
  .company-addr { font-size: 8px; font-weight: 800; }
  .company-contact { font-size: 8px; font-weight: 800; }
  .cn-block { text-align: right; min-width: 100px; }
  .cn-title { font-size: 9px; font-weight: 900; border: 1.5px solid #222; padding: 1px 4px; background: #eee; letter-spacing: 0.5px; }
  .cn-qr { width: 64px; height: 64px; display: block; margin: 2px auto; }
  .cn-no { font-size: 11px; font-weight: 900; letter-spacing: 0.5px; }
  .cn-billed { font-size: 8px; font-weight: 800; }

  .route-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; font-size: 8px; }
  .route-table th { border: 1px solid #555; padding: 1px 3px; text-align: left; background: #e8e8e8; font-weight: 900; }
  .route-table td { border: 1px solid #555; padding: 1px 3px; text-align: left; font-weight: 800; }

  .party-row { display: flex; gap: 3px; margin-bottom: 2px; }
  .party-box { flex: 1; border: 1px solid #555; padding: 2px 4px; }
  .party-title { font-size: 8px; font-weight: 900; background: #e8e8e8; margin: -2px -4px 2px -4px; padding: 1px 4px; letter-spacing: 0.5px; }
  .party-name { font-size: 9px; font-weight: 900; }
  .party-addr { font-size: 8px; font-weight: 800; }
  .party-gstin { font-size: 8px; font-weight: 800; }
  .party-state { font-size: 8px; font-weight: 800; }

  .pkg-charges-row { display: flex; gap: 3px; margin-bottom: 2px; }
  .pkg-section { flex: 1; }
  .pkg-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 2px; }
  .pkg-table td { border: 1px solid #555; padding: 1px 3px; font-weight: 800; }
  .pkg-label { background: #e8e8e8; font-weight: 900; white-space: nowrap; }
  .note-block { font-size: 7.5px; font-weight: 800; border: 1px solid #555; padding: 2px 4px; }
  .charges-section { min-width: 115px; }
  .charges-table { width: 100%; border-collapse: collapse; font-size: 8px; }
  .charges-table th { border: 1px solid #555; padding: 1px 3px; background: #e8e8e8; font-weight: 900; }
  .charges-table td { border: 1px solid #555; padding: 1px 3px; font-weight: 800; }
  .amt-cell { text-align: right; font-weight: 900; }
  .total-row td { font-weight: 900; background: #f0f0f0; font-size: 8.5px; }
  .company-footer { font-size: 7.5px; text-align: center; font-weight: 900; }

  .copy-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #444; padding-top: 2px; margin-top: 2px; }
  .copy-label { font-size: 10px; font-weight: 900; color: #c00; letter-spacing: 0.5px; }
  .auth-sign { font-size: 8px; font-weight: 800; }

  .print-btn { display: block; margin: 10px auto; padding: 8px 24px; font-size: 14px; background: #7e22ce; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
`;

const DEFAULT_COPIES = [
  "Consignor Copy",
  "Consignee Copy",
  "Lorry Copy",
  "File Copy",
];

/**
 * Opens a print window with one slip per copy label.
 *
 * @param {object}        props
 * @param {object}        props.form         - Docket form values
 * @param {Array}         props.charges      - Charge list from ChargesSection.getChargeList()
 * @param {Array}         props.ewbList      - EWB rows (first row used for vehicle/dates)
 * @param {string}        props.ewbNoDisplay - Fallback EWB number display string
 * @param {object}        props.company      - Company master record
 * @param {Array}         props.locations    - All location master records
 * @param {number|string[]} props.copies     - Number of copies OR array of copy labels.
 *                                             Defaults to ["Consignor Copy","Consignee Copy","Driver Copy"]
 */
export async function printDocket({ form, charges, ewbList, ewbNoDisplay, company, locations, copies }) {
  const ewb = ewbList?.[0] || {};
  const printEwbNo = ewb.ewb_no || ewbNoDisplay || "";

  const currentLocCode =
    JSON.parse(localStorage.getItem("current_user") || "null")?.location_id ||
    localStorage.getItem("loc_code") || "";
  const currentLoc = (locations || []).find((l) => l.loc_code === currentLocCode) || {};

  let qrDataUrl = "";
  if (form.docket_no) {
    try {
      const qrPayload = [
        `DN:${form.docket_no}`,
        `DD:${fmtDate(form.docket_date)}`,
        `FR:${form.docket_from_town || form.docket_loc || ""}`,
        `TO:${form.docket_to_town || form.docket_to_loc || ""}`,
        `PKGS:${form.tot_pkgs || ""}`,
        `AWT:${form.act_wt || ""}`,
        `CWT:${form.chrg_wt || ""}`,
        `CNOR:${form.cnor_name || ""}`,
        `CNEE:${form.cnee_name || ""}`,
        `INV:${form.invoice_no || ""}`,
        `INVDT:${fmtDate(form.invoice_date)}`,
        `INVVAL:${form.invoice_value || ""}`,
        `SUP:9212312222`,
      ].join("|");
      qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 80, margin: 1, errorCorrectionLevel: "M" });
    } catch (e) {
      console.error("QR generation failed:", e);
    }
  }

  const slipData = { form, charges, ewb, printEwbNo, company, currentLoc, qrDataUrl };

  // Resolve copy labels
  let copyLabels;
  if (Array.isArray(copies)) {
    copyLabels = copies.length > 0 ? copies : DEFAULT_COPIES;
  } else {
    const n = parseInt(copies, 10);
    if (Number.isFinite(n) && n > 0) {
      copyLabels = Array.from({ length: n }, (_, i) => `Copy ${i + 1}`);
    } else {
      copyLabels = DEFAULT_COPIES;
    }
  }

  // Always use 4 fixed copies split across 2 pages
  const page1Labels = [copyLabels[0] || "Consignor Copy", copyLabels[1] || "Consignee Copy"];
  const page2Labels = [copyLabels[2] || "Lorry Copy",     copyLabels[3] || "File Copy"];

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Consignment - ${form.docket_no || ""}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print(); window.close();">Print</button>
  <div class="page">
    ${page1Labels.map((label) => buildSlipHtml({ ...slipData, copyLabel: label })).join("")}
  </div>
  <div class="page page-break">
    ${page2Labels.map((label) => buildSlipHtml({ ...slipData, copyLabel: label })).join("")}
  </div>
</body>
</html>`);
  printWindow.document.close();
}
