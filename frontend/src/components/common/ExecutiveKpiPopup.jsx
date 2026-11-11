import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, Box, IconButton,
  TextField, InputAdornment, CircularProgress, Chip, Button, Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import TableRowsIcon from "@mui/icons-material/TableRows";
import InsightsIcon from "@mui/icons-material/Insights";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle,
  ReceiptLong, AccountBalanceWallet, Inventory2,
  CancelScheduleSend, AssignmentTurnedIn, Receipt,
  Factory, Group, AirportShuttle, Route,
} from "@mui/icons-material";
import { DataTable } from "./MasterPage";
import { fetchAllDockets } from "../../utils/docket";
import { fetchAllInvoices, fetchBilledDocketNos } from "../../utils/customerBill";
import { fetchInTransitDockets } from "../../utils/dashboard";
import { fetchAllManifests } from "../../utils/manifest";
import { fetchAllLorries } from "../../utils/lorryMaster";
import { fetchAllHireVouchers } from "../../utils/hireVoucher";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchTownsByLocation } from "../../utils/townMaster";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import moment from "moment";
import { getDateFormat } from "../../utils/tenantService";

/**
 * Shared drill-down for every dashboard head and subhead.
 * Filters default to All, with the date range 01-Apr-2026 through today.
 */

const ALL = "ALL";
const DEFAULT_FROM = "2026-04-01";
const TYPES = [ALL, "FTL", "LTL", "SUNDRY"];

const filterSx = {
  background: "#fff",
  overflow: "visible",
  "& .MuiOutlinedInput-root": { height: 28, minHeight: 28, fontSize: 11, borderRadius: "6px", overflow: "visible" },
  "& .MuiInputBase-input, & .MuiAutocomplete-input": { fontSize: "11px !important", paddingTop: "0 !important", paddingBottom: "0 !important" },
  "& .MuiInputLabel-root": {
    fontSize: 11,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#5b21b6",
    zIndex: 1,
    backgroundColor: "#fff",
    padding: "0 4px",
  },
  "& .MuiSvgIcon-root": { fontSize: 16 },
};

const filterMenuSx = {
  "& .MuiAutocomplete-option": { fontSize: 11, minHeight: "24px !important", paddingTop: 2, paddingBottom: 2 },
};

const filterInput = (params, label) => (
  <TextField
    {...params}
    label={label}
    slotProps={{
      ...(params.slotProps || {}),
      inputLabel: { ...(params.slotProps?.inputLabel || {}), shrink: true },
    }}
  />
);

const todayIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format(getDateFormat()) : v;
};

const isoOf = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("YYYY-MM-DD") : "";
};

const codeOf = (v) => String(v || "").split(" - ")[0].trim().toUpperCase();

const normType = (v) => {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes("FTL")) return "FTL";
  if (s.includes("LTL")) return "LTL";
  if (s.includes("SUNDRY")) return "SUNDRY";
  return s;
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const uniqSorted = (values) =>
  [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

const withAll = (values, current) => {
  const list = uniqSorted(values);
  if (current && current !== ALL && !list.includes(current)) list.unshift(current);
  return [ALL, ...list];
};

const cache = {};
const remember = (key, factory) => {
  if (!cache[key]) {
    cache[key] = Promise.resolve()
      .then(factory)
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((err) => {
        delete cache[key];
        throw err;
      });
  }
  return cache[key];
};

const statusPill = (text, bg, fg, bd) => (
  <span style={{
    display: "inline-block", minWidth: "48px", textAlign: "center",
    padding: "0 6px", borderRadius: 999, fontSize: 10, fontWeight: 700, lineHeight: "16px",
    background: bg, color: fg, border: `1px solid ${bd}`,
  }}>
    {text || "—"}
  </span>
);

const docketColumns = [
  { key: "docket_no", label: "Docket No", minWidth: 190, width: 190, align: "left" },
  { key: "docket_date", label: "Docket Date", minWidth: 110 },
  { key: "docket_loc", label: "From Location", minWidth: 120 },
  { key: "docket_pickup_town", label: "From Town", minWidth: 120 },
  { key: "docket_to_loc", label: "To Location", minWidth: 120 },
  { key: "docket_dly_town", label: "To Town", minWidth: 120 },
  { key: "cnor_name", label: "Consignor", minWidth: 150 },
  { key: "cnee_name", label: "Consignee", minWidth: 150 },
  { key: "docket_load_type", label: "Type", minWidth: 90 },
  { key: "docket_tot_pkgs", label: "Packages", minWidth: 90 },
  { key: "docket_act_wt", label: "Actual Wt", minWidth: 90 },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 100 },
  { key: "docket_tot_amt", label: "Total Amount", minWidth: 110 },
  {
    key: "delivery_status", label: "Status", minWidth: 130,
    render: (r) => {
      const s = String(r.delivery_status || "").toLowerCase();
      return s === "delivered"
        ? statusPill(r.delivery_status, "#ecfdf5", "#047857", "#a7f3d0")
        : s === "in transit"
          ? statusPill(r.delivery_status, "#eff6ff", "#1d4ed8", "#bfdbfe")
          : statusPill(r.delivery_status, "#fff7ed", "#c2410c", "#fed7aa");
    },
  },
];

