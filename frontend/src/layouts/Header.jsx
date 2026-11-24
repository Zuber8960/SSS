import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout as logoutUser, fetchSessionBranches, switchSessionBranch, applySessionBranch } from "../utils/authService";
import { getTenantConfig } from "../utils/tenantService";
import { usePageTitle } from "../contexts/PageTitleContext";
import { Tooltip } from "@mui/material";
import { MenuIcon, CloseIcon, LogoutSvgIcon } from "../components/common/icons";
import { fetchAllDivisionsApi } from "../utils/divisionMaster";
import "./Header.css";
import logoImg from "../images/logo.png";

export default function Header({ onToggleSidebar, isMobileSidebarOpen }) {
  const tenantConfig = getTenantConfig();
  const logoSrc = tenantConfig?.logo_url || logoImg;
  const appTitle = tenantConfig?.tenant_name || "Logistics ERP";
  const { pageTitle } = usePageTitle();
  const navigate = useNavigate();

  const logout = () => {
    logoutUser();
    const slug = tenantConfig?.tenant_slug;
    navigate(
      slug ? `/${slug}/login` : "/",
      { replace: true, state: { tenantVerified: true, config: tenantConfig } }
    );
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

  const [branchCode, setBranchCode] = useState(
    () => currentUser?.loc_code || currentUser?.location_id || localStorage.getItem("loc_code") || ""
  );
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchSessionBranches()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setBranches(rows);
        if (res?.current) {
          const current = String(res.current).trim();
          const match = rows.find((row) => String(row.loc_code || "").trim().toUpperCase() === current.toUpperCase());
          setBranchCode(match?.loc_code || current);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const changeBranch = async (code) => {
    if (!code || code === branchCode) return;
    const previous = branchCode;
    setBranchCode(code);
    try {
      const result = await switchSessionBranch(code);
      applySessionBranch(result);
      window.location.reload();
    } catch (err) {
      setBranchCode(previous);
      window.alert(err.message || "Branch could not be changed");
    }
  };

  const divisionCode = currentUser?.division_code || localStorage.getItem("division_code") || "";
  const [divisionLabel, setDivisionLabel] = useState(
    () => localStorage.getItem("header_division_label") || divisionCode
  );

  useEffect(() => {
    if (!divisionCode) return;
    if (localStorage.getItem("header_division_label")) return;
    fetchAllDivisionsApi()
      .then((divs) => {
        const match = divs.find((d) => d.division_code === divisionCode);
        if (match) {
          const label = `${match.division_code} - ${match.division_name}`;
          localStorage.setItem("header_division_label", label);
          setDivisionLabel(label);
        }
      })
      .catch(() => {});
  }, [divisionCode]);

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

        {/* <img src={logoSrc} alt="Logo" className="appHeaderLogo" /> */}
        {/* <h2 className="appHeaderTitle">
          {appTitle} ERP
        </h2> */}
      </div>

      <h2 className="appHeaderPageTitle">{pageTitle}</h2>

      <div className="appHeaderActions">
        {divisionCode && (
          <div className="appHeaderBranch appHeaderDivision">
            <span className="appHeaderBranchLabel">Division</span>
            <span className="appHeaderBranchValue">{divisionLabel}</span>
          </div>
        )}
        {branchCode && (
          <div className="appHeaderBranch">
            <span className="appHeaderBranchLabel">Branch</span>
            <select
              className="appHeaderBranchSelect"
              aria-label="Session branch"
              value={branchCode}
              onChange={(e) => changeBranch(e.target.value)}
            >
              {!branches.some((row) => row.loc_code === branchCode) && (
                <option value={branchCode}>{branchCode}</option>
              )}
              {branches.map((row) => (
                <option key={row.loc_code} value={row.loc_code}>
                  {row.loc_name ? `${row.loc_code} - ${row.loc_name}` : row.loc_code}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="appHeaderUserInfo">
          <div className="appHeaderAvatar">{initials}</div>
          <span className="appHeaderUserName">{fullName}</span>
        </div>

        <Tooltip title="Logout">
          <button onClick={logout} className="appHeaderLogout">
            <LogoutSvgIcon />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
