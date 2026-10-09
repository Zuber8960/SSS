import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, Box, IconButton,
  TextField, InputAdornment, CircularProgress, Chip, Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import TableRowsIcon from "@mui/icons-material/TableRows";
import InsightsIcon from "@mui/icons-material/Insights";
import {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle,
  ReceiptLong, AccountBalanceWallet, Inventory2,
  CancelScheduleSend, AssignmentTurnedIn, Receipt,
} from "@mui/icons-material";
import { DataTable } from "./MasterPage";
import { fetchAllDockets } from "../../utils/docket";
import { fetchAllInvoices } from "../../utils/customerBill";
import { fetchInTransitDockets } from "../../utils/dashboard";
import { fetchDeliveryNotes } from "../../utils/deliveryNote";
import { toIstDisplay as toDate } from "../../utils/date";

/**
 * ExecutiveKpiPopup — drill-down popup opened when an Executive Overview KPI
 * card is clicked. Shows the full detail grid for that metric.
 *
 * IMPORTANT — where each metric's data actually lives:
 *   • `delivery_status` is NOT part of the GET /docket list payload. It is stored
 *     in the delivery_note table, so it is read via GET /deliveryNote and merged
 *     onto each docket by docket_no (same approach as CustomerBill.jsx).
 *   • "In Transit" is not a delivery_status value at all — it is derived from
 *     manifest dispatch. The dashboard KPI counts GET /dashboard/in-transit-dockets,
 *     so this popup uses that same endpoint to stay consistent with the card count.
 *   • Billing KPIs read GET /customerBill.
 *
 * Each source is fetched lazily on first open and cached afterwards.
 */

// Date display uses shared IST helper (utils/date.js) — see import above.

const statusPill = (text, bg, fg, bd) => (
  <span style={{
    display: "inline-block", minWidth: "62px", textAlign: "center",
    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: bg, color: fg, border: `1px solid ${bd}`,
  }}>
    {text || "—"}
  </span>
);

// ── Docket grid columns (mirrors DocketReport) ─────────────────────────────
const docketColumns = [
  { key: "docket_no", label: "Docket No", minWidth: 120 },
  { key: "docket_date", label: "Docket Date", minWidth: 110 },
  { key: "docket_loc", label: "From Location", minWidth: 120 },
  { key: "docket_pickup_town", label: "From Town", minWidth: 120 },
  { key: "docket_to_loc", label: "To Location", minWidth: 120 },
  { key: "docket_dly_town", label: "To Town", minWidth: 120 },
  { key: "cnor_name", label: "Consignor", minWidth: 150 },
  { key: "cnee_name", label: "Consignee", minWidth: 150 },
  { key: "docket_tot_pkgs", label: "Packages", minWidth: 90 },
  { key: "docket_act_wt", label: "Actual Wt", minWidth: 90 },
  { key: "docket_chrg_wt", label: "Charged Wt", minWidth: 100 },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 100 },
  { key: "docket_load_type", label: "Load Type", minWidth: 100 },
  { key: "docket_transit_type", label: "Transit Type", minWidth: 110 },
  { key: "docket_rate", label: "Rate", minWidth: 80 },
  { key: "docket_rate_uom", label: "Rate UOM", minWidth: 90 },
  { key: "docket_tot_amt", label: "Total Amount", minWidth: 110 },
  {
    key: "delivery_status", label: "Delivery Status", minWidth: 130,
    render: (r) => {
      const s = String(r.delivery_status || "").toLowerCase();
      return s === "delivered"
        ? statusPill(r.delivery_status, "#ecfdf5", "#047857", "#a7f3d0")
        : s === "in transit"
          ? statusPill(r.delivery_status, "#eff6ff", "#1d4ed8", "#bfdbfe")
          : statusPill(r.delivery_status, "#fff7ed", "#c2410c", "#fed7aa");
    },
  },
  { key: "aud_user_name", label: "Created By", minWidth: 130 },
  { key: "aud_date", label: "Created Date", minWidth: 130 },
  { key: "docket_remark", label: "Remarks", minWidth: 150 },
];

const invoiceColumns = [
  { key: "invoice_no", label: "Invoice No", minWidth: 130 },
  { key: "invoice_date", label: "Invoice Date", minWidth: 110 },
  { key: "bp_name", label: "Customer", minWidth: 180 },
  { key: "bp_code", label: "BP Code", minWidth: 110 },
  { key: "loc_code", label: "Branch", minWidth: 100 },
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
  { key: "created_by", label: "Created By", minWidth: 120 },
];

