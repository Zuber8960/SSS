import { useNavigate } from "react-router-dom";
import { logout as logoutUser } from "../utils/authService";
import { getTenantConfig } from "../utils/tenantService";
import { usePageTitle } from "../contexts/PageTitleContext";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import "./Header.css";

export default function Header({ onToggleSidebar, isMobileSidebarOpen }) {
  const tenantConfig = getTenantConfig();
  const logoSrc = tenantConfig?.logo_url || logoImg;
  const appTitle = tenantConfig?.tenant_name || "Logistics ERP";
  const { pageTitle } = usePageTitle();
  const navigate = useNavigate();

  const logout = () => {
    logoutUser();
    navigate("/", { replace: true });
  };

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("current_user"));
    } catch {
      return null;
    }
  })();

  const fullName = currentUser?.user_name?.trim() || "Admin";
  const initials = fullName
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase())
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

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

        <img src={logoSrc} alt="Logo" className="appHeaderLogo" />
        {/* <h2 className="appHeaderTitle">
          {appTitle} ERP
        </h2> */}
      </div>

      <h2 className="appHeaderPageTitle">{pageTitle}</h2>

      <div className="appHeaderActions">
        <div className="appHeaderUserInfo">
          <div className="appHeaderAvatar">{initials}</div>
          <span className="appHeaderUserName">{fullName}</span>
        </div>

        <button onClick={logout} className="appHeaderLogout">
          Logout
        </button>
      </div>
    </header>
  );
}
