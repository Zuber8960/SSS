import moment from "moment";
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

export function printSticker({ form, company }) {
  const {
    docket_no,
    docket_date,
    docket_from_town,
    docket_loc,
    docket_to_town,
    docket_to_loc,
    tot_pkgs,
  } = form;

  const tenantConfig = getTenantConfig();

  const level1 = company?.company_name || tenantConfig?.tenant_name || "";

  const docketDate = docket_date
    ? moment(docket_date).format("DD-MMM-YY").toUpperCase()
    : "";
  const level2 = `${docket_no || ""}&nbsp;&nbsp;&nbsp;${docketDate}`;

  const fromTown = (docket_from_town || "").toUpperCase();
  const fromLoc  = (docket_loc || "").toUpperCase();
  const toTown   = (docket_to_town || "").toUpperCase();
  const toLoc    = (docket_to_loc || "").toUpperCase();
  const fromDisplay = fromTown && fromLoc && fromTown !== fromLoc ? `${fromTown} (${fromLoc})` : fromTown || fromLoc;
  const toDisplay   = toTown && toLoc && toTown !== toLoc ? `${toTown} (${toLoc})` : toTown || toLoc;

  const totalPkgs = parseInt(tot_pkgs) || 1;

  const stickersHtml = Array.from({ length: totalPkgs }, (_, i) =>
    buildStickerHtml({
      level1,
      level2,
      level3: { from: fromDisplay, to: toDisplay },
      level4: `PKGS : ${i + 1}/${totalPkgs}`,
      styles: STICKER_STYLES,
    })
  ).join("");

  const printWindow = window.open("", "_blank", "width=420,height=500");
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Sticker - ${docket_no || ""}</title>
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
