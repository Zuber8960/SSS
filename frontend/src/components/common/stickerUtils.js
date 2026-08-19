/** Default styles — shared by StickerLabel (React) and buildStickerHtml (print) */
export const DEFAULT_STYLES = {
  sticker: {
    width: "3in",
    height: "3in",
    border: "2px solid #000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    gap: "7px",
    overflow: "hidden",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    background: "#fff",
  },
  level1: {
    fontSize: 14,
    fontWeight: 900,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },
  level2: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
  routeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
  },
  routeSide: {
    fontSize: 10,
    fontWeight: 800,
    textAlign: "center",
    flex: 1,
  },
  routeArrow: {
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  },
  level3: {
    fontSize: 10,
    fontWeight: 800,
    textAlign: "center",
  },
  level4: {
    fontSize: 13,
    fontWeight: 900,
    textAlign: "center",
  },
};

/** Merges caller-supplied style overrides on top of defaults */
export function mergeStyles(overrides = {}) {
  return {
    sticker:    { ...DEFAULT_STYLES.sticker,    ...overrides.sticker    },
    level1:     { ...DEFAULT_STYLES.level1,     ...overrides.level1     },
    level2:     { ...DEFAULT_STYLES.level2,     ...overrides.level2     },
    routeRow:   { ...DEFAULT_STYLES.routeRow,   ...overrides.routeRow   },
    routeSide:  { ...DEFAULT_STYLES.routeSide,  ...overrides.routeSide  },
    routeArrow: { ...DEFAULT_STYLES.routeArrow, ...overrides.routeArrow },
    level3:     { ...DEFAULT_STYLES.level3,     ...overrides.level3     },
    level4:     { ...DEFAULT_STYLES.level4,     ...overrides.level4     },
  };
}

const UNITLESS = new Set([
  "fontWeight", "lineHeight", "flex", "flexShrink", "flexGrow", "opacity", "zIndex",
]);

/** Converts a React style object to an HTML inline-style string */
export function toInline(obj) {
  if (!obj) return "";
  return Object.entries(obj)
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      const val  = typeof v === "number" && !UNITLESS.has(k) ? `${v}px` : v;
      return `${prop}:${val}`;
    })
    .join(";");
}

/**
 * Builds the HTML string for one sticker — used by the print window.
 * Accepts level1/level2/level3/level4 + optional styles, qrDataUrl, supportNo.
 */
export function buildStickerHtml({ level1, level2, level3, level4, styles, qrDataUrl, supportNo }) {
  const S = mergeStyles(styles);
  const arrow = level3?.arrow ?? "&#8594;";

  const level3Html = (level3?.from || level3?.to)
    ? `<div style="${toInline(S.routeRow)}">
        <span style="${toInline(S.routeSide)}">${level3.from ?? ""}</span>
        <span style="${toInline(S.routeArrow)}">${arrow}</span>
        <span style="${toInline(S.routeSide)}">${level3.to ?? ""}</span>
       </div>`
    : `<div style="${toInline(S.level3)}">${level3 ?? ""}</div>`;

  const supportHtml = supportNo
    ? `<div style="font-size:9px;font-weight:800;text-align:center;width:100%;margin-top:3px;border-top:1px solid #555;padding-top:3px;">Support: &#9990; ${supportNo}</div>`
    : "";

  if (qrDataUrl) {
    return `
      <div style="${toInline(S.sticker)}">
        <div style="${toInline(S.level1)}">${level1 ?? ""}</div>
        <div style="display:flex;align-items:center;gap:8px;width:100%;flex:1;">
          <img src="${qrDataUrl}" style="width:75px;height:75px;flex-shrink:0;" alt="QR" />
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0;overflow:hidden;">
            <div style="${toInline(S.level2)}">${level2 ?? ""}</div>
            ${level3Html}
            <div style="${toInline(S.level4)}">${level4 ?? ""}</div>
          </div>
        </div>
        ${supportHtml}
      </div>`;
  }

  return `
    <div style="${toInline(S.sticker)}">
      <div style="${toInline(S.level1)}">${level1 ?? ""}</div>
      <div style="${toInline(S.level2)}">${level2 ?? ""}</div>
      ${level3Html}
      <div style="${toInline(S.level4)}">${level4 ?? ""}</div>
      ${supportHtml}
    </div>`;
}

/** Base print-window CSS — only reset/layout; sizing comes from inline styles */
export const STICKER_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; font-family: Arial, sans-serif; }
  @page { size: 3in 3in; margin: 0; }
  div { page-break-after: always; }
  div:last-child { page-break-after: avoid; }
  .print-btn {
    display: block; margin: 10px auto; padding: 8px 24px;
    font-size: 14px; background: #7e22ce; color: #fff;
    border: none; border-radius: 6px; cursor: pointer;
  }
`;
