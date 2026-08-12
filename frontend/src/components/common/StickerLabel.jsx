import { mergeStyles } from "./stickerUtils";

/**
 * StickerLabel — renders a single 3×2.5in sticker.
 *
 * Props:
 *   level1  : string               — company name
 *   level2  : string               — docket number + date
 *   level3  : { from, to, arrow? } — route row; arrow defaults to "→"
 *   level4  : string               — PKGS line
 *   styles  : { level1?, level2?, routeRow?, routeSide?, routeArrow?, level4? }
 *             — merged on top of defaults from stickerUtils
 */
export default function StickerLabel({ level1, level2, level3, level4, styles }) {
  const S = mergeStyles(styles);
  const arrow = level3?.arrow ?? "→";

  return (
    <div style={S.sticker}>
      <div style={S.level1}>{level1}</div>
      <div style={S.level2}>{level2}</div>
      {level3?.from || level3?.to ? (
        <div style={S.routeRow}>
          <span style={S.routeSide}>{level3.from ?? ""}</span>
          <span style={S.routeArrow}>{arrow}</span>
          <span style={S.routeSide}>{level3.to ?? ""}</span>
        </div>
      ) : (
        <div style={S.level3}>{level3}</div>
      )}
      <div style={S.level4}>{level4}</div>
    </div>
  );
}
