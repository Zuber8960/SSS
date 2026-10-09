import moment from "moment";

/**
 * Central date helper — ALL backend dates must go through here.
 *
 * Root cause of "one day back": Postgres timestamptz serialises as
 * ISO-8601 UTC, e.g. "2026-10-04T18:30:00.000Z" (= Oct-05 00:00 IST).
 * substring(0,10) or browser-local moment() then yields the UTC calendar
 * day instead of the IST calendar day.
 *
 * Rules:
 *  - DATE columns arriving as "YYYY-MM-DD" (len<=10) → returned as-is.
 *  - Anything with a time / zone → rendered with fixed +05:30 (IST),
 *    never the browser timezone.
 */

export function toIstMoment(value) {
  if (!value) return null;
  if (typeof value === "string" && value.trim().length <= 10) {
    const m = moment(value.trim(), ["YYYY-MM-DD", "DD-MM-YYYY", "MM/DD/YYYY"], true);
    if (m.isValid()) return m.utcOffset(330, true);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return moment(d).utcOffset(330);
}

/** For <input type="date"> / form state — "YYYY-MM-DD" in IST */
export function toIstDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length <= 10) {
      const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  const m = toIstMoment(value);
  if (m) return m.format("YYYY-MM-DD");
  const fb = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
  return fb ? `${fb[1]}-${fb[2]}-${fb[3]}` : "";
}

/** For display labels / tables / prints — "DD-MM-YYYY" in IST */
export function toIstDisplay(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const t = value.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(t)) return t;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const [y, mo, d] = t.split("-");
      return `${d}-${mo}-${y}`;
    }
  }
  const m = toIstMoment(value);
  if (m) return m.format("DD-MM-YYYY");
  return String(value);
}

/** Normalise delivery-note payloads that may be object | array | null */
export function normNote(noteData) {
  if (!noteData) return null;
  if (Array.isArray(noteData)) return noteData[0] || null;
  return noteData;
}

export default { toIstDate, toIstDisplay, toIstMoment, normNote };
