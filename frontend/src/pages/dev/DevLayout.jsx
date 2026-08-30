import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dev/distance-calculator", icon: "📐", label: "Distance Calculator" },
  { path: "/dev/pincode-search",      icon: "📍", label: "Pincode Search" },
  { path: "/dev/docket-enquiry",      icon: "📋", label: "Docket Enquiry" },
];

export default function DevLayout({ children, title, icon }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 60%, #ecfdf5 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "#1e1b4b",
        display: "flex", flexDirection: "column",
        padding: "24px 0",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>🛠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Dev Tools</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Internal only</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 4,
                textDecoration: "none", fontSize: 13, fontWeight: 500,
                transition: "all 0.15s",
                background: isActive ? "rgba(124,58,237,0.25)" : "transparent",
                color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.6)",
                borderLeft: isActive ? "3px solid #7c3aed" : "3px solid transparent",
              })}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <a
            href="/dashboard"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: "rgba(255,255,255,0.4)",
              textDecoration: "none", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            ← Back to App
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <div style={{
          background: "#fff", borderRadius: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          padding: "32px 36px", maxWidth: 1200,
        }}>
          {/* Page header */}
          {(title || icon) && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              {icon && <span style={{ fontSize: 26 }}>{icon}</span>}
              {title && <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111" }}>{title}</h1>}
              <span style={{
                fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309",
                border: "1px solid #fde68a", borderRadius: 6, padding: "2px 8px",
                letterSpacing: 1, textTransform: "uppercase",
              }}>Dev Tool</span>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
