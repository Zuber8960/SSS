import { useNavigate } from "react-router-dom";
import { logout as logoutUser } from "../utils/authService";
import logoImg from "../images/logo.png";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

export default function Header({ onToggleSidebar, isMobileSidebarOpen }) {

  const navigate = useNavigate();

  const logout = () => {
    logoutUser();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        height: "70px",
        background: "#ffffff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 5px 0 5px",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Mobile Hamburger (toggles between Menu and Close icon) */}
        <button
          className="mobileHamburger"
          onClick={onToggleSidebar}
          aria-label={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
          style={{
            border: "none",
            background: isMobileSidebarOpen ? "rgba(0,0,0,0.08)" : "transparent",
            cursor: "pointer",
            padding: "8px",
            borderRadius: 6,
            color: "#333",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s ease"
          }}
        >
          {isMobileSidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <img
          src={logoImg}
          alt="Logo"
          style={{
            width: 120,
            height: 126,
            objectFit: "contain"
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "#111",
            whiteSpace: "nowrap"
          }}
        >
          Logistics ERP
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #a855f7, #7e22ce)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 600,
          fontSize: 13
        }}>
          {
            JSON.parse(localStorage.getItem("current_user"))
            ?.user_name
            ?.trim()
            .split(/\s+/)
            .map(word => word[0]?.toUpperCase())
            .slice(0, 2)
            .join("")
            .toUpperCase() || "AD"}
        </div>

        <button
          onClick={logout}
          style={{
            padding: "6px 12px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 12,
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={(e) => e.target.style.background = "#b91c1c"}
          onMouseLeave={(e) => e.target.style.background = "#dc2626"}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
