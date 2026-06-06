import { Link } from "react-router-dom";

export default function Sidebar() {
  const sidebarStyle = {
    width: "250px",
    flexShrink: 0,
    background: "linear-gradient(135deg, #0B3D91 0%, #0d4da8 100%)",
    color: "white",
    padding: "0",
    height: "100vh",
    overflowY: "auto",
    boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const headerStyle = {
    padding: "24px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    marginBottom: "8px"
  };

  const titleStyle = {
    margin: "0",
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "0.5px"
  };

  const sectionTitleStyle = {
    padding: "16px 20px 8px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: "1px",
    marginTop: "8px"
  };

  const menuItemStyle = {
    padding: "12px 20px",
    display: "block",
    color: "white",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    borderLeft: "3px solid transparent",
    cursor: "pointer",
    userSelect: "none"
  };

  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>📦 ERP</h2>
      </div>

      <Link
        to="/dashboard"
        style={{
          ...menuItemStyle,
          marginBottom: "8px"
        }}
      >
        📊 Dashboard
      </Link>

      <div style={sectionTitleStyle}>🔐 Administration</div>
      <Link to="/admin/users" style={menuItemStyle}>👤 User Master</Link>
      <Link to="/admin/roles" style={menuItemStyle}>🎭 Role Master</Link>
      <Link to="/admin/menus" style={menuItemStyle}>📋 Menu Master</Link>
      <Link to="/admin/role-menu" style={menuItemStyle}>🔗 Role Menu Mapping</Link>
      <Link to="/admin/user-role" style={menuItemStyle}>👥 User Role Mapping</Link>

      <div style={sectionTitleStyle}>⚙️ Masters</div>
      <Link to="/masters/company" style={menuItemStyle}>🏢 Company Master</Link>
      <Link to="/masters/division" style={menuItemStyle}>📂 Division Master</Link>
      <Link to="/masters/location" style={menuItemStyle}>📍 Location Master</Link>
      <Link to="/masters/business-partner" style={menuItemStyle}>🤝 Business Partner</Link>

      <div style={sectionTitleStyle}>🚀 Operations</div>
      <div style={{ ...menuItemStyle, opacity: 0.7 }}>📄 Docket</div>
      <div style={{ ...menuItemStyle, opacity: 0.7 }}>🗺️ Trip Sheet</div>
    </div>
  );
}