import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Tabs, Tab, Box, IconButton,
  CircularProgress, Chip, InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { DataTable } from "./MasterPage";
import { fetchAllDockets } from "../../utils/docket";
import { fetchAllManifests } from "../../utils/manifest";
import { fetchAllInvoices } from "../../utils/customerBill";
import { fetchAllBusinessPartners } from "../../utils/businessPartner";
import { fetchPincodeByPincode } from "../../utils/pincodeMaster";
import { fetchAllLocations } from "../../utils/locationMaster";
import moment from "moment";

const toDate = (v) => {
  if (!v) return "";
  const m = moment(v);
  return m.isValid() ? m.format("DD-MM-YYYY") : v;
};

const fmtNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? String(n) : "0";
};

const fmtAmt = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const fmtGeo = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? String(n) : "—";
};

// ── Geo helpers for finding branch offices near a pincode ───────────────────
const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearbyBranches = (lat, lon, branches = [], limit = 3) => {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return [];
  const withCoords = branches.filter((b) => (
    Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude))
  ));
  return withCoords
    .map((b) => ({
      loc_code: b.loc_code,
      loc_name: b.loc_name || b.loc_code,
      distance_km: Math.round(haversineKm(la, lo, Number(b.latitude), Number(b.longitude)) * 10) / 10,
    }))
    .sort((x, y) => x.distance_km - y.distance_km)
    .slice(0, limit);
};

// ── Column definitions per tab ──────────────────────────────────────────────
const docketColumns = [
  { key: "docket_no", label: "Docket No", minWidth: 140 },
  { key: "docket_date", label: "Date", minWidth: 100 },
  { key: "docket_loc", label: "From Loc", minWidth: 100 },
  { key: "docket_pickup_town", label: "From Town", minWidth: 110 },
  { key: "docket_to_loc", label: "To Loc", minWidth: 100 },
  { key: "docket_dly_town", label: "To Town", minWidth: 110 },
  { key: "cnor_name", label: "Consignor", minWidth: 140 },
  { key: "cnee_name", label: "Consignee", minWidth: 140 },
  { key: "docket_tot_pkgs", label: "Pkgs", minWidth: 50 },
  { key: "docket_act_wt", label: "Wt", minWidth: 70 },
  { key: "docket_pay_type", label: "Pay Type", minWidth: 90 },
  { key: "docket_tot_amt", label: "Amount", minWidth: 100 },
  { key: "delivery_status", label: "Status", minWidth: 110 },
];

const manifestColumns = [
  { key: "mnf_no", label: "Manifest No", minWidth: 110 },
  { key: "mnf_date", label: "Date", minWidth: 100 },
  { key: "mnf_loc", label: "From Loc", minWidth: 100 },
  { key: "mnf_to_loc", label: "To Loc", minWidth: 100 },
  { key: "desp_veh_no", label: "Vehicle", minWidth: 120 },
  { key: "loaded_by", label: "Driver", minWidth: 110 },
  { key: "mnf_no_of_dwb", label: "Dockets", minWidth: 80 },
  { key: "mnf_no_of_pkgs", label: "Pkgs", minWidth: 80 },
  { key: "mnf_actual_wt", label: "Weight", minWidth: 90 },
  { key: "mnf_from_town", label: "From Town", minWidth: 110 },
  { key: "mnf_to_town", label: "To Town", minWidth: 110 },
  {
    key: "manifest_status", label: "Status", minWidth: 100,
    render: (r) => (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: "60px", height: "22px", borderRadius: "4px", fontSize: 11, fontWeight: 700, padding: "0 8px",
        ...(r.manifest_status === "Arrived"
          ? { background: "#e8f5e9", color: "#1b5e20", border: "1px solid #a5d6a7" }
          : { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }),
      }}>
        {r.manifest_status}
      </span>
    ),
  },
];

const invoiceColumns = [
  { key: "invoice_no", label: "Invoice No", minWidth: 110 },
  { key: "invoice_date", label: "Date", minWidth: 100 },
  { key: "bp_name", label: "Customer", minWidth: 150 },
  { key: "loc_code", label: "Branch", minWidth: 100 },
  { key: "invoice_type", label: "Type", minWidth: 90 },
  { key: "total_inv_amt", label: "Amount", minWidth: 110 },
  { key: "created_by", label: "Created By", minWidth: 100 },
];

