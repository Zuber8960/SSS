import { useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import HomeIcon from "@mui/icons-material/Home";
import ShieldIcon from "@mui/icons-material/Shield";
import BusinessIcon from "@mui/icons-material/Business";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PublicIcon from "@mui/icons-material/Public";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccountTreeSharp from "@mui/icons-material/TireRepair";
import AccessTime from "@mui/icons-material/ManageHistory";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import "./Sidebar.css";
import Logo from "../images/loogo.PNG";
import { getTenantConfig } from "../utils/tenantService";

export default function Sidebar({ isMobileOpen, onToggleMobile }) {
  const { pathname } = useLocation();
  const tenantBrand = getTenantConfig()?.brand || {};
  const sidebarGradient = tenantBrand.gradient || "linear-gradient(180deg, #8e2de2, #c850c0, #a4508b)";
  const [openAdmin, setOpenAdmin] = useState(() => pathname.startsWith("/admin"));
  const [openMasters, setOpenMasters] = useState(() => pathname.startsWith("/masters"));
  const [openTransaction, setOpenTransaction] = useState(() => pathname.startsWith("/transaction"));
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path) => pathname === path;
  const isSectionActive = (prefix) => pathname.startsWith(prefix);
  const textVisible = !collapsed;
  const isSearchActive = searchQuery.trim().length > 0;

  // ── Nav config ──────────────────────────────────────────────────────────────
  const navSections = [
    {
      key: "admin",
      label: "Administration",
      icon: <ShieldIcon />,
      prefix: "/admin",
      open: openAdmin,
      onToggle: () => {
        setOpenAdmin((p) => !p);
        setOpenMasters(false);
        setOpenTransaction(false);
      },
      children: [
        { path: "/admin/users",     label: "User Master",        icon: <GroupIcon /> },
        { path: "/admin/roles",     label: "Role Master",        icon: <ShieldIcon /> },
        { path: "/admin/menus",     label: "Menu Master",        icon: <MenuBookIcon /> },
        { path: "/admin/role-menu", label: "Role Menu Mapping",  icon: <AssignmentIcon /> },
        { path: "/admin/user-role", label: "User Role Mapping",  icon: <PublicIcon /> },
      ],
    },
    {
      key: "masters",
      label: "Master Modules",
      icon: <BusinessIcon />,
      prefix: "/masters",
      open: openMasters,
      onToggle: () => {
        setOpenMasters((p) => !p);
        setOpenAdmin(false);
        setOpenTransaction(false);
      },
      children: [
        { path: "/masters/company",          label: "Company Master",    icon: <BusinessIcon /> },
        { path: "/masters/division",         label: "Division Master",   icon: <MenuBookIcon /> },
        { path: "/masters/location",         label: "Location Master",   icon: <LocationOnIcon /> },
        { path: "/masters/business-partner", label: "Business Partner",  icon: <HandshakeIcon /> },
      ],
    },
    {
      key: "transaction",
      label: "Transaction",
      icon: <AssignmentIcon />,
      prefix: "/transaction",
      open: openTransaction,
      onToggle: () => {
        setOpenTransaction((p) => !p);
        setOpenAdmin(false);
        setOpenMasters(false);
      },
      children: [
        { path: "/transaction/docket",           label: "Docket",          icon: <LocalShippingIcon /> },
        { path: "/transaction/trip-sheet",       label: "Trip Sheet",      icon: <AccountTreeSharp /> },
        { path: "/transaction/manifest-entry",   label: "Manifest Entry",  icon: <AccessTime /> },
      ],
    },
  ];
  // ────────────────────────────────────────────────────────────────────────────

  // Flatten all nav items with their section info for search
  const allNavItems = useMemo(() => {
    const items = [];
    navSections.forEach((section) => {
      items.push({
        type: "section",
        key: section.key,
        label: section.label,
        prefix: section.prefix,
        path: section.prefix,
      });
      section.children.forEach((child) => {
        items.push({
          type: "child",
          key: child.path,
          label: child.label,
          path: child.path,
          sectionKey: section.key,
        });
      });
    });
    items.push({
      type: "dashboard",
      key: "/dashboard",
      label: "Dashboard",
      path: "/dashboard",
    });
    return items;
  }, [navSections]);

  // Determine which items match the search query
  const matchedPaths = useMemo(() => {
    if (!isSearchActive) return new Set();
    const q = searchQuery.toLowerCase();
    const matches = new Set();
    const items = [...allNavItems]; // defensive copy
    for (const item of items) {
      if (item.label.toLowerCase().includes(q)) {
        matches.add(item.path);
        if (item.sectionKey) {
          const section = navSections.find((s) => s.key === item.sectionKey);
          if (section) matches.add(section.prefix);
        }
      }
    }
    return matches;
  }, [searchQuery, isSearchActive, allNavItems, navSections]);

  const isVisible = useCallback((path) => {
    if (!isSearchActive) return true;
    return matchedPaths.has(path);
  }, [isSearchActive, matchedPaths]);
  const isSectionVisible = useCallback((section) => {
    if (!isSearchActive) return true;
    if (matchedPaths.has(section.prefix)) return true;
    return section.children.some((child) => matchedPaths.has(child.path));
  }, [isSearchActive, matchedPaths]);

  const handleNavClick = useCallback(() => {
    if (onToggleMobile) onToggleMobile();
    setSearchQuery("");
  }, [onToggleMobile]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", next);
      return next;
    });
  };

  return (
    <>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${isMobileOpen ? " mobileOpen" : ""}`} style={{ background: sidebarGradient }}>
        <div className="sidebarHeader">
          {!collapsed && (
            <div>
              <img
                src={Logo}
                alt="Saral Samadhan"
                style={{
                  maxHeight: "80px",
                  width: "70px",
                  borderRadius: "50%",
                  boxShadow: "0px 0px 15px 5px rgba(248, 249, 250, 0.6)",
                }}
              />
            </div>
          )}
          <div className="sidebarBrand">
            <h2 className="sidebarTitle">SSS-ERP</h2>
            <h5 className="sidebarSubtitle">Smart Transport ERP</h5>
          </div>
          <Tooltip title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right">
            <button
              type="button"
              className="sidebarToggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </Tooltip>
        </div>

        {/* ── Search Bar ── */}
        <div className="sidebarSearchWrapper" style={{ display: textVisible ? "flex" : "none" }}>
          <div className="sidebarSearchInput">
            <SearchIcon className="sidebarSearchIcon" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="sidebarSearchField"
            />
            {searchQuery && (
              <button
                className="sidebarSearchClear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <List className="sidebarList">
          {/* Dashboard — top-level single item */}
          {isVisible("/dashboard") && (
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/dashboard"
                onClick={handleNavClick}
                className={`sidebarItem${isActive("/dashboard") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Dashboard"
                  style={{ display: textVisible ? "block" : "none" }}
                  primaryTypographyProps={{ style: { color: "#f8fafc" } }}
                />
              </ListItemButton>
            </ListItem>
          )}

          {/* Collapsible sections */}
          {navSections.map((section) => {
            const expanded = isSearchActive
              ? isSectionVisible(section)
              : section.open;

            return (
              <div key={section.key}>
                {isSectionVisible(section) && (
                  <>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={section.onToggle}
                        className={`sidebarItem sidebarCollapseButton${isSectionActive(section.prefix) ? " sidebarItemActive" : ""}`}
                      >
                        <ListItemIcon className="sidebarIcon">
                          {section.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={section.label}
                          style={{ display: textVisible ? "block" : "none" }}
                          primaryTypographyProps={{ style: { color: "#f8fafc" } }}
                        />
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                    </ListItem>

                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding className="nestedList">
                        {section.children.map((child) =>
                          isVisible(child.path) ? (
                            <ListItem key={child.path} disablePadding>
                              <ListItemButton
                                component={Link}
                                to={child.path}
                                onClick={handleNavClick}
                                className={`sidebarNestedItem${isActive(child.path) ? " sidebarItemActive" : ""}`}
                              >
                                <ListItemIcon className="sidebarIcon">
                                  {child.icon}
                                </ListItemIcon>
                                <ListItemText
                                  secondary={child.label}
                                  style={{ display: textVisible ? "block" : "none" }}
                                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ) : null
                        )}
                      </List>
                    </Collapse>
                  </>
                )}
              </div>
            );
          })}
        </List>
      </aside>

      <div
        className={`sidebarOverlay${isMobileOpen ? " open" : ""}`}
        onClick={handleNavClick}
      />
    </>
  );
}