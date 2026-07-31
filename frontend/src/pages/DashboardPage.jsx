import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { PageBody } from "../components/common/MasterPage";
import { fetchDashboardStats } from "../utils/dashboard";
import "../styles/MasterPage.css";

const COLORS = {
  red: "#dc2626",
  blue: "#2563eb",
  green: "#059669",
  orange: "#ea580c",
  purple: "#7c3aed",
};

function StatCard({ label, value, subtext, color, icon }) {
  const c = COLORS[color] || COLORS.blue;
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 20,
      borderTop: `4px solid ${c}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{label}</span>
        <div style={{ background: `${c}18`, padding: 8, borderRadius: 8, fontSize: 16 }}>{icon}</div>
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 700, color: c }}>
        {value ?? <span style={{ fontSize: 20, color: "#d1d5db" }}>—</span>}
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{subtext}</p>
    </div>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>;
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const W = 580, H = 240, padL = 40, padB = 60, padT = 10, padR = 10;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const slotW = chartW / data.length;
  const barW = Math.max(6, Math.floor(slotW * 0.6));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * max));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {yTicks.map(v => {
        const y = padT + chartH - (v / max) * chartH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{v}</text>
          </g>
        );
      })}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />

      {data.map((d, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const x = cx - barW / 2;
        const barH = Math.max(2, (d.count / max) * chartH);
        const y = padT + chartH - barH;
        const label = String(d.day).slice(0, 10).slice(5); // MM-DD, safe for Date objects or ISO strings
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill="#2563eb" opacity="0.8" />
            {d.count > 0 && (
              <text x={cx} y={y - 4} fontSize="9" fill="#6b7280" textAnchor="middle">{d.count}</text>
            )}
            <text
              x={cx} y={padT + chartH + 10}
              fontSize="9" fill="#9ca3af" textAnchor="end"
              transform={`rotate(-45, ${cx}, ${padT + chartH + 10})`}
            >{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ManifestStatusChart({ completed, inTransit }) {
  const [hovered, setHovered] = useState(null);
  const total = completed + inTransit;
  const circumference = 2 * Math.PI * 54;

  const segmentDefs = [
    { label: "Completed", count: completed, color: "#059669" },
    { label: "On The Way", count: inTransit, color: "#ea580c" },
  ];

  const segments = total === 0 ? [] : segmentDefs.reduce((acc, s) => {
    const arc = (s.count / total) * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1]._next : 0;
    acc.push({ ...s, arc, offset, _next: offset + arc });
    return acc;
  }, []);

  const hoveredSeg = hovered ? segments.find(s => s.label === hovered) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {total === 0 ? (
          <circle cx="90" cy="90" r="54" fill="none" stroke="#f3f4f6" strokeWidth="20" />
        ) : segments.map(s => {
          const isHovered = hovered === s.label;
          return (
            <circle key={s.label} cx="90" cy="90" r="54"
              fill="none"
              stroke={s.color}
              strokeWidth={isHovered ? 28 : 20}
              strokeDasharray={`${s.arc} ${circumference - s.arc}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 90 90)"
              style={{ cursor: "pointer", transition: "stroke-width 0.15s ease" }}
              onMouseEnter={() => setHovered(s.label)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        {hoveredSeg ? (
          <>
            <text x="90" y="84" fontSize="20" fontWeight="700" textAnchor="middle" fill={hoveredSeg.color}>{hoveredSeg.count}</text>
            <text x="90" y="102" fontSize="10" textAnchor="middle" fill="#6b7280">{hoveredSeg.label}</text>
          </>
        ) : (
          <>
            <text x="90" y="84" fontSize="20" fontWeight="700" textAnchor="middle" fill="#111">{total}</text>
            <text x="90" y="102" fontSize="10" textAnchor="middle" fill="#9ca3af">Total</text>
          </>
        )}
      </svg>

      <div style={{ display: "flex", gap: 24 }}>
        {segmentDefs.map(s => (
          <div key={s.label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", opacity: hovered && hovered !== s.label ? 0.4 : 1, transition: "opacity 0.15s" }}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(err => console.error("Dashboard stats error:", err))
      .finally(() => setLoading(false));
  }, []);

  const v = (key) => loading ? "…" : (stats?.[key] ?? 0);

  const cards = [
    [
      { label: "Total DOCKET Booked",   value: v("totalDockets"),       color: "blue",   icon: "📋" },
      { label: "In Transit DOCKET",     value: v("inTransitDockets"),   color: "orange", icon: "🚛" },
      { label: "Undelivered Dockets",   value: v("undeliveredDockets"), color: "red",    icon: "📦" },
      { label: "Delivered Dockets",     value: v("deliveredDockets"),   color: "green",  icon: "✅" },
    ],
    [
      { label: "Delivered But Not Billed", value: v("deliveredNotBilled"),  color: "purple", icon: "💰" },
      { label: "In Transit Vehicles",      value: v("inTransitVehicles"),   color: "orange", icon: "🚚" },
      { label: "Waiting For Dispatch",     value: v("waitingForDispatch"),  color: "blue",   icon: "⏳" },
      { label: "EWB Expiring Today",       value: v("ewbExpiringToday"),    color: "red",    icon: "⚠️" },
    ],
  ];

  return (
    <MainLayout>
      <div style={{
        minHeight: "100%",
        background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 50%, #ecfdf5 100%)",
        padding: 24,
      }}>
        <PageBody title="Dashboard">

          {/* Stat Cards — 2 rows × 4 columns */}
          {cards.map((row, ri) => (
            <div key={ri} style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              marginBottom: 20,
            }} className="dashboardCards">
              {row.map(c => (
                <StatCard key={c.label} {...c} />
              ))}
            </div>
          ))}

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}
            className="dashboardCharts">

            {/* Bar chart — dockets per day */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111" }}>
                  📊 Dockets — Last 30 Days
                </h3>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {loading ? "Loading…" : `${stats?.dailyCounts?.reduce((a, b) => a + b.count, 0) ?? 0} total`}
                </span>
              </div>
              <BarChart data={stats?.dailyCounts} />
            </div>

            {/* Manifest status chart */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: 24,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column",
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111" }}>
                🚛 Manifest Status
              </h3>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loading
                  ? <span style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</span>
                  : <ManifestStatusChart
                      completed={stats?.manifestCompleted ?? 0}
                      inTransit={stats?.manifestInTransit ?? 0}
                    />
                }
              </div>
            </div>
          </div>

        </PageBody>
      </div>
    </MainLayout>
  );
}
