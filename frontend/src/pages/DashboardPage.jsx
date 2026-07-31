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
    return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>;
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const W = 560, H = 200, padL = 40, padB = 40, padT = 10, padR = 10;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(4, Math.floor(chartW / data.length) - 2);

  // Show only every Nth label to avoid crowding
  const labelEvery = Math.ceil(data.length / 7);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * max));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* grid + y-axis labels */}
      {yTicks.map(v => {
        const y = padT + chartH - (v / max) * chartH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />

      {/* bars */}
      {data.map((d, i) => {
        const x = padL + i * (chartW / data.length) + (chartW / data.length - barW) / 2;
        const barH = (d.count / max) * chartH;
        const y = padT + chartH - barH;
        const label = String(d.day).slice(5); // MM-DD
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2"
              fill="#2563eb" opacity="0.75" />
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={padT + chartH + 14} fontSize="9" fill="#9ca3af" textAnchor="middle">{label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ statusCounts, total }) {
  if (!statusCounts || statusCounts.length === 0 || total === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="50" fill="none" stroke="#f3f4f6" strokeWidth="18" />
          <text x="80" y="86" fontSize="22" fontWeight="700" textAnchor="middle" fill="#d1d5db">0</text>
        </svg>
        <p style={{ color: "#9ca3af", fontSize: 13 }}>No dockets yet</p>
      </div>
    );
  }

  const palette = ["#ea580c", "#2563eb", "#059669", "#7c3aed", "#dc2626"];
  const circumference = 2 * Math.PI * 50;

  const segments = statusCounts.reduce((acc, s, i) => {
    const arc = (s.count / total) * circumference;
    const runningOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0;
    acc.push({ ...s, arc, offset: runningOffset, nextOffset: runningOffset + arc, color: palette[i % palette.length] });
    return acc;
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {segments.map(s => (
          <circle key={s.status} cx="80" cy="80" r="50"
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${s.arc} ${circumference - s.arc}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="86" fontSize="22" fontWeight="700" textAnchor="middle" fill="#111">{total}</text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center", marginTop: 12 }}>
        {segments.map(s => (
          <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            <span style={{ color: "#6b7280" }}>{s.status}</span>
            <span style={{ fontWeight: 700, color: "#111" }}>{s.count}</span>
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

  const last30Total = stats?.dailyCounts?.reduce((a, b) => a + b.count, 0) ?? 0;

  const cards = [
    {
      label: "Total Dockets",
      value: loading ? "…" : stats?.totalDockets ?? 0,
      subtext: "All time",
      color: "blue",
      icon: "📋",
    },
    {
      label: "Last 30 Days",
      value: loading ? "…" : last30Total,
      subtext: "Dockets this month",
      color: "green",
      icon: "📅",
    },
    {
      label: "Total Lorries",
      value: loading ? "…" : stats?.totalLorries ?? 0,
      subtext: "Registered vehicles",
      color: "orange",
      icon: "🚚",
    },
    {
      label: "Business Partners",
      value: loading ? "…" : stats?.totalBusinessPartners ?? 0,
      subtext: "Active partners",
      color: "purple",
      icon: "🤝",
    },
  ];

  return (
    <MainLayout>
      <div style={{
        minHeight: "100%",
        background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 50%, #ecfdf5 100%)",
        padding: 24,
      }}>
        <PageBody title="Dashboard">

          {/* Stat Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginBottom: 30,
          }}>
            {cards.map(c => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>

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

            {/* Donut chart — docket status */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: 24,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex", flexDirection: "column",
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111" }}>
                📋 Dockets by Pay Type
              </h3>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loading
                  ? <span style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</span>
                  : <DonutChart statusCounts={stats?.statusCounts} total={stats?.totalDockets ?? 0} />
                }
              </div>
            </div>
          </div>

        </PageBody>
      </div>
    </MainLayout>
  );
}
