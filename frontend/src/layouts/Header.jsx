import { useNavigate } from "react-router-dom";
import { logout as logoutUser } from "../utils/authService";
import logoImg from "../images/logo.png";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import "./Header.css";

export default function Header({ onToggleSidebar, isMobileSidebarOpen }) {

  const navigate = useNavigate();

  const logout = () => {
    logoutUser();
    navigate("/", { replace: true });
  };

  return (
    <header className="appHeader">
      <div className="appHeaderBrand">
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

        <img src={logoImg} alt="Logo" className="appHeaderLogo" />
        <h2 className="appHeaderTitle">
          Logistics ERP
        </h2>
      </div>

      <div className="appHeaderActions">
        <div className="appHeaderAvatar">
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
          className="appHeaderLogout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
