import moment from "moment";
import QRCode from "qrcode";
import { getTenantConfig } from "../../../utils/tenantService";
import { printDocketOnDt } from "../../../utils/printBridge";

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

const buildSlipHtml = ({ form, charges, ewb, printEwbNo, company, currentLoc, qrDataUrl, copyName }) => {
  const coName = company?.company_name || getTenantConfig()?.tenant_name || "";
  const locAddr = [currentLoc.loc_address, currentLoc.loc_town, currentLoc.loc_state, currentLoc.loc_postal_code].filter(Boolean).join(", ");
  const locPhone = currentLoc.mobile_no || currentLoc.telephone_no || "";
  const coGstin = company?.gstin_no || "";
  const coPan = company?.pan_no || "";
  const coPhone = company?.mobile_no || "";
  const coEmail = company?.email_id || "";

  const totalFreight = charges.reduce((s, c) => s + (parseFloat(c.charge_amt) || 0), 0);
  const gstPct = 0;
  const gstAmt = (totalFreight * gstPct) / 100;

  const logoUrl = getTenantConfig()?.logo_url || "";

  return `
    <div class="slip-3inch">
      <div class="header-row-3inch">
        <div class="logo-col-3inch">
          ${logoUrl ? `<img src="${logoUrl}" alt="logo" class="co-logo-3inch" />` : ""}
        </div>
        <div class="company-block-3inch">
          <div class="company-name-3inch">${fmt(coName)}</div>
          ${locAddr ? `<div class="company-addr-3inch">${locAddr}</div>` : ""}
          <div class="company-contact-3inch">
            ${coGstin ? `GSTIN: ${coGstin}` : ""}${coPan ? ` | PAN: ${coPan}` : ""}
          </div>
          <div class="company-contact-3inch">
            ${coEmail ? `✉ ${coEmail}` : ""}${coPhone ? ` | ☎ ${coPhone}` : ""}${locPhone && locPhone !== coPhone ? ` | ☎ ${locPhone}` : ""}
          </div>
        </div>
        <div class="cn-block-3inch">
          <div class="cn-title-3inch">CONSIGNMENT</div>
          ${qrDataUrl ? `<img src="${qrDataUrl}" class="cn-qr-3inch" alt="QR" />` : ""}
          <div class="cn-no-3inch">${fmt(form.docket_no)}</div>
          <div class="cn-date-3inch">${fmtDate(form.docket_date)}</div>
        </div>
      </div>

      <table class="route-table-3inch">
        <tr>
          <th>ORIGIN</th><th>DESTINATION</th><th>MODE</th><th>TYPE</th><th>BILLED</th>
        </tr>
        <tr>
          <td>${fmt(form.docket_from_town || form.docket_loc)}</td>
          <td>${fmt(form.docket_to_town || form.docket_to_loc)}</td>
          <td>${fmt(form.transit_type)}</td>
          <td>${fmt(form.load_type)}</td>
          <td>${fmt(form.pay_type)}</td>
        </tr>
      </table>

      <div class="party-row-3inch">
        <div class="party-box-3inch">
          <div class="party-title-3inch">CONSIGNOR</div>
          <div class="party-name-3inch">${fmt(form.cnor_name)}</div>
          <div class="party-addr-3inch">${fmt(form.cnor_address)}${form.cnor_city ? ", " + form.cnor_city : ""}${form.cnor_state ? ", " + form.cnor_state : ""}${form.cnor_pincode ? " - " + form.cnor_pincode : ""}</div>
          <div class="party-gstin-3inch">GSTIN: ${fmt(form.cnor_gstin)}</div>
        </div>
        <div class="party-box-3inch">
          <div class="party-title-3inch">CONSIGNEE</div>
          <div class="party-name-3inch">${fmt(form.cnee_name)}</div>
          <div class="party-addr-3inch">${fmt(form.cnee_address)}${form.cnee_city ? ", " + form.cnee_city : ""}${form.cnee_state ? ", " + form.cnee_state : ""}${form.cnee_pincode ? " - " + form.cnee_pincode : ""}</div>
          <div class="party-gstin-3inch">GSTIN: ${fmt(form.cnee_gstin)}</div>
        </div>
      </div>

      <table class="details-table-3inch">
        <tr>
          <td class="detail-label-3inch">Delivery Type</td>
          <td>${fmt(form.dly_type)}</td>
          <td class="detail-label-3inch">Actual Wt</td>
          <td>${fmt(form.act_wt)} Kg</td>
          <td class="detail-label-3inch">Charged Wt</td>
          <td>${fmt(form.chrg_wt)} Kg</td>
        </tr>
        <tr>
          <td class="detail-label-3inch">Packages</td>
          <td>${fmt(form.tot_pkgs)}</td>
          <td class="detail-label-3inch">Goods</td>
          <td colspan="3">${fmt(form.goods_desc)}</td>
        </tr>
        <tr>
          <td class="detail-label-3inch">Inv No</td>
          <td>${fmt(form.invoice_no)}</td>
          <td class="detail-label-3inch">Inv Date</td>
          <td>${fmtDate(form.invoice_date)}</td>
          <td class="detail-label-3inch">Inv Value</td>
          <td>${fmt(form.invoice_value)}</td>
        </tr>
        <tr>
          <td class="detail-label-3inch">E-Way Bill</td>
          <td>${fmt(printEwbNo)}</td>
          <td class="detail-label-3inch">Valid</td>
          <td colspan="3">${fmtDate(ewb.ewb_valid)}</td>
        </tr>
        <tr>
          <td class="detail-label-3inch" colspan="6">Remark</td>
        </tr>
        <tr>
          <td colspan="6">${fmt(form.remark)}</td>
        </tr>
      </table>

      <table class="charges-table-3inch">
        <thead>
          <tr><th>Freight Details</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${charges.map((c) => `
            <tr>
              <td>${c.charge_name || c.charge_code}</td>
              <td class="amt-cell-3inch">₹ ${fmtAmt(c.charge_amt)}</td>
            </tr>
          `).join("")}
          <tr class="total-row-3inch">
            <td>Total Freight</td>
            <td class="amt-cell-3inch">₹ ${fmtAmt(totalFreight)}</td>
          </tr>
          <tr class="total-row-3inch">
            <td>GST ${gstPct}%</td>
            <td class="amt-cell-3inch">₹ ${fmtAmt(gstAmt)}</td>
          </tr>
          <tr class="grand-total-row-3inch">
            <td>Grand Total</td>
            <td class="amt-cell-3inch">₹ ${fmtAmt(totalFreight + gstAmt)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-3inch">
        <div class="footer-left-3inch">
          <div class="footer-copy-label-3inch">${copyName || ''}</div>
          <div class="footer-prepared-3inch">
            <span class="prepared-label-3inch">Prepared By:</span>
            <span class="prepared-value-3inch">${fmt(form.prepare_by)}</span>
          </div>
          <div class="footer-prepared-3inch">
            <span class="prepared-label-3inch">Prepared Date:</span>
            <span class="prepared-value-3inch">${fmtDate(form.prepare_date)}</span>
          </div>
        </div>
        <div class="footer-right-3inch">
          <span class="auth-sign-3inch">Auth. Sign.</span>
        </div>
      </div>
    </div>
  `;
};

const PRINT_CSS_3INCH = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; overflow-x: hidden; }
  body { font-family: Arial, sans-serif; font-size: 7px; font-weight: 800; background: #fff; }
  @page { size: 4in 55in portrait; margin: 2mm; }
  @media print {
    body { margin: 0; }
    .print-btn { display: none; }
  }

  .print-btn { display: block; margin: 10px auto; padding: 8px 16px; font-size: 12px; background: #7e22ce; color: #fff; border: none; border-radius: 4px; cursor: pointer; }

  .slip-3inch {
    border: 1px solid #222;
    padding: 3px 6px;
    page-break-inside: avoid;
    page-break-after: always;
    transform: rotate(90deg);
    transform-origin: center;
    width: fit-content;
    margin: 40mm auto;
    height: fit-content;
  }

  .slip-3inch:first-of-type {
    margin-top: 20mm;
  }

  .slip-3inch:last-of-type {
    page-break-after: avoid;
    margin-bottom: 0;
  }

  .header-row-3inch { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #222; padding-bottom: 2px; margin-bottom: 2px; gap: 3px; }
  .logo-col-3inch { display: flex; align-items: center; justify-content: center; min-width: 30px; }
  .co-logo-3inch { max-height: 30px; max-width: 50px; object-fit: contain; }
  .company-block-3inch { flex: 1; }
  .company-name-3inch { font-size: 8px; font-weight: 900; letter-spacing: 0.2px; margin-bottom: 1px; }
  .company-addr-3inch { font-size: 6px; font-weight: 800; margin-bottom: 0.5px; }
  .company-contact-3inch { font-size: 6px; font-weight: 800; margin-bottom: 0.5px; }
  .cn-block-3inch { text-align: right; min-width: 80px; }
  .cn-title-3inch { font-size: 7px; font-weight: 900; border: 0.5px solid #222; padding: 0.5px 2px; background: #eee; margin-bottom: 1px; }
  .cn-qr-3inch { width: 50px; height: 50px; display: block; margin: 1px auto; }
  .cn-no-3inch { font-size: 10px; font-weight: 900; letter-spacing: 0.3px; margin-bottom: 0.5px; }
  .cn-date-3inch { font-size: 6px; font-weight: 800; }

  .route-table-3inch { width: 100%; border-collapse: collapse; margin-bottom: 1.5px; font-size: 6px; }
  .route-table-3inch th { border: 0.5px solid #555; padding: 0.5px 2px; text-align: left; background: #e8e8e8; font-weight: 900; }
  .route-table-3inch td { border: 0.5px solid #555; padding: 0.5px 2px; text-align: left; font-weight: 800; }

  .party-row-3inch { display: flex; gap: 2px; margin-bottom: 1.5px; }
  .party-box-3inch { flex: 1; border: 0.5px solid #555; padding: 1.5px 2px; font-size: 6px; }
  .party-title-3inch { font-size: 6px; font-weight: 900; background: #e8e8e8; margin: -1.5px -2px 1px -2px; padding: 0.5px 2px; }
  .party-name-3inch { font-size: 6.5px; font-weight: 900; margin-bottom: 0.5px; }
  .party-addr-3inch { font-size: 5.5px; font-weight: 800; line-height: 1.1; margin-bottom: 0.5px; }
  .party-gstin-3inch { font-size: 5.5px; font-weight: 800; }

  .details-table-3inch { width: 100%; border-collapse: collapse; font-size: 6px; margin-bottom: 1.5px; }
  .details-table-3inch td { border: 0.5px solid #555; padding: 0.5px 2px; font-weight: 800; }
  .detail-label-3inch { background: #e8e8e8; font-weight: 900; width: 18%; }

  .charges-table-3inch { width: 100%; border-collapse: collapse; font-size: 6px; margin-bottom: 1.5px; }
  .charges-table-3inch th { border: 0.5px solid #555; padding: 0.5px 2px; background: #e8e8e8; font-weight: 900; text-align: left; }
  .charges-table-3inch td { border: 0.5px solid #555; padding: 0.5px 2px; font-weight: 800; }
  .amt-cell-3inch { text-align: right; font-weight: 900; }
  .total-row-3inch { background: #f0f0f0; font-weight: 900; font-size: 6.5px; }
  .grand-total-row-3inch { background: #7e22ce; color: white; font-weight: 900; font-size: 6.5px; }

  .footer-3inch { display: flex; justify-content: space-between; border-top: 0.5px solid #444; padding-top: 1px; margin-top: 1px; font-size: 6px; }
  .footer-left-3inch { flex: 1; }
  .footer-right-3inch { text-align: right; }
  .footer-copy-label-3inch { font-weight: 900; font-size: 7px; margin-bottom: 1px; color: #c00; }
  .footer-prepared-3inch { display: flex; gap: 2px; font-weight: 800; margin-bottom: 0.5px; }
  .prepared-label-3inch { font-weight: 900; }
  .prepared-value-3inch { font-weight: 800; }
  .auth-sign-3inch { font-weight: 800; }
`;

export async function printDocketOnDT({ form, charges, ewbList, ewbNoDisplay, company, locations, copies = ["Consignor Copy", "Consignee Copy", "Lorry Copy", "File Copy"] }) {
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
        `SUP:9212312222`,
      ].join("|");
      qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 60, margin: 1, errorCorrectionLevel: "M" });
    } catch (e) {
      console.error("QR generation failed:", e);
    }
  }

  const slipData = { form, charges, ewb, printEwbNo, company, currentLoc, qrDataUrl };

  // Company/location details (same as used in the slip HTML) for native payloads
  const coCompany = company?.company_name || getTenantConfig()?.tenant_name || "";
  const coLocAddr = [currentLoc.loc_address, currentLoc.loc_town, currentLoc.loc_state, currentLoc.loc_postal_code].filter(Boolean).join(", ");
  const coLocPhone = currentLoc.mobile_no || currentLoc.telephone_no || "";
  const coGstin = company?.gstin_no || "";
  const coPan = company?.pan_no || "";
  const coPhone = company?.mobile_no || "";
  const coEmail = company?.email_id || "";
  const logoUrl = getTenantConfig()?.logo_url || "";

  // Structured slip data for the native (React Native WebView) DT printer,
  // built the same way as the docket label/sticker print payloads.
  const qrPayload = [
    `DN:${form.docket_no || ""}`,
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
    `SUP:9212312222`,
  ].join("|");

  const totalFreight = charges.reduce((s, c) => s + (parseFloat(c.charge_amt) || 0), 0);
  const gstPct = 0;
  const gstAmt = (totalFreight * gstPct) / 100;

  const slips = copies.map((copyName) => ({
    copyName: copyName || "",
    company: coCompany,
    companyAddress: coLocAddr,
    companyGstin: coGstin,
    companyPan: coPan,
    companyEmail: coEmail,
    companyPhone: coPhone,
    locationPhone: coLocPhone,
    logoUrl: logoUrl,
    docketNo: form.docket_no || "",
    docketDate: fmtDate(form.docket_date),
    fromTown: form.docket_from_town || form.docket_loc || "",
    toTown: form.docket_to_town || form.docket_to_loc || "",
    transitType: form.transit_type || "",
    loadType: form.load_type || "",
    payType: form.pay_type || "",
    cnorName: form.cnor_name || "",
    cnorAddress: [
      form.cnor_address, form.cnor_city, form.cnor_state,
      form.cnor_pincode ? ` - ${form.cnor_pincode}` : "",
    ].filter(Boolean).join(", "),
    cnorGstin: form.cnor_gstin || "",
    cneeName: form.cnee_name || "",
    cneeAddress: [
      form.cnee_address, form.cnee_city, form.cnee_state,
      form.cnee_pincode ? ` - ${form.cnee_pincode}` : "",
    ].filter(Boolean).join(", "),
    cneeGstin: form.cnee_gstin || "",
    dlyType: form.dly_type || "",
    actWt: form.act_wt || "",
    chrgWt: form.chrg_wt || "",
    totPkgs: form.tot_pkgs || "",
    goodsDesc: form.goods_desc || "",
    invoiceNo: form.invoice_no || "",
    invoiceDate: fmtDate(form.invoice_date),
    invoiceValue: form.invoice_value || "",
    ewbNo: printEwbNo || "",
    ewbValid: fmtDate(ewb.ewb_valid),
    remark: form.remark || "",
    charges: charges.map((c) => ({
      name: c.charge_name || c.charge_code || "",
      amount: fmtAmt(c.charge_amt),
    })),
    totalFreight: fmtAmt(totalFreight),
    gstPct,
    gstAmt: fmtAmt(gstAmt),
    grandTotal: fmtAmt(totalFreight + gstAmt),
    prepareBy: form.prepare_by || "",
    prepareDate: fmtDate(form.prepare_date),
    qrData: qrPayload,
    qrImage: qrDataUrl || "",
  }));

  const slipsHtml = copies.map((copyName) => buildSlipHtml({...slipData, copyName})).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Consignment - ${form.docket_no || ""}</title>
  <style>${PRINT_CSS_3INCH}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print(); window.close();">Print</button>
  ${slipsHtml}
</body>
</html>`;

  printDocketOnDt({
    slips,
    html,
    title: `Consignment - ${form.docket_no || ""}`,
    features: "width=1200,height=800",
  });
}