// ── KPI label → data source + delivery_status filter ───────────────────────
// "In Transit" uses its own endpoint (see header note); the rest read dockets
// and filter on the delivery-note status merged onto each row.
const KPI_CONFIG = {
  "orders placed":     { source: "docket", status: null },
  "pickup pending":    { source: "docket", status: "Pending" },
  "in transit":        { source: "inTransit" },
  "delivered":         { source: "docket", status: "Delivered" },
  "billing submitted": { source: "invoice" },
  "realised":          { source: "invoice" },
};

// Normalise a delivery-note status so "Delivered" / "Partially Delivered" etc.
// compare predictably. Returns "" when the docket has no delivery note yet.
const normStatus = (v) => String(v || "").trim().toLowerCase();

const statusMatches = (docketStatus, wanted) => {
  const w = normStatus(wanted);
  const s = normStatus(docketStatus);
  if (!w) return true;                 // no filter (e.g. Orders Placed)
  if (!s) return false;
  if (s === w) return true;
  // "Delivered" KPI should also include "Partially Delivered"
  if (w === "delivered" && s === "partially delivered") return true;
  return false;
};

// ── Popup accent — mirrors DashboardOverview ACCENTS so the dialog matches
// the colour of the KPI card that opened it.
const ACCENTS = {
  purple: ["linear-gradient(135deg, #a855f7, #7c3aed)", "#f3e8ff", "#7c3aed"],
  blue:   ["linear-gradient(135deg, #3b82f6, #2563eb)", "#eff6ff", "#2563eb"],
  green:  ["linear-gradient(135deg, #34d399, #059669)", "#ecfdf5", "#059669"],
  orange: ["linear-gradient(135deg, #fb923c, #ea580c)", "#fff7ed", "#ea580c"],
  red:    ["linear-gradient(135deg, #f87171, #dc2626)", "#fef2f2", "#dc2626"],
  violet: ["linear-gradient(135deg, #8b5cf6, #6d28d9)", "#f5f3ff", "#6d28d9"],
};

// KPI icon lookup — mirrors DashboardOverview so the popup header shows the
// same glyph as the card that opened it.
const ICONS = {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle, ReceiptLong,
  AccountBalanceWallet, Inventory2, CancelScheduleSend, AssignmentTurnedIn, Receipt,
};

// ── Shared empty / loading state layouts ───────────────────────────────────
const Centered = ({ children }) => (
  <Box sx={{
    height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 1.5,
  }}>
    {children}
  </Box>
);