const customerColumns = [
  { key: "bp_code", label: "Code", minWidth: 90 },
  { key: "bp_name", label: "Name", minWidth: 180 },
  { key: "bp_type", label: "Type", minWidth: 100 },
  { key: "bp_addres", label: "Address", minWidth: 200 },
  { key: "bp_city", label: "City", minWidth: 100 },
  { key: "bp_state", label: "State", minWidth: 100 },
  { key: "bp_pincode", label: "Pincode", minWidth: 90 },
  { key: "bp_gstin", label: "GSTIN", minWidth: 150 },
  { key: "bp_pan_no", label: "PAN", minWidth: 120 },
  { key: "bp_status", label: "Status", minWidth: 90 },
];

const pincodeColumns = [
  { key: "pincode", label: "Pincode", minWidth: 100 },
  { key: "office_name", label: "Post Office Name", minWidth: 170 },
  { key: "district", label: "District", minWidth: 120 },
  { key: "state_name", label: "State", minWidth: 120 },
  { key: "state_code", label: "State Code", minWidth: 100 },
  { key: "latitude", label: "Latitude", minWidth: 100 },
  { key: "longitude", label: "Longitude", minWidth: 110 },
  { key: "division_name", label: "Division", minWidth: 120 },
  // { key: "region_name", label: "Region", minWidth: 120 },
  // { key: "circle_name", label: "Circle", minWidth: 120 },
  // { key: "office_type", label: "Office Type", minWidth: 110 },
  {
    key: "nearest_branch", label: "Nearest Branch", minWidth: 150,
    render: (r) => (
      <span style={{ fontWeight: 600, color: "#7c3aed" }}>{r.nearest_branch}</span>
    ),
  },
  { key: "nearest_distance", label: "Distance (km)", minWidth: 90 },
  {
    key: "near_branches_text", label: "Near Branch Offices", minWidth: 220,
    render: (r) => (
      <span style={{ color: "#334155" }}>{r.near_branches_text}</span>
    ),
  },
];

const TAB_LABELS = {
  docket: "📋 Dockets",
  manifest: "🚛 Manifests",
  invoice: "🧾 Invoices",
  customer: "🏢 Customers",
  pincode: "📍 Pincode",
};

export default function GetAllDetailsPopup({ open, onClose }) {
  const [tab, setTab] = useState("docket");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [dockets, setDockets] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  // Load all data (EXCEPT pincodes — those are fetched on-demand on search)
  useEffect(() => {
    if (!open) return;
    if (loaded) return;

    setLoading(true);
    const loadAll = async () => {
      try {
        const [d, m, i, c, l] = await Promise.allSettled([
          fetchAllDockets(true),
          fetchAllManifests(),
          fetchAllInvoices(),
          fetchAllBusinessPartners(),
          fetchAllLocations(),
        ]);

        if (d.status === "fulfilled") setDockets(Array.isArray(d.value) ? d.value : []);
        if (m.status === "fulfilled") setManifests(Array.isArray(m.value) ? m.value : []);
        if (i.status === "fulfilled") setInvoices(Array.isArray(i.value) ? i.value : []);
        if (c.status === "fulfilled") setCustomers(Array.isArray(c.value) ? c.value : []);

        if (l.status === "fulfilled") {
          const locs = Array.isArray(l.value) ? l.value : [];
          // Prefer dedicated branch offices; fall back to any location with coordinates.
          const branchRows = locs.filter((lo) => String(lo.loc_type || "").toUpperCase() === "BRANCH");
          const usable = (branchRows.length ? branchRows : locs).filter(
            (lo) => Number.isFinite(Number(lo.latitude)) && Number.isFinite(Number(lo.longitude))
          );
          setBranches(usable);
        }

        setLoaded(true);
      } catch (err) {
        console.error("Failed to load all details:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [open, loaded]);

  // Fetch pincode from the API only when the user searches on the Pincode tab,
  // so we never load the full ~1.5-lakh master into memory.
  useEffect(() => {
    if (tab !== "pincode") return;

    const timer = setTimeout(async () => {
      const q = searchText.trim();
      if (!q) {
        setPincodes([]);
        setPincodeLoading(false);
        return;
      }

      setPincodeLoading(true);
      try {
        const res = await fetchPincodeByPincode(q);
        const list = Array.isArray(res) ? res : res ? [res] : [];
        setPincodes(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Pincode search failed:", err);
        setPincodes([]);
      } finally {
        setPincodeLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [tab, searchText]);

  // Reset search when tab changes
  const handleTabChange = (_, newTab) => {
    setTab(newTab);
    setSearchText("");
  };

  const handleClose = () => {
    onClose();
  };

  // ── Filtered data per tab ────────────────────────────────────────────────
  const filteredDockets = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return dockets;
    return dockets.filter((d) => [
      d.docket_no, d.cnor_name, d.cnee_name,
      d.docket_pickup_town, d.docket_dly_town,
      d.docket_loc, d.docket_to_loc, d.delivery_status,
    ].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [dockets, searchText]);

  const filteredManifests = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return manifests;
    return manifests.filter((m) => [
      m.mnf_no, m.mnf_loc, m.mnf_to_loc,
      m.desp_veh_no, m.loaded_by, m.driver_mobile,
      m.mnf_from_town, m.mnf_to_town,
    ].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [manifests, searchText]);

  const filteredInvoices = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter((inv) => [
      inv.invoice_no, inv.bp_name, inv.loc_code,
      inv.invoice_type, inv.created_by,
    ].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [invoices, searchText]);

  const filteredCustomers = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => [
      c.bp_code, c.bp_name, c.bp_type, c.bp_city,
      c.bp_state, c.bp_gstin, c.bp_pan_no,
    ].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [customers, searchText]);

  // Pincode rows are fetched pre-filtered from the backend (byPincode), so no client-side filter needed
  const filteredPincodes = pincodes;

  // ── Mapped rows for display ──────────────────────────────────────────────
  const mappedDockets = useMemo(() =>
    filteredDockets.map((d, i) => ({
      ...d,
      id: (d.docket_no || "") + "_" + (d.docket_date || "") + "_" + i,
      docket_date: toDate(d.docket_date),
      docket_tot_pkgs: d.docket_tot_pkgs ?? d.total_pkgs ?? "",
      docket_act_wt: d.docket_act_wt ?? d.actual_wt ?? "",
      docket_pickup_town: d.docket_pickup_town || d.docket_from_town || "",
      docket_dly_town: d.docket_dly_town || d.docket_to_town || "",
      delivery_status: d.delivery_status || "Pending",
    })), [filteredDockets]);

  const mappedManifests = useMemo(() =>
    filteredManifests.map((m, i) => ({
      ...m,
      id: (m.mnf_no || "") + "_" + (m.mnf_loc || "") + "_" + (m.mnf_date || "") + "_" + i,
      mnf_date: toDate(m.mnf_date),
      mnf_no_of_dwb: fmtNum(m.mnf_no_of_dwb),
      mnf_no_of_pkgs: fmtNum(m.mnf_no_of_pkgs),
      mnf_actual_wt: fmtNum(m.mnf_actual_wt),
      manifest_status: m.mnf_arrival_time ? "Arrived" : "In Transit",
    })), [filteredManifests]);

  const mappedInvoices = useMemo(() =>
    filteredInvoices.map((inv, i) => ({
      ...inv,
      id: (inv.invoice_no || "") + "_" + (inv.invoice_date || "") + "_" + i,
      invoice_date: toDate(inv.invoice_date),
      total_inv_amt: fmtAmt(inv.total_inv_amt),
      invoice_type: inv.invoice_type === "CM" ? "Complimentary" : inv.invoice_type === "C" ? "Regular" : inv.invoice_type || "",
    })), [filteredInvoices]);

  const mappedCustomers = useMemo(() =>
    filteredCustomers.map((c, i) => ({
      ...c,
      id: (c.bp_code || "") + "_" + i,
      bp_status: c.bp_status === "1" ? "Active" : c.bp_status === "0" ? "Inactive" : c.bp_status || "",
    })), [filteredCustomers]);

  const mappedPincodes = useMemo(() =>
    filteredPincodes.map((p, i) => {
      const nearBranches = findNearbyBranches(p.latitude, p.longitude, branches);
      return {
        ...p,
        id: (p.pincode || "") + "_" + (p.office_name || "") + "_" + i,
        latitude: fmtGeo(p.latitude),
        longitude: fmtGeo(p.longitude),
        nearest_branch: nearBranches[0]?.loc_name || "—",
        nearest_distance: nearBranches[0] ? String(nearBranches[0].distance_km) : "—",
        near_branches_text: nearBranches.length
          ? nearBranches.map((b) => `${b.loc_name} (${b.distance_km} km)`).join(", ")
          : "—",
      };
    }), [filteredPincodes, branches]);

  const getCurrentData = () => {
    switch (tab) {
      case "docket": return { columns: docketColumns, rows: mappedDockets };
      case "manifest": return { columns: manifestColumns, rows: mappedManifests };
      case "invoice": return { columns: invoiceColumns, rows: mappedInvoices };
      case "customer": return { columns: customerColumns, rows: mappedCustomers };
      case "pincode": return { columns: pincodeColumns, rows: mappedPincodes };
      default: return { columns: [], rows: [] };
    }
  };

  const { columns, rows } = getCurrentData();
  const currentCount = rows.length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: "1100px",
          height: "500px",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "hidden",
          background: "linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%)",
        },
      }}
    >
      <DialogTitle sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderBottom: "1px solid #e9d5ff",
        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
        color: "#fff",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <span style={{ fontSize: 22 }}>🔍</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Search Engine</span>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: "#fff", "&:hover": { background: "rgba(255,255,255,0.15)" } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: "20px 24px", overflow: "hidden" }}>
        {/* ── Search bar ── */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", margin: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`Search ${TAB_LABELS[tab]?.toLowerCase() || "data"}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#7c3aed", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiInputBase-input": { fontSize: 14 },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#c4b5fd", borderWidth: 1.5 },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#7c3aed" },
              "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#7c3aed" },
            }}
          />
          <Chip
            label={`${currentCount} result${currentCount !== 1 ? "s" : ""}`}
            sx={{
              background: "#f3e8ff", color: "#7c3aed", fontWeight: 600,
              border: "1.5px solid #d8b4fe", fontSize: 13, height: 32,
            }}
          />
        </Box>

        {/* ── Tabs ── */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            marginBottom: 2,
            "& .MuiTab-root": {
              fontSize: 13, fontWeight: 600, textTransform: "none",
              minHeight: 40, padding: "6px 16px",
            },
            "& .Mui-selected": { color: "#7c3aed" },
            "& .MuiTabs-indicator": { background: "#7c3aed" },
          }}
        >
          <Tab value="docket" label={TAB_LABELS.docket} />
          <Tab value="manifest" label={TAB_LABELS.manifest} />
          <Tab value="invoice" label={TAB_LABELS.invoice} />
          <Tab value="customer" label={TAB_LABELS.customer} />
          <Tab value="pincode" label={TAB_LABELS.pincode} />
        </Tabs>

        {/* ── Loading / content state ── */}
        {tab === "pincode" ? (
          pincodeLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 2 }}>
              <CircularProgress size={48} thickness={4} sx={{ color: "#7c3aed" }} />
              <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Searching pincode...</span>
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 2 }}>
              <span style={{ fontSize: 34 }}>📍</span>
              <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>
                {searchText.trim()
                  ? "No pincode found for the entered value."
                  : "Enter a pincode number above to search."}
              </span>
            </Box>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getKey={(row, i) => row.id || i}
              actions={[]}
              isHeight={320}
            />
          )
        ) : (
          loading && !loaded ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 2 }}>
              <CircularProgress size={48} thickness={4} sx={{ color: "#7c3aed" }} />
              <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Loading all data...</span>
            </Box>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getKey={(row, i) => row.id || i}
              actions={[]}
              isHeight={320}
            />
          )
        )}
      </DialogContent>

      {/* <DialogActions sx={{ padding: "12px 24px", borderTop: "1px solid #e9d5ff", background: "#fff" }}>
        <Button
          onClick={handleClose}
          variant="contained"
          sx={{
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            "&:hover": { background: "linear-gradient(135deg, #6b21a8, #9333ea)" },
            textTransform: "none", fontWeight: 600, borderRadius: 2,
          }}
        >
          Close
        </Button>
      </DialogActions> */}
    </Dialog>
  );
}