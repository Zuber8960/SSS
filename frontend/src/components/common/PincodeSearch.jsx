import { useState, useEffect, useMemo, useRef } from "react";
import { TextField, Box, Chip, CircularProgress, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DataTable } from "./MasterPage";
import { fetchPincodeByPincode } from "../../utils/pincodeMaster";
import { fetchAllLocations } from "../../utils/locationMaster";
import { getDistanceKm } from "../../utils/distance";

const findNearbyBranches = (lat, lon, branches = [], limit = 3) => {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return [];
  return branches
    .filter((b) => Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude)))
    .map((b) => ({
      loc_code: b.loc_code,
      loc_name: b.loc_name || b.loc_code,
      distance_km: Math.round(getDistanceKm(la, lo, Number(b.latitude), Number(b.longitude)) * 10) / 10,
    }))
    .sort((x, y) => x.distance_km - y.distance_km)
    .slice(0, limit);
};

const pincodeColumns = [
  { key: "pincode",       label: "Pincode",          minWidth: 100 },
  { key: "office_name",   label: "Post Office Name",  minWidth: 170 },
  { key: "district",      label: "District",          minWidth: 120 },
  { key: "state_name",    label: "State",             minWidth: 120 },
  { key: "state_code",    label: "State Code",        minWidth: 100 },
  { key: "latitude",      label: "Latitude",          minWidth: 100 },
  { key: "longitude",     label: "Longitude",         minWidth: 110 },
  { key: "division_name", label: "Division",          minWidth: 120 },
  {
    key: "nearest_branch", label: "Nearest Branch", minWidth: 150,
    render: (r) => <span style={{ fontWeight: 600, color: "#7c3aed" }}>{r.nearest_branch}</span>,
  },
  { key: "nearest_distance", label: "Distance (km)", minWidth: 90 },
  {
    key: "near_branches_text", label: "Near Branch Offices", minWidth: 220,
    render: (r) => <span style={{ color: "#334155" }}>{r.near_branches_text}</span>,
  },
];

/**
 * Self-contained pincode search widget.
 * Props:
 *   tableHeight  {number}  Height passed to DataTable (default 320)
 *   accent       {string}  Accent colour for search bar / spinner (default "#7c3aed")
 */
export default function PincodeSearch({ tableHeight = 320, accent = "#7c3aed" }) {
  const [searchText, setSearchText]   = useState("");
  const [pincodes, setPincodes]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [branches, setBranches]       = useState([]);
  const timerRef = useRef(null);

  // Load branch offices once on mount (location cache makes repeat calls free)
  useEffect(() => {
    fetchAllLocations()
      .then((locs) => {
        const all = Array.isArray(locs) ? locs : [];
        const branchRows = all.filter((l) => String(l.loc_type || "").toUpperCase() === "BRANCH");
        const usable = (branchRows.length ? branchRows : all).filter(
          (l) => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude))
        );
        setBranches(usable);
      })
      .catch(() => {});
  }, []);

  function handleSearch(text) {
    setSearchText(text);
    clearTimeout(timerRef.current);
    if (!text.trim()) {
      setPincodes([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetchPincodeByPincode(text.trim());
        const list = Array.isArray(res) ? res : res ? [res] : [];
        setPincodes(list);
      } catch {
        setPincodes([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  const rows = useMemo(() =>
    pincodes.map((p, i) => {
      const near = findNearbyBranches(p.latitude, p.longitude, branches);
      return {
        ...p,
        id: `${p.pincode}_${p.office_name}_${i}`,
        latitude:  Number.isFinite(Number(p.latitude))  ? String(Number(p.latitude))  : "—",
        longitude: Number.isFinite(Number(p.longitude)) ? String(Number(p.longitude)) : "—",
        nearest_branch:    near[0]?.loc_name ?? "—",
        nearest_distance:  near[0] ? String(near[0].distance_km) : "—",
        near_branches_text: near.length
          ? near.map((b) => `${b.loc_name} (${b.distance_km} km)`).join(", ")
          : "—",
      };
    }), [pincodes, branches]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Search bar */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", marginBottom: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Enter pincode number to search…"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: accent, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiInputBase-input": { fontSize: 14 },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#c4b5fd", borderWidth: 1.5 },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: accent },
            "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: accent },
          }}
        />
        <Chip
          label={`${rows.length} result${rows.length !== 1 ? "s" : ""}`}
          sx={{
            background: "#f3e8ff", color: accent, fontWeight: 600,
            border: "1.5px solid #d8b4fe", fontSize: 13, height: 32, flexShrink: 0,
          }}
        />
      </Box>

      {/* Body */}
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 2 }}>
          <CircularProgress size={48} thickness={4} sx={{ color: accent }} />
          <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Searching pincode…</span>
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 2 }}>
          <span style={{ fontSize: 34 }}>📍</span>
          <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>
            {searchText.trim() ? "No pincode found for the entered value." : "Enter a pincode number above to search."}
          </span>
        </Box>
      ) : (
        <DataTable
          columns={pincodeColumns}
          rows={rows}
          getKey={(row, i) => row.id || i}
          actions={[]}
          isHeight={tableHeight}
        />
      )}
    </Box>
  );
}
