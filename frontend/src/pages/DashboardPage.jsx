import MainLayout from "../layouts/MainLayout";
import { PageBody } from "../components/common/MasterPage";
import "../styles/MasterPage.css";

// StatCard Component
function StatCard({ label, value, subtext, colorClass, icon }) {
  const borderColors = {
    red: "#dc2626",
    blue: "#2563eb",
    green: "#059669",
    orange: "#ea580c"
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        borderTop: `4px solid ${borderColors[colorClass]}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.3s ease"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{
          background: `${borderColors[colorClass]}15`,
          padding: 8,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16
        }}>
          {icon}
        </div>
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 700, color: borderColors[colorClass] }}>
        {value}
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{subtext}</p>
    </div>
  );
}

// Simple Line Chart Component
function LineChart() {
  return (
    <div style={{ position: "relative", width: "100%", height: 300 }}>
      <svg width="100%" height="100%" viewBox="0 0 600 300" style={{ overflow: "visible" }}>
        {/* Grid */}
        <line x1="50" y1="270" x2="580" y2="270" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="50" y1="210" x2="580" y2="210" stroke="#f3f4f6" strokeWidth="1" />
        <line x1="50" y1="150" x2="580" y2="150" stroke="#f3f4f6" strokeWidth="1" />
        <line x1="50" y1="90" x2="580" y2="90" stroke="#f3f4f6" strokeWidth="1" />
        <line x1="50" y1="30" x2="580" y2="30" stroke="#f3f4f6" strokeWidth="1" />

        {/* Y axis */}
        <line x1="50" y1="20" x2="50" y2="280" stroke="#d1d5db" strokeWidth="2" />
        {/* X axis */}
        <line x1="50" y1="270" x2="580" y2="270" stroke="#d1d5db" strokeWidth="2" />

        {/* Y labels */}
        <text x="35" y="275" fontSize="12" fill="#6b7280" textAnchor="end">0</text>
        <text x="35" y="215" fontSize="12" fill="#6b7280" textAnchor="end">250</text>
        <text x="35" y="155" fontSize="12" fill="#6b7280" textAnchor="end">500</text>
        <text x="35" y="95" fontSize="12" fill="#6b7280" textAnchor="end">750</text>
        <text x="35" y="35" fontSize="12" fill="#6b7280" textAnchor="end">1000</text>

        {/* Data lines - Blue line */}
        <polyline
          points="80,220 150,200 220,140 290,80 360,50 430,40 500,35"
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          opacity="0.7"
        />
        {/* Data lines - Red line */}
        <polyline
          points="80,240 150,210 220,160 290,100 360,60 430,45 500,40"
          fill="none"
          stroke="#dc2626"
          strokeWidth="3"
          opacity="0.6"
        />

        {/* Gradient fill */}
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points="80,220 150,200 220,140 290,80 360,50 430,40 500,35 500,270 430,270 360,270 290,270 220,270 150,270 80,270"
          fill="url(#grad1)"
        />

        {/* X labels */}
        <text x="80" y="290" fontSize="12" fill="#6b7280" textAnchor="middle">Last 7 Days</text>
        <text x="220" y="290" fontSize="12" fill="#6b7280" textAnchor="middle">Last 15 Days</text>
        <text x="360" y="290" fontSize="12" fill="#6b7280" textAnchor="middle">Last 30 Days</text>
        <text x="500" y="290" fontSize="12" fill="#6b7280" textAnchor="middle">For The Year</text>
      </svg>
    </div>
  );
}

// Donut Chart Component
function DonutChart() {
  const total = 15;
  const pending = 15;
  const inProgress = 0;
  const closed = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ marginBottom: 20 }}>
        {/* Orange segment (Pending) */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="#ea580c" strokeWidth="20"
          strokeDasharray={`${(pending / total) * 376.99} 376.99`}
          strokeDashoffset="0"
          transform="rotate(-90 100 100)" />
        
        {/* Blue segment (In Progress) */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="#2563eb" strokeWidth="20"
          strokeDasharray={`${(inProgress / total) * 376.99} 376.99`}
          strokeDashoffset={`-${(pending / total) * 376.99}`}
          transform="rotate(-90 100 100)" />
        
        {/* Green segment (Closed) */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="#059669" strokeWidth="20"
          strokeDasharray={`${(closed / total) * 376.99} 376.99`}
          strokeDashoffset={`-${((pending + inProgress) / total) * 376.99}`}
          transform="rotate(-90 100 100)" />

        {/* Center text */}
        <text x="100" y="110" fontSize="28" fontWeight="700" textAnchor="middle" fill="#000">
          {total}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, width: "100%", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#ea580c" }}>{pending}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>In Progress</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{inProgress}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Closed</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>{closed}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dashboardCards = [
    { label: "Total Enquiries", value: "1122", subtext: "Across all periods", color: "red", icon: "📋" },
    { label: "Resolved Enquiries", value: "912", subtext: "Across all periods", color: "blue", icon: "✓" },
    { label: "Team Attendance", value: "0%", subtext: "0 / 0 Present Today", color: "green", icon: "👥" },
    { label: "Delayed Vehicles", value: "0", subtext: "0 Today, 0 This Week", color: "orange", icon: "🚚" },
  ];

  return (
    <MainLayout>
      <div
        style={{
          minHeight: "100%",
          background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 50%, #ecfdf5 100%)",
          padding: 24
        }}
      >
        <PageBody title="Dashboard">
          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 30
            }}
          >
            {dashboardCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                subtext={card.subtext}
                colorClass={card.color}
                icon={card.icon}
              />
            ))}
          </div>

          {/* Charts Section */}
          <div
            style={{
              display: "grid",
              gap: 24,
              marginBottom: 20
            }}
            className="dashboardCharts"
          >
            {/* Left: Line Chart */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>
                  📊 Enquiry Summary Overview
                </h3>
                <span style={{ fontSize: 12, color: "#6b7280", cursor: "pointer" }}>Data visualization</span>
              </div>
              <LineChart />
            </div>

            {/* Right: Donut Chart */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}
            >
              <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "#111" }}>
                📋 Task Status
              </h3>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ marginBottom: 20, fontSize: 12, color: "#9ca3af" }}>
                  <strong style={{ color: "#111" }}>My Tasks</strong> — 15 Total
                </div>
                <DonutChart />
              </div>
            </div>
          </div>
        </PageBody>
      </div>
    </MainLayout>
  );
}
