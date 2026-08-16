import { getTenantConfig } from "../../utils/tenantService";

const toDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2,"0")}-${mo[d.getMonth()]}-${d.getFullYear()}`;
};

const manifestTypeLabels = { lp: "Local Pickup", lh: "Long Haul", ld: "Local Delivery" };

export function printManifest({ header, details, locationsMap }) {
  const h = header || {};
  const rows = Array.isArray(details) ? details : [];
  const tc = getTenantConfig();
  const coName = tc?.tenant_name || "ABC LOGISTICS PRIVATE LIMITED";
  const coAddr = tc?.tenant_address || "Regd Office" || "";
  const logoUrl = tc?.logo_url || "";
  const typeLabel = manifestTypeLabels[h.mnf_type] || h.mnf_type || "";
  const fromLabel = h.mnf_loc || "";
  const toLabel = h.mnf_to_loc || "";

  const rowsHtml = rows.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${d.dwb_no || d.docket_no || ""}</td>
      <td>${toDate(d.dwb_date || d.docket_date)}</td>
      <td>${d.dwb_loc || d.from_loc || d.docket_loc || ""}</td>
      <td>${d.dwb_to_loc || d.to_loc || d.docket_to_loc || ""}</td>
      <td>${d.dwb_pkgs ?? d.packages ?? ""}</td>
      <td>${d.dwb_actual_wt ?? d.weight ?? ""}</td>
      <td>${d.ewb_no || ""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Manifest ${h.mnf_no || ""}</title>
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
      <div class="sub">${coAddr}</div>
    </div>
    <div class="inv-box">
      <h2>MANIFEST</h2>
      <div>No: <strong>${h.mnf_no || ""}</strong></div>
      <div>Date: <strong>${toDate(h.mnf_date)}</strong></div>
      <div>Type: <strong>${typeLabel}</strong></div>
    </div>
  </div>
  <div class="info-row">
    <div class="info-box"><h4>FROM</h4><strong>${fromLabel}</strong><br/>${h.mnf_from_town || ""}</div>
    <div class="info-box"><h4>TO</h4><strong>${toLabel}</strong><br/>${h.mnf_to_town || ""}</div>
  </div>
  <div class="info-row">
    <div class="info-box"><h4>VEHICLE</h4><strong>${h.desp_veh_no || "—"}</strong></div>
    <div class="info-box"><h4>DRIVER</h4><strong>${h.loaded_by || "—"}</strong><br/>${h.driver_mobile ? `Mobile: ${h.driver_mobile}` : ""}</div>
  </div>
  <table>
    <thead>
      <tr><th>Sr</th><th>Docket No</th><th>Date</th><th>From</th><th>To</th><th>Pkgs</th><th>Wt</th><th>EWB</th></tr>
    </thead>
    <tbody>
      ${rowsHtml.length ? rowsHtml : `<tr><td colspan="8" style="text-align:center;padding:16px;font-style:italic">No dockets in this manifest</td></tr>`}
      <tr class="tot-row">
        <td colspan="5" style="text-align:right">TOTAL</td>
        <td>${h.mnf_no_of_pkgs ?? ""}</td>
        <td>${h.mnf_actual_wt ?? ""} KG</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="info-row" style="margin-top:16px">
    <div class="info-box"><h4>REMARKS</h4><div style="font-size:11px">${h.aud_user || "—"}</div></div>
    <div class="info-box"><h4>TOTAL DOCKETS</h4><div style="font-size:14px;font-weight:700">${h.mnf_no_of_dwb ?? ""}</div></div>
  </div>
  <div class="footer">
    <div><strong>Notes:</strong><br/>* Subject to jurisdiction of local courts.<br/>* Computer generated manifest.</div>
    <div class="sign">Authorised Signatory<div style="border-top:1px solid #333;padding-top:4px;margin-top:40px;font-size:10px">${coName}</div></div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1000,height=1200");
  if (!w) { alert("Popup blocked. Please allow popups for printing."); return; }
  w.document.write(html);
  w.document.close();
}