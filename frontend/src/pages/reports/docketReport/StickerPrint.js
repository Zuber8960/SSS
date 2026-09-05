import QRCode from "qrcode";
import { getTenantConfig } from "../../../utils/tenantService";
import { STICKER_PRINT_CSS, buildStickerHtml } from "../../../components/common/stickerUtils";
import { openPrintDocument } from "../../../utils/printBridge";

const STICKER_STYLES = {
  level1: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  level2: {
    fontSize: 18,
    fontWeight: 900,
  },
  routeRow: {
    gap: 4,
  },
  routeSide: {
    fontSize: 10,
    fontWeight: 800,
  },
  routeArrow: {
    fontSize: 12,
    fontWeight: 900,
  },
  level3: {
    fontSize: 10,
    fontWeight: 800,
  },
  level4: {
    fontSize: 13,
    fontWeight: 900,
  },
};

const SUPPORT_NO = "9212312222";

/**
 * Opens a sticker print window for a row selected in DocketReport.
 * @param {object} row     - Selected grid row (mappedDockets shape)
 * @param {object} company - Company master record
 */
export async function printStickerFromRow({ row, company }) {
  const tenantConfig = getTenantConfig();

  const level1 = company?.company_name || tenantConfig?.tenant_name || "";

  // docket_date is already formatted as DD-MM-YYYY in the grid row
  const docketDate = (row.docket_date || "").toUpperCase();

  const fromTown = (row.docket_pickup_town || row.docket_from_town || row.docket_loc || "").toUpperCase();
  const toTown   = (row.docket_dly_town   || row.docket_to_town   || row.docket_to_loc || "").toUpperCase();

  const totalPkgs = parseInt(row.docket_tot_pkgs) || 1;

  // Generate QR code with all key shipment details
  let qrDataUrl = "";
  if (row.docket_no) {
    try {
      const qrPayload = [
        `DN:${row.docket_no}`,
        `DD:${docketDate}`,
        `FR:${fromTown}`,
        `TO:${toTown}`,
        `PKGS:${row.docket_tot_pkgs || ""}`,
        `AWT:${row.docket_act_wt || ""}`,
        `CWT:${row.docket_chrg_wt || ""}`,
        `CNOR:${row.cnor_name || ""}`,
        `CNEE:${row.cnee_name || ""}`,
        `INV:${row.docket_inv_no || ""}`,
        `INVDT:${row.docket_inv_date || ""}`,
        `SUP:${SUPPORT_NO}`,
      ].join("|");
      qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 80, margin: 1, errorCorrectionLevel: "M" });
    } catch (e) {
      console.error("QR generation failed:", e);
    }
  }

  const stickersHtml = Array.from({ length: totalPkgs }, (_, i) =>
    buildStickerHtml({
      level1,
      level2: row.docket_no || "",
      level3: { from: fromTown, to: toTown },
      level4: `${docketDate ? docketDate + "  |  " : ""}PKGS: ${i + 1}/${totalPkgs}`,
      styles: STICKER_STYLES,
      qrDataUrl,
      supportNo: SUPPORT_NO,
    })
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sticker - ${row.docket_no || ""}</title>
  <style>${STICKER_PRINT_CSS}</style>
</head>
<body>
  <button class="print-btn" id="printBtn"
    onclick="document.getElementById('printBtn').style.display='none'; window.print(); document.getElementById('printBtn').style.display='block';">
    Print Stickers
  </button>
  ${stickersHtml}
</body>
</html>`;
  openPrintDocument({ html, title: `Sticker - ${row.docket_no || ""}`, features: "width=420,height=500" });
}
