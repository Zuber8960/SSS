import { getTenantConfig } from "../../../utils/tenantService";
import { STICKER_PRINT_CSS, buildStickerHtml } from "../../../components/common/stickerUtils";

const STICKER_STYLES = {
  level1: {
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  level2: {
    fontSize: 11,
    fontWeight: 700,
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

/**
 * Opens a sticker print window for a row selected in DocketReport.
 * @param {object} row     - Selected grid row (mappedDockets shape)
 * @param {object} company - Company master record
 */
export function printStickerFromRow({ row, company }) {
  const tenantConfig = getTenantConfig();

  const level1 = company?.company_name || tenantConfig?.tenant_name || "";

  // docket_date is already formatted as DD-MM-YYYY in the grid row
  const docketDate = (row.docket_date || "").toUpperCase();
  const level2 = `${row.docket_no || ""}&nbsp;&nbsp;&nbsp;${docketDate}`;

  const fromTown = (row.docket_pickup_town || row.docket_from_town || row.docket_loc || "").toUpperCase();
  const toTown   = (row.docket_dly_town   || row.docket_to_town   || row.docket_to_loc || "").toUpperCase();

  const totalPkgs = parseInt(row.docket_tot_pkgs) || 1;

  const stickersHtml = Array.from({ length: totalPkgs }, (_, i) =>
    buildStickerHtml({
      level1,
      level2,
      level3: { from: fromTown, to: toTown },
      level4: `PKGS : ${i + 1}/${totalPkgs}`,
      styles: STICKER_STYLES,
    })
  ).join("");

  const printWindow = window.open("", "_blank", "width=420,height=500");
  printWindow.document.write(`<!DOCTYPE html>
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
</html>`);
  printWindow.document.close();
}