const ewbColumns = [
  ...docketColumns.filter((c) => c.key !== "delivery_status"),
  { key: "ewb_no", label: "EWB No", minWidth: 140 },
  { key: "ewb_valid", label: "EWB Valid Upto", minWidth: 130 },
];

const invoiceColumns = [
  { key: "invoice_no", label: "Invoice No", minWidth: 130 },
  { key: "invoice_date", label: "Invoice Date", minWidth: 110 },
  { key: "bp_name", label: "Customer", minWidth: 180 },
  { key: "loc_code", label: "Loc", minWidth: 100 },
  { key: "invoice_type", label: "Type", minWidth: 100 },
  { key: "total_inv_amt", label: "Invoice Amount", minWidth: 130 },
  { key: "realised_amt", label: "Realised Amount", minWidth: 130 },
  { key: "pending_amt", label: "Pending Amount", minWidth: 130 },
  {
    key: "invoice_status", label: "Status", minWidth: 120,
    render: (r) => (Number(r.pending_amt) > 0
      ? statusPill(r.invoice_status, "#fff7ed", "#c2410c", "#fed7aa")
      : statusPill(r.invoice_status, "#ecfdf5", "#047857", "#a7f3d0")),
  },
];

const vehicleColumns = [
  { key: "desp_veh_no", label: "Vehicle No", minWidth: 130 },
  { key: "mnf_no", label: "Manifest No", minWidth: 120 },
  { key: "mnf_date", label: "Date", minWidth: 110 },
  { key: "mnf_loc", label: "From Loc", minWidth: 100 },
  { key: "mnf_from_town", label: "From Town", minWidth: 120 },
  { key: "mnf_to_loc", label: "To Loc", minWidth: 100 },
  { key: "mnf_to_town", label: "To Town", minWidth: 120 },
  { key: "fleet", label: "Fleet", minWidth: 90 },
  { key: "trip_status", label: "Status", minWidth: 110 },
  { key: "loaded_by", label: "Driver", minWidth: 120 },
];

const fleetColumns = [
  { key: "vehicle_no", label: "Vehicle No", minWidth: 140 },
  { key: "branch_code", label: "Loc", minWidth: 100 },
  { key: "vehicle_ownership", label: "Ownership", minWidth: 110 },
  { key: "vehicle_type", label: "Vehicle Type", minWidth: 130 },
  { key: "owner_name", label: "Owner", minWidth: 160 },
  { key: "is_active", label: "Status", minWidth: 90 },
];

const hireColumns = [
  { key: "vha_no", label: "Hire No", minWidth: 110 },
  { key: "vha_date", label: "Date", minWidth: 110 },
  { key: "vha_loc", label: "Loc", minWidth: 90 },
  { key: "vendor_name", label: "Vendor", minWidth: 180 },
  { key: "vehicle_regis_no", label: "Vehicle", minWidth: 130 },
  { key: "vha_total_amt", label: "Total Hire", minWidth: 110 },
  { key: "vha_advance_total", label: "Paid", minWidth: 100 },
  { key: "balance_amt", label: "Balance", minWidth: 100 },
];

const ACCENTS = {
  purple: ["linear-gradient(135deg, #a855f7, #7c3aed)", "#f3e8ff", "#7c3aed"],
  blue: ["linear-gradient(135deg, #3b82f6, #2563eb)", "#eff6ff", "#2563eb"],
  green: ["linear-gradient(135deg, #34d399, #059669)", "#ecfdf5", "#059669"],
  orange: ["linear-gradient(135deg, #fb923c, #ea580c)", "#fff7ed", "#ea580c"],
  red: ["linear-gradient(135deg, #f87171, #dc2626)", "#fef2f2", "#dc2626"],
  violet: ["linear-gradient(135deg, #8b5cf6, #6d28d9)", "#f5f3ff", "#6d28d9"],
};

const ICONS = {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle, ReceiptLong,
  AccountBalanceWallet, Inventory2, CancelScheduleSend, AssignmentTurnedIn, Receipt,
  Factory, Group, AirportShuttle, Route, Insights: InsightsIcon,
};

const Centered = ({ children }) => (
  <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
    {children}
  </Box>
);

const docketStatus = (d) => {
  const tot = num(d.docket_tot_pkgs);
  const desp = num(d.desp_pkgs);
  if (tot > 0 && desp >= tot) return "Delivered";
  if (desp > 0) return "In Transit";
  return "Pending";
};

const matchesKind = (d, kind, billed) => {
  const tot = num(d.docket_tot_pkgs);
  const desp = num(d.desp_pkgs);
  if (kind === "pickupPending") return desp === 0;
  if (kind === "pickupDone") return desp > 0;
  if (kind === "waiting") return desp === 0 && tot - desp > 0;
  if (kind === "delivered") return tot > 0 && desp >= tot;
  if (kind === "undelivered") return tot - desp > 0;
  if (kind === "deliveredNotBilled") return tot > 0 && desp >= tot && !billed.has(String(d.docket_no || "").trim());
  if (kind === "ewbToday") return isoOf(d.ewb_valid) === todayIso();
  return true;
};

const cancelledInvoice = (inv) =>
  ["Y", "C", "1", "TRUE"].includes(String(inv.cancel_flag || "").trim().toUpperCase());

const passesFilters = (row, filters) => {
  if (filters.loc !== ALL) {
    const locs = [row.docket_loc, row.docket_to_loc, row.loc_code, row.mnf_loc, row.mnf_to_loc, row.vha_loc, row.branch_code]
      .map(codeOf).filter(Boolean);
    if (!locs.includes(codeOf(filters.loc))) return false;
  }
  if (filters.town !== ALL) {
    const towns = [row.docket_pickup_town, row.docket_dly_town, row.docket_from_town, row.docket_to_town, row.mnf_from_town, row.mnf_to_town]
      .map((t) => String(t || "").trim().toLowerCase()).filter(Boolean);
    if (!towns.includes(String(filters.town).trim().toLowerCase())) return false;
  }
  const wantedConsignor = filters.consignor !== ALL ? filters.consignor : filters.partyConsignor;
  if (wantedConsignor) {
    const names = [row.cnor_name, row.bp_name].map((t) => String(t || "").trim().toLowerCase()).filter(Boolean);
    if (!names.includes(String(wantedConsignor).trim().toLowerCase())) return false;
  }
  if (filters.consignee !== ALL) {
    const name = String(row.cnee_name || "").trim().toLowerCase();
    if (name !== String(filters.consignee).trim().toLowerCase()) return false;
  }
  if (filters.type !== ALL) {
    const t = normType(row.docket_load_type || row.load_type || row.invoice_type);
    if (t !== filters.type) return false;
  }
  if (filters.vendor) {
    if (String(row.vendor_name || "").trim().toLowerCase() !== String(filters.vendor).trim().toLowerCase()) return false;
  }
  if (row._rawDate) {
    const d = isoOf(row._rawDate);
    if (!d) return false;
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
  }
  return true;
};

const textMatch = (q, values) => !q || values.some((v) => String(v ?? "").toLowerCase().includes(q));

export default function ExecutiveKpiPopup({ open, detail, onClose }) {
  const spec = detail || {};
  const initialFilters = {
    loc: ALL,
    town: ALL,
    consignor: ALL,
    consignee: ALL,
    type: ALL,
    from: DEFAULT_FROM,
    to: todayIso(),
    vendor: spec.preset?.vendor || "",
    partyConsignor: spec.preset?.consignor || "",
  };

  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dockets, setDockets] = useState([]);
  const [inTransit, setInTransit] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [billedNos, setBilledNos] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [hires, setHires] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locTowns, setLocTowns] = useState([]);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const jobs = [
      remember("locations", fetchAllLocations).then((d) => { if (!cancelled) setLocations(d); }),
      remember("partners", fetchAllBusinessPartners).then((d) => { if (!cancelled) setPartners(d); }),
    ];

    const source = spec.source || "docket";
    const kind = spec.kind || "all";
    if (source === "docket") {
      jobs.push(remember("dockets", () => fetchAllDockets(true)).then((d) => { if (!cancelled) setDockets(d); }));
    }
    if (source === "inTransit") {
      jobs.push(remember("inTransit", fetchInTransitDockets).then((d) => { if (!cancelled) setInTransit(d); }));
    }
    if (source === "invoice") {
      jobs.push(remember("invoices", () => fetchAllInvoices()).then((d) => { if (!cancelled) setInvoices(d); }));
    }
    if (kind === "deliveredNotBilled") {
      jobs.push(remember("billed", fetchBilledDocketNos).then((d) => { if (!cancelled) setBilledNos(d); }));
    }
    if (source === "vehicle" || source === "fleet") {
      jobs.push(remember("manifests", fetchAllManifests).then((d) => { if (!cancelled) setManifests(d); }));
      jobs.push(remember("lorries", fetchAllLorries).then((d) => { if (!cancelled) setLorries(d); }));
    }
    if (source === "hire") {
      jobs.push(remember("hires", () => fetchAllHireVouchers()).then((d) => { if (!cancelled) setHires(d); }));
    }

    Promise.allSettled(jobs).then((results) => {
      if (cancelled) return;
      if (results.some((r) => r.status === "rejected")) setError("Failed to load details.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, spec.source, spec.kind]);

  // Town list comes only from the location-town master for the chosen location.
  useEffect(() => {
    if (!open) return undefined;
    const locCode = filters.loc === ALL ? "" : String(filters.loc).split(" - ")[0].trim();
    if (!locCode) {
      setLocTowns([]);
      return undefined;
    }
    let cancelled = false;
    remember(`towns:${locCode}`, () => fetchTownsByLocation(locCode))
      .then((rows) => { if (!cancelled) setLocTowns(rows); })
      .catch(() => { if (!cancelled) setLocTowns([]); });
    return () => { cancelled = true; };
  }, [open, filters.loc]);

  const locOptions = useMemo(
    () => withAll(locations.map((l) => (l.loc_name ? `${l.loc_code} - ${l.loc_name}` : l.loc_code)), filters.loc),
    [locations, filters.loc],
  );

  const townOptions = useMemo(() => {
    if (filters.loc === ALL) return [ALL];
    return withAll(locTowns.map((t) => t.town_name), filters.town);
  }, [locTowns, filters.loc, filters.town]);

  const consignorOptions = useMemo(() => {
    const names = partners.map((p) => p.bp_name);
    dockets.forEach((d) => names.push(d.cnor_name));
    inTransit.forEach((d) => names.push(d.cnor_name));
    invoices.forEach((i) => names.push(i.bp_name));
    return withAll(names, filters.consignor);
  }, [partners, dockets, inTransit, invoices, filters.consignor]);

  const consigneeOptions = useMemo(() => {
    const names = partners.map((p) => p.bp_name);
    dockets.forEach((d) => names.push(d.cnee_name));
    inTransit.forEach((d) => names.push(d.cnee_name));
    return withAll(names, filters.consignee);
  }, [partners, dockets, inTransit, filters.consignee]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const billed = new Set((billedNos || []).map((n) => String(n).trim()));
    const own = new Set(lorries.map((l) => String(l.vehicle_no || "").trim().toUpperCase()).filter(Boolean));
    const source = spec.source || "docket";
    const kind = spec.kind || "all";
    let list;

    if (source === "invoice") {
      list = invoices.filter((inv) => !cancelledInvoice(inv)).filter((inv) => {
        const submitted = Boolean(inv.inv_sub_date);
        if (kind === "submitted") return submitted;
        if (kind === "unsubmitted") return !submitted;
        return true;
      }).map((inv) => {
        const total = num(inv.total_inv_amt);
        const realised = inv.realised_amt != null ? num(inv.realised_amt) : (inv.inv_sub_date ? total : 0);
        const pending = Math.max(total - realised, 0);
        return {
          ...inv,
          _rawDate: inv.invoice_date,
          total_inv_amt: total.toFixed(2),
          realised_amt: realised.toFixed(2),
          pending_amt: pending.toFixed(2),
          invoice_status: pending > 0 ? "Pending" : "Realised",
        };
      });
    } else if (source === "inTransit") {
      list = inTransit.map((d) => ({
        ...d,
        _rawDate: d.docket_date,
        delivery_status: "In Transit",
        docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
        docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
      }));
    } else if (source === "vehicle") {
      list = manifests.filter((m) => m.desp_veh_no).filter((m) => {
        const veh = String(m.desp_veh_no).trim().toUpperCase();
        const isOwn = own.has(veh);
        if (spec.fleet === "own" && !isOwn) return false;
        if (spec.fleet === "market" && isOwn) return false;
        const arrived = Boolean(m.mnf_arrival_time);
        if (kind === "transit" && arrived) return false;
        if (kind === "arrived" && !arrived) return false;
        return true;
      }).map((m) => ({
        ...m,
        _rawDate: m.mnf_date,
        fleet: own.has(String(m.desp_veh_no).trim().toUpperCase()) ? "Own" : "Market",
        trip_status: m.mnf_arrival_time ? "Arrived" : "In Transit",
      }));
    } else if (source === "fleet") {
      list = lorries.map((l) => ({ ...l, _rawDate: "" }));
    } else if (source === "hire") {
      list = hires.map((h) => ({
        ...h,
        _rawDate: h.vha_date,
        balance_amt: (num(h.vha_total_amt) - num(h.vha_advance_total)).toFixed(2),
        vha_total_amt: num(h.vha_total_amt).toFixed(2),
        vha_advance_total: num(h.vha_advance_total).toFixed(2),
      }));
    } else {
      list = dockets.filter((d) => matchesKind(d, kind, billed)).map((d) => ({
        ...d,
        _rawDate: d.docket_date,
        delivery_status: docketStatus(d),
        docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
        docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
      }));
    }

    return list
      .filter((row) => passesFilters(row, filters))
      .filter((row) => textMatch(q, [
        row.docket_no, row.cnor_name, row.cnee_name, row.docket_loc, row.docket_to_loc,
        row.docket_pickup_town, row.docket_dly_town, row.docket_load_type, row.invoice_no,
        row.bp_name, row.loc_code, row.desp_veh_no, row.mnf_no, row.mnf_loc, row.mnf_to_loc,
        row.vehicle_no, row.owner_name, row.vha_no, row.vendor_name, row.vehicle_regis_no,
        row.ewb_no,
      ]))
      .map((row, i) => ({
        ...row,
        id: `${row.docket_no || row.invoice_no || row.mnf_no || row.vha_no || row.vehicle_no || "row"}_${i}`,
        docket_date: row.docket_date ? toDate(row._rawDate || row.docket_date) : row.docket_date,
        invoice_date: row.invoice_date ? toDate(row._rawDate || row.invoice_date) : row.invoice_date,
        mnf_date: row.mnf_date ? toDate(row._rawDate || row.mnf_date) : row.mnf_date,
        vha_date: row.vha_date ? toDate(row._rawDate || row.vha_date) : row.vha_date,
        ewb_valid: row.ewb_valid ? toDate(row.ewb_valid) : row.ewb_valid,
      }));
  }, [spec.source, spec.kind, spec.fleet, dockets, inTransit, invoices, billedNos, manifests, lorries, hires, filters, search]);

  const columns = spec.kind === "ewbToday"
    ? ewbColumns
    : spec.source === "invoice"
      ? invoiceColumns
      : spec.source === "vehicle"
        ? vehicleColumns
        : spec.source === "fleet"
          ? fleetColumns
          : spec.source === "hire"
            ? hireColumns
            : spec.source === "inTransit"
              ? [...docketColumns.filter((c) => c.key !== "delivery_status"),
                { key: "mnf_no", label: "Manifest No", minWidth: 110 },
                { key: "desp_veh_no", label: "Vehicle", minWidth: 110 },
                docketColumns.find((c) => c.key === "delivery_status")]
              : docketColumns;

  const [grad, soft, strong] = ACCENTS[spec.accent] || ACCENTS.purple;
  const KpiIcon = ICONS[spec.Icon] || InsightsIcon;

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value || ALL }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          width: "1280px",
          height: "780px",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 24px)",
          overflow: "hidden",
          border: `1px solid ${soft}`,
          boxShadow: `0 30px 70px -20px ${strong}55, 0 10px 30px rgba(30,20,60,0.18)`,
          background: `linear-gradient(165deg, ${soft} 0%, #ffffff 42%, #fbfaff 100%)`,
        },
      }}
    >
      <DialogTitle sx={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px 14px 20px", background: grad, color: "#fff", overflow: "hidden", flexShrink: 0,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, position: "relative" }}>
          <Box sx={{
            width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.32)",
          }}>
            <KpiIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {spec.section || "Dashboard"}
            </Box>
            <Box sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {spec.label || "Details"}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, position: "relative" }}>
          <Box sx={{ px: 1.6, py: 0.6, borderRadius: 2.5, textAlign: "center", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
            <Box sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>{spec.value ?? rows.length}</Box>
            <Box sx={{ fontSize: 10, fontWeight: 700, opacity: 0.9, letterSpacing: "0.04em" }}>TOTAL</Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close details" sx={{ color: "#fff", background: "rgba(255,255,255,0.16)", "&:hover": { background: "rgba(255,255,255,0.3)" } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: "16px 16px 12px !important", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", gap: 0.6, alignItems: "center", flexWrap: "wrap", mb: 0.6, pt: "8px", overflow: "visible" }}>
          <Autocomplete size="small" options={locOptions} value={filters.loc} disableClearable
            onChange={(_, v) => setFilters((f) => ({ ...f, loc: v || ALL, town: ALL }))}
            slotProps={{ paper: { sx: filterMenuSx } }}
            sx={{ ...filterSx, flex: "1 1 140px", minWidth: 120 }}
            renderInput={(p) => filterInput(p, "Loc")}
          />
          <Autocomplete size="small" options={townOptions} value={filters.town} disableClearable
            disabled={filters.loc === ALL}
            onChange={(_, v) => setFilter("town", v)}
            slotProps={{ paper: { sx: filterMenuSx } }}
            sx={{ ...filterSx, flex: "1 1 130px", minWidth: 110 }}
            renderInput={(p) => filterInput(p, "Town")}
          />
          <Autocomplete size="small" options={consignorOptions} value={filters.consignor} disableClearable
            onChange={(_, v) => setFilter("consignor", v)}
            slotProps={{ paper: { sx: filterMenuSx } }}
            sx={{ ...filterSx, flex: "1 1 150px", minWidth: 130 }}
            renderInput={(p) => filterInput(p, "Consignor")}
          />
          <Autocomplete size="small" options={consigneeOptions} value={filters.consignee} disableClearable
            onChange={(_, v) => setFilter("consignee", v)}
            slotProps={{ paper: { sx: filterMenuSx } }}
            sx={{ ...filterSx, flex: "1 1 150px", minWidth: 130 }}
            renderInput={(p) => filterInput(p, "Consignee")}
          />
          <Autocomplete size="small" options={TYPES} value={filters.type} disableClearable
            onChange={(_, v) => setFilter("type", v)}
            slotProps={{ paper: { sx: filterMenuSx } }}
            sx={{ ...filterSx, flex: "0 1 100px", minWidth: 90 }}
            renderInput={(p) => filterInput(p, "Type")}
          />
          <TextField size="small" type="date" label="From" value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...filterSx, width: 128 }}
          />
          <TextField size="small" type="date" label="To" value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...filterSx, width: 128 }}
          />
          <Button size="small" variant="outlined" startIcon={<RestartAltIcon sx={{ fontSize: "14px !important" }} />}
            onClick={() => setFilters(initialFilters)}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: 11, color: strong, borderColor: `${strong}55`, borderRadius: 1.5, height: 28, minWidth: 0, px: 1 }}>
            Reset
          </Button>
          {filters.partyConsignor && filters.consignor === ALL && (
            <Chip label={`Consignor: ${filters.partyConsignor}`} onDelete={() => setFilters((f) => ({ ...f, partyConsignor: "" }))}
              sx={{ height: 24, fontSize: 11, fontWeight: 700, background: soft, color: strong, "& .MuiChip-label": { px: 1, fontSize: 11 } }} />
          )}
          {filters.vendor && (
            <Chip label={`Vendor: ${filters.vendor}`} onDelete={() => setFilters((f) => ({ ...f, vendor: "" }))}
              sx={{ height: 24, fontSize: 11, fontWeight: 700, background: soft, color: strong, "& .MuiChip-label": { px: 1, fontSize: 11 } }} />
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mb: 0.6 }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search no, name, town, vehicle..."
            sx={{
              ...filterSx,
              flex: 1,
              "& .MuiOutlinedInput-root": {
                height: 28, minHeight: 28, fontSize: 11, borderRadius: "6px", background: "#fff",
                "& fieldset": { borderColor: "#e6e1f2" },
                "&:hover fieldset": { borderColor: strong },
                "&.Mui-focused fieldset": { borderColor: strong },
              },
            }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: strong, fontSize: 16 }} /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search" sx={{ p: 0.25 }}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Chip
            icon={<TableRowsIcon sx={{ fontSize: "13px !important", color: `${strong} !important` }} />}
            label={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
            size="small"
            sx={{ height: 24, fontWeight: 700, fontSize: 11, background: soft, color: strong, border: `1px solid ${strong}33`, "& .MuiChip-label": { fontSize: 11, px: 0.8 } }}
          />
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 3, background: "#fff", border: "1px solid #ece9f4" }}>
          {loading ? (
            <Centered>
              <CircularProgress size={42} thickness={4} sx={{ color: strong }} />
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Loading details...</span>
            </Centered>
          ) : error && rows.length === 0 ? (
            <Centered>
              <Box sx={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", color: "#dc2626" }}>
                <ErrorOutlineIcon />
              </Box>
              <span style={{ fontSize: 13.5, color: "#dc2626", fontWeight: 700 }}>{error}</span>
            </Centered>
          ) : rows.length === 0 ? (
            <Centered>
              <Box sx={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f4fb", color: "#9ca3af" }}>
                <SearchOffIcon />
              </Box>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No records found</span>
              <span style={{ fontSize: 12.5, color: "#9ca3af" }}>Try All, or widen the date range.</span>
            </Centered>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getKey={(row) => row.id}
              actions={[]}
              compact
              rowHeight={24}
              headerHeight={26}
              isHeight={430}
              scroll={{ afterRows: 12, horizontal: true }}
            />
          )}
        </Box>

        <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 600 }}>
            {spec.source === "fleet"
              ? "Fleet register. Loc, type and the other lists apply. Dates apply to trip records."
              : "Filtered by loc, town, consignor, consignee, type and docket or bill date. All is the default."}
          </span>
          <Button onClick={onClose} size="small" variant="outlined" sx={{
            textTransform: "none", fontWeight: 700, color: strong, borderColor: `${strong}55`, borderRadius: 2,
            "&:hover": { background: soft, borderColor: strong },
          }}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
