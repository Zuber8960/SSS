/** GST SAC codes commonly used on logistics / GTA invoices (CBIC heading 9965–9985). */

const bySacCode = (a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true });

export const LOGISTICS_SAC_CODES = [
  { code: "996511", desc: "Road transport services of goods" },
  { code: "996512", desc: "Railway transport services of goods" },
  { code: "996513", desc: "Transport of goods in containers by rail" },
  { code: "996519", desc: "Other land transport services of goods" },
  { code: "996521", desc: "Coastal and transoceanic water transport of goods" },
  { code: "996522", desc: "Inland water transport services of goods" },
  { code: "996531", desc: "Air transport services of goods" },
  { code: "996532", desc: "Space transport services of goods" },
  { code: "996601", desc: "Rental of road vehicles with or without operator" },
  { code: "996711", desc: "Cargo handling services" },
  { code: "996719", desc: "Other cargo and baggage handling services" },
  { code: "996729", desc: "Other supporting services for road transport" },
  { code: "996791", desc: "Other supporting transport services n.e.c. (freight forwarding)" },
  { code: "996812", desc: "Courier services" },
  { code: "996813", desc: "Local delivery / messenger services" },
  { code: "997311", desc: "Rental or leasing of motor vehicles without operator" },
  { code: "998521", desc: "Storage and warehousing services" },
].slice().sort(bySacCode);

export const DEFAULT_SAC_CODE = "996511";

export const sacLabel = (code, desc) => {
  const c = String(code || "").trim();
  const d = String(desc || "").trim();
  if (c && d) return `${c} - ${d}`;
  return c || d || "";
};

export const findSac = (value) => {
  const code = String(value || "").split(" - ")[0].trim();
  if (!code) return null;
  return LOGISTICS_SAC_CODES.find((s) => s.code === code) || null;
};

export const formatSac = (value) => {
  const row = findSac(value);
  if (row) return sacLabel(row.code, row.desc);
  const raw = String(value || "").trim();
  return raw;
};
