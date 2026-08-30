import { useState, useRef, useEffect } from "react";
import { getDistanceKm } from "../../utils/distance";
import { fetchPincodeData } from "../../utils/pincodeMaster";


const OSRM = "https://router.project-osrm.org/route/v1/driving";

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchGroundKm(lat1, lng1, lat2, lng2) {
  const url = `${OSRM}/${lng1},${lat1};${lng2},${lat2}?overview=false`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.code === "Ok" && json.routes?.[0]) {
    return Math.round(json.routes[0].distance / 10) / 100;
  }
  return null;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ResultCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 28px",
      borderTop: `4px solid ${color}`,
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      minWidth: 180, textAlign: "center", flex: 1,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Coordinate input pair
function CoordPair({ label, color, lat, lng, onLat, onLng }) {
  const inp = (value, onChange, placeholder) => (
    <input
      type="number" step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 12px", border: "1.5px solid #d1d5db", borderRadius: 8,
        fontSize: 14, outline: "none", width: 170, fontFamily: "monospace",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => (e.target.style.borderColor = color)}
      onBlur={(e)  => (e.target.style.borderColor = "#d1d5db")}
    />
  );

  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1.5px solid #e2e8f0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        📍 {label}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Latitude</label>
          {inp(lat, onLat, "e.g. 18.9750")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Longitude</label>
          {inp(lng, onLng, "e.g. 72.8258")}
        </div>
      </div>
    </div>
  );
}

// District search input with dropdown
function DistrictSearch({ label, color, value, onSelect }) {
  const [query, setQuery]     = useState(value?.label || "");
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [fetching, setFetching] = useState(false);
  const wrapRef    = useRef(null);
  const timerRef   = useRef(null);
  const cancelRef  = useRef(false);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleQueryChange(text) {
    setQuery(text);
    onSelect(null);
    clearTimeout(timerRef.current);
    cancelRef.current = true;

    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(() => {
      cancelRef.current = false;
      setFetching(true);
      fetchPincodeData({ district: text.trim(), limit: 30 })
        .then((rows) => {
          if (cancelRef.current) return;
          const seen = new Map();
          rows.forEach((r) => {
            const key = r.district?.trim().toUpperCase();
            if (key && !seen.has(key) && r.latitude && r.longitude) {
              seen.set(key, {
                label: `${r.district}${r.state_name ? `, ${r.state_name}` : ""}`,
                district: r.district,
                state: r.state_name,
                lat: Number(r.latitude),
                lng: Number(r.longitude),
              });
            }
          });
          setResults([...seen.values()]);
          setOpen(seen.size > 0);
        })
        .catch(() => { if (!cancelRef.current) setResults([]); })
        .finally(() => { if (!cancelRef.current) setFetching(false); });
    }, 350);
  }

  function pick(item) {
    setQuery(item.label);
    setOpen(false);
    onSelect(item);
  }

  function clear() {
    setQuery("");
    setResults([]);
    onSelect(null);
  }

  return (
    <div ref={wrapRef} style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px", border: "1.5px solid #e2e8f0", position: "relative" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        📍 {label}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Type district name…"
          style={{
            padding: "8px 36px 8px 12px", border: "1.5px solid #d1d5db", borderRadius: 8,
            fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = color)}
          onBlur={(e)  => (e.target.style.borderColor = "#d1d5db")}
        />
        {query && (
          <button onClick={clear} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 220, overflowY: "auto", marginTop: 4,
        }}>
          {fetching ? (
            <div style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 13 }}>Searching…</div>
          ) : results.map((r, i) => (
            <div
              key={i}
              onMouseDown={() => pick(r)}
              style={{
                padding: "10px 16px", cursor: "pointer", fontSize: 14,
                borderBottom: i < results.length - 1 ? "1px solid #f1f5f9" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <span style={{ fontWeight: 600, color: "#111" }}>{r.district}</span>
              {r.state && <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>{r.state}</span>}
              <span style={{ float: "right", fontSize: 11, color: "#d1d5db", fontFamily: "monospace" }}>
                {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}

      {value && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DistanceCalculator() {
  const [mode, setMode] = useState("coords");

  const [lat1, setLat1] = useState("");
  const [lng1, setLng1] = useState("");
  const [lat2, setLat2] = useState("");
  const [lng2, setLng2] = useState("");

  const [district1, setDistrict1] = useState(null);
  const [district2, setDistrict2] = useState(null);

  const [aerial, setAerial]   = useState(null);
  const [ground, setGround]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const coordsValid   = [lat1, lng1, lat2, lng2].every((v) => v !== "" && !isNaN(Number(v)));
  const districtValid = district1 !== null && district2 !== null;
  const canCalculate  = mode === "coords" ? coordsValid : districtValid;

  function clearResults() { setAerial(null); setGround(null); setError(""); }

  function resetAll() {
    setLat1(""); setLng1(""); setLat2(""); setLng2("");
    setDistrict1(null); setDistrict2(null);
    clearResults();
  }

  async function calculate() {
    if (!canCalculate) return;
    clearResults();
    setLoading(true);

    const a1 = mode === "coords" ? Number(lat1) : district1.lat;
    const o1 = mode === "coords" ? Number(lng1) : district1.lng;
    const a2 = mode === "coords" ? Number(lat2) : district2.lat;
    const o2 = mode === "coords" ? Number(lng2) : district2.lng;

    setAerial(getDistanceKm(a1, o1, a2, o2));

    try {
      const km = await fetchGroundKm(a1, o1, a2, o2);
      if (km !== null) {
        setGround(km);
      } else {
        setError("OSRM returned no route — locations may be unreachable by road.");
      }
    } catch {
      setError("Could not fetch ground distance — OSRM may be unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const hasResult = aerial !== null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 60%, #ecfdf5 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: 32,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        padding: "32px 36px", width: "100%", maxWidth: 660, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 26 }}>📐</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111" }}>Distance Calculator</h1>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309",
            border: "1px solid #fde68a", borderRadius: 6, padding: "2px 8px",
            letterSpacing: 1, textTransform: "uppercase",
          }}>Dev Tool</span>
        </div>

      {/* Mode toggle */}
      <div style={{
        display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4,
        marginBottom: 24, width: "fit-content",
      }}>
        {[
          { key: "coords",   label: "🌐 Lat / Lng" },
          { key: "district", label: "🗺️ District" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); clearResults(); }}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 13, transition: "all 0.15s",
              background: mode === key ? "#fff" : "transparent",
              color: mode === key ? "#7c3aed" : "#6b7280",
              boxShadow: mode === key ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {mode === "coords" ? (
          <>
            <CoordPair label="Location 1" color="#7c3aed" lat={lat1} lng={lng1} onLat={setLat1} onLng={setLng1} />
            <CoordPair label="Location 2" color="#059669" lat={lat2} lng={lng2} onLat={setLat2} onLng={setLng2} />
          </>
        ) : (
          <>
            <DistrictSearch label="Location 1" color="#7c3aed" value={district1} onSelect={setDistrict1} />
            <DistrictSearch label="Location 2" color="#059669" value={district2} onSelect={setDistrict2} />
          </>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={calculate}
          disabled={!canCalculate || loading}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
            background: canCalculate && !loading ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#e5e7eb",
            color: canCalculate && !loading ? "#fff" : "#9ca3af",
            fontWeight: 700, fontSize: 15,
            cursor: canCalculate && !loading ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Calculating…" : "Calculate Distance"}
        </button>
        {(hasResult || lat1 || lat2 || district1 || district2) && (
          <button
            onClick={resetAll}
            style={{
              padding: "11px 20px", borderRadius: 10, border: "1.5px solid #e5e7eb",
              background: "#fff", color: "#6b7280", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 8,
          background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {hasResult && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
            Results
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <ResultCard label="Aerial Distance" value={`${aerial.toFixed(2)} km`} sub="Straight-line · Haversine" color="#2563eb" />
            {ground !== null ? (
              <ResultCard label="Ground Distance" value={`${ground.toFixed(2)} km`} sub="By road · OSRM" color="#059669" />
            ) : loading ? (
              <div style={{
                background: "#f8fafc", borderRadius: 12, padding: "20px 28px", flex: 1,
                border: "1.5px dashed #d1d5db", textAlign: "center", color: "#9ca3af", fontSize: 13,
              }}>
                Fetching road distance…
              </div>
            ) : null}
            {ground !== null && (
              <ResultCard label="Road Factor" value={`${(ground / aerial).toFixed(2)}×`} sub="Ground ÷ Aerial" color="#ea580c" />
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