const Bubble = ({ children, tone }) => (
  <Box sx={{
    width: 60, height: 60, borderRadius: "50%", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: tone === "error" ? "#fef2f2" : "#f6f4fb",
    color: tone === "error" ? "#dc2626" : "#9ca3af",
  }}>
    {children}
  </Box>
);

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ExecutiveKpiPopup({ open, kpi, onClose }) {
  const [dockets, setDockets] = useState([]);
  const [inTransit, setInTransit] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notes, setNotes] = useState({});        // docket_no → delivery note
  // Set from async callbacks only (never synchronously in the effect body)
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const cfg = KPI_CONFIG[String(kpi?.label || "").trim().toLowerCase()] || { source: "docket" };
  const isInvoice = cfg.source === "invoice";
  const isInTransit = cfg.source === "inTransit";

  // Fetch on first open — each source is cached across subsequent KPI clicks.
  // The parent keys this component by KPI label, so search/error reset per open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const jobs = [];
    const needDockets = cfg.source === "docket" && dockets.length === 0;
    const needInTransit = isInTransit && inTransit.length === 0;
    const needInvoices = isInvoice && invoices.length === 0;
    // Delivery status lives in the delivery_note table — needed to filter
    // Delivered / Pickup Pending dockets.
    const needNotes = cfg.source === "docket" && !!cfg.status && Object.keys(notes).length === 0;

    if (!needDockets && !needInTransit && !needInvoices && !needNotes) return;

    if (needDockets) {
      jobs.push(
        fetchAllDockets(true)
          .then((d) => { if (!cancelled) setDockets(Array.isArray(d) ? d : []); })
          .catch(() => { if (!cancelled) setError("Failed to load docket details."); })
      );
    }
    if (needInTransit) {
      jobs.push(
        fetchInTransitDockets()
          .then((d) => { if (!cancelled) setInTransit(Array.isArray(d) ? d : []); })
          .catch(() => { if (!cancelled) setError("Failed to load in-transit dockets."); })
      );
    }
    if (needInvoices) {
      jobs.push(
        fetchAllInvoices()
          .then((i) => { if (!cancelled) setInvoices(Array.isArray(i) ? i : []); })
          .catch(() => { if (!cancelled) setError("Failed to load billing details."); })
      );
    }
    if (needNotes) {
      jobs.push(
        fetchDeliveryNotes()
          .then((list) => {
            if (cancelled) return;
            const map = {};
            (Array.isArray(list) ? list : []).forEach((n) => {
              if (n.docket_no) map[n.docket_no] = n;
            });
            setNotes(map);
          })
          .catch(() => { if (!cancelled) setError("Failed to load delivery status."); })
      );
    }

    Promise.allSettled(jobs).finally(() => { if (!cancelled) setAttempted(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cfg.source, cfg.status, isInTransit, isInvoice]);

  // Loading is derived: show the spinner until this KPI's data has arrived
  const loading = open && !attempted && (
    (cfg.source === "docket" && (dockets.length === 0 || (!!cfg.status && Object.keys(notes).length === 0))) ||
    (isInTransit && inTransit.length === 0) ||
    (isInvoice && invoices.length === 0)
  );

  const branchCode = useMemo(() => {
    const currentUser = JSON.parse(localStorage.getItem("current_user") || "null");
    return currentUser?.location_id || localStorage.getItem("loc_code") || "";
  }, []);

  // ── Build rows for the active source ────────────────────────────────────
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (...vals) => !q || vals.some((v) => String(v ?? "").toLowerCase().includes(q));

    if (isInvoice) {
      return invoices
        .filter((inv) => {
          if (branchCode && (inv.loc_code || "").toLowerCase() !== branchCode.toLowerCase()) return false;
          return match(inv.invoice_no, inv.bp_name, inv.bp_code, inv.loc_code, inv.invoice_type, inv.invoice_status);
        })
        .map((inv, i) => {
          const total = num(inv.total_inv_amt);
          const realised = inv.realised_amt != null ? num(inv.realised_amt) : total;
          const pending = Math.max(total - realised, 0);
          return {
            ...inv,
            id: `${inv.invoice_no || ""}_${inv.invoice_date || ""}_${i}`,
            invoice_date: toDate(inv.invoice_date),
            total_inv_amt: total.toFixed(2),
            realised_amt: realised.toFixed(2),
            pending_amt: pending.toFixed(2),
            invoice_status: inv.invoice_status || (pending > 0 ? "Pending" : "Realised"),
          };
        });
    }

    // "In Transit" — rows already come filtered from /dashboard/in-transit-dockets
    if (isInTransit) {
      return inTransit
        .filter((d) => {
          if (branchCode && (d.docket_loc || "").toLowerCase() !== branchCode.toLowerCase()) return false;
          return match(
            d.docket_no, d.cnor_name, d.cnee_name, d.docket_pickup_town, d.docket_dly_town,
            d.docket_loc, d.docket_to_loc, d.mnf_no, d.desp_veh_no, d.docket_pay_type,
          );
        })
        .map((d, i) => ({
          ...d,
          id: `${d.docket_no || ""}_${i}`,
          docket_date: toDate(d.docket_date),
          docket_tot_pkgs: d.docket_tot_pkgs ?? d.total_pkgs ?? "",
          docket_act_wt: d.docket_act_wt ?? d.actual_wt ?? "",
          docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
          docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
          delivery_status: "In Transit",
        }));
    }

    // Docket-based KPIs — merge the delivery-note status, then filter on it
    return dockets
      .map((d) => {
        const note = notes[d.docket_no];
        const resolved = note?.delivery_status || d.delivery_status || "Pending";
        return { d, resolved };
      })
      .filter(({ d, resolved }) => {
        if (branchCode && (d.docket_loc || "").toLowerCase() !== branchCode.toLowerCase()) return false;
        if (!statusMatches(resolved, cfg.status)) return false;
        return match(
          d.docket_no, d.cnor_name, d.cnee_name, d.docket_pickup_town, d.docket_dly_town,
          d.docket_loc, d.docket_to_loc, resolved,
        );
      })
      .map(({ d, resolved }, i) => ({
        ...d,
        id: `${d.docket_no || ""}_${d.docket_date || ""}_${i}`,
        docket_date: toDate(d.docket_date),
        docket_tot_pkgs: d.docket_tot_pkgs ?? d.total_pkgs ?? "",
        docket_act_wt: d.docket_act_wt ?? d.actual_wt ?? "",
        docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
        docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
        delivery_status: resolved,
      }));
  }, [dockets, inTransit, invoices, notes, isInvoice, isInTransit, cfg.status, search, branchCode]);

  // In-transit rows carry manifest/vehicle info that the docket list lacks
  const columns = isInvoice
    ? invoiceColumns
    : isInTransit
      ? [...docketColumns.filter((c) => c.key !== "delivery_status"),
         { key: "mnf_no", label: "Manifest No", minWidth: 110 },
         { key: "desp_veh_no", label: "Vehicle", minWidth: 110 },
         { key: "delivery_status", label: "Delivery Status", minWidth: 130,
           render: (r) => statusPill(r.delivery_status, "#eff6ff", "#1d4ed8", "#bfdbfe") }]
      : docketColumns;

  const [grad, soft, strong] = ACCENTS[kpi?.accent] || ACCENTS.purple;
  const KpiIcon = ICONS[kpi?.Icon] || InsightsIcon;

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
          height: "660px",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "hidden",
          border: `1px solid ${soft}`,
          boxShadow: `0 30px 70px -20px ${strong}55, 0 10px 30px rgba(30,20,60,0.18)`,
          background: `linear-gradient(165deg, ${soft} 0%, #ffffff 42%, #fbfaff 100%)`,
        },
      }}
    >
      {/* ── Header: gradient banner with soft glow blobs ── */}
      <DialogTitle
        sx={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 14px 20px",
          background: grad,
          color: "#fff",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* decorative light blobs */}
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Box sx={{
            position: "absolute", top: -46, right: 60, width: 130, height: 130,
            borderRadius: "50%", background: "rgba(255,255,255,0.16)", filter: "blur(6px)",
          }} />
          <Box sx={{
            position: "absolute", bottom: -58, left: 120, width: 150, height: 150,
            borderRadius: "50%", background: "rgba(255,255,255,0.10)", filter: "blur(8px)",
          }} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, position: "relative" }}>
          <Box sx={{
            width: 42, height: 42, borderRadius: 2.5, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.32)",
            backdropFilter: "blur(4px)",
          }}>
            <KpiIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: 11, fontWeight: 700, opacity: 0.85, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Executive Overview
            </Box>
            <Box sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {kpi?.label || "Details"}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, position: "relative" }}>
          <Box sx={{
            px: 1.6, py: 0.6, borderRadius: 2.5, textAlign: "center",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}>
            <Box sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>{kpi?.value ?? 0}</Box>
            <Box sx={{ fontSize: 10, fontWeight: 700, opacity: 0.9, letterSpacing: "0.04em" }}>TOTAL</Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close details"
            sx={{
              color: "#fff",
              background: "rgba(255,255,255,0.16)",
              "&:hover": { background: "rgba(255,255,255,0.3)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: "14px 16px 12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* ── Toolbar: search + result count ── */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5, flexWrap: "wrap" }}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${isInvoice ? "invoices" : "dockets"} by no, name, town...`}
            sx={{
              flex: 1, minWidth: 250,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5, background: "#fff",
                boxShadow: "0 1px 3px rgba(30,20,60,0.06)",
                "& fieldset": { borderColor: "#e6e1f2" },
                "&:hover fieldset": { borderColor: strong },
                "&.Mui-focused fieldset": { borderColor: strong, borderWidth: 1.5 },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: strong }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search">
                    <CloseIcon fontSize="small" sx={{ color: "#9ca3af" }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Chip
            icon={<TableRowsIcon sx={{ fontSize: "15px !important", color: `${strong} !important` }} />}
            label={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
            size="small"
            sx={{
              height: 34, fontWeight: 800, fontSize: 12.5,
              background: soft, color: strong, border: `1px solid ${strong}33`,
            }}
          />
        </Box>

        {/* ── Detail grid ── */}
        <Box sx={{
          flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 3,
          background: "#fff", border: "1px solid #ece9f4",
          boxShadow: "0 4px 18px rgba(80,60,140,0.08)",
        }}>
          {loading ? (
            <Centered>
              <CircularProgress size={42} thickness={4} sx={{ color: strong }} />
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Loading details...</span>
            </Centered>
          ) : error ? (
            <Centered>
              <Bubble tone="error"><ErrorOutlineIcon /></Bubble>
              <span style={{ fontSize: 13.5, color: "#dc2626", fontWeight: 700 }}>{error}</span>
            </Centered>
          ) : rows.length === 0 ? (
            <Centered>
              <Bubble><SearchOffIcon sx={{ fontSize: 28 }} /></Bubble>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No records found</span>
              <span style={{ fontSize: 12.5, color: "#9ca3af" }}>
                {search ? `No matches for "${search}"` : "There is no data for this metric yet."}
              </span>
            </Centered>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getKey={(row) => row.id}
              actions={[]}
              isHeight={430}
              scroll={{ afterRows: 20, horizontal: true }}
            />
          )}
        </Box>

        {/* ── Footer ── */}
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 600 }}>
            {isInvoice
              ? "Showing billing records for the selected metric"
              : isInTransit
                ? "Showing dockets currently in transit with their manifest & vehicle"
                : "Showing docket details filtered by the selected metric"}
          </span>
          <Button onClick={onClose} size="small" variant="outlined" sx={{
            textTransform: "none", fontWeight: 700, fontSize: 12.5,
            color: strong, borderColor: `${strong}55`, borderRadius: 2, px: 2,
            "&:hover": { background: soft, borderColor: strong },
          }}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
