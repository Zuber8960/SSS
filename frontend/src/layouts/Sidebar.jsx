import { useState, useCallback, useMemo } from "react";
import { getTenantConfig } from "../utils/tenantService";
import { Link, useLocation } from "react-router-dom";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import HomeIcon from "@mui/icons-material/Home";
import ShieldIcon from "@mui/icons-material/Shield";
import SecurityIcon from "@mui/icons-material/Security";
import BusinessIcon from "@mui/icons-material/Business";
import ApartmentIcon from "@mui/icons-material/Apartment";
import GroupIcon from "@mui/icons-material/Group";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CategoryIcon from "@mui/icons-material/Category";
import PublicIcon from "@mui/icons-material/Public";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccountTreeSharp from "@mui/icons-material/TireRepair";
import AccessTime from "@mui/icons-material/ManageHistory";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import ListAltIcon from "@mui/icons-material/ListAlt";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import "./Sidebar.css";
import logoFallback from "../images/loogo.PNG";

export default function Sidebar({ isMobileOpen, onToggleMobile }) {
  const { pathname } = useLocation();
  const tenantConfig = getTenantConfig();
  const tenantBrand = tenantConfig?.brand || {};
  const sidebarGradient = tenantBrand.gradient || "linear-gradient(180deg, #8e2de2, #c850c0, #a4508b)";
  const logoSrc = tenantConfig?.logo_url || logoFallback;
  const tenantName = tenantConfig?.tenant_name || "SSS-ERP";
  const [openAdmin, setOpenAdmin] = useState(() => pathname.startsWith("/admin"));
  const [openMasters, setOpenMasters] = useState(() => pathname.startsWith("/masters"));
  const [openTransaction, setOpenTransaction] = useState(() => pathname.startsWith("/transaction"));
  const [openReports, setOpenReports] = useState(() => pathname.startsWith("/reports"));
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
        setOpenReports(false);
      },
      children: [
        { path: "/admin/users",     label: "User Master",        icon: <GroupIcon /> },
        { path: "/admin/roles",     label: "Role Master",        icon: <SecurityIcon /> },
        { path: "/admin/menus",     label: "Menu Master",        icon: <MenuBookIcon /> },
        { path: "/admin/role-menu", label: "Role Menu Mapping",  icon: <SwapHorizIcon /> },
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
        setOpenReports(false);
      },
      children: [
        { path: "/masters/company",          label: "Company Master",    icon: <ApartmentIcon /> },
        { path: "/masters/division",         label: "Division Master",   icon: <CategoryIcon /> },
        { path: "/masters/location",         label: "Location Master",   icon: <LocationOnIcon /> },
        { path: "/masters/business-partner", label: "Business Partner",  icon: <HandshakeIcon /> },
        { path: "/masters/lorry",            label: "Lorry Master",      icon: <DirectionsCarIcon /> },
        { path: "/transaction/add-town",     label: "Add Town",          icon: <LocationOnIcon /> },
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
        setOpenReports(false);
      },
      children: [
        { path: "/transaction/docket",           label: "Docket",          icon: <DescriptionIcon /> },
        { path: "/transaction/trip-sheet",       label: "Trip Sheet",      icon: <AccountTreeSharp /> },
        { path: "/transaction/manifest-entry",   label: "Manifest Entry",  icon: <AccessTime /> },
        { path: "/transaction/hire-voucher",     label: "Hire Voucher",    icon: <ReceiptLongIcon /> },
        { path: "/transaction/manifest-unloading", label: "Manifest Unloading", icon: <UnarchiveIcon /> },
        { path: "/transaction/customer-bill", label: "Customer Bill", icon: <ReceiptLongIcon /> },
        { path: "/reports/delivery-update", label: "Delivery Update", icon: <SystemUpdateAltIcon /> },
      ],
    },
    {
      key: "reports",
      label: "Reports",
      icon: <BarChartIcon />,
      prefix: "/reports",
      open: openReports,
      onToggle: () => {
        setOpenReports((p) => !p);
        setOpenAdmin(false);
        setOpenMasters(false);
        setOpenTransaction(false);
      },
      children: [
        { path: "/reports/docket-enquiry", label: "Docket Enquiry", icon: <FindInPageIcon /> },
        { path: "/reports/docket-report", label: "All Docket Report", icon: <ListAltIcon /> },
        { path: "/reports/invoice-report", label: "Invoice Report", icon: <RequestQuoteIcon /> },
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
            <div className="sidebarLogoBlock">
              <h2 className="sidebarLogoTitle">{tenantName}</h2>
              <img
                src={logoSrc}
                alt={tenantName}
                className="sidebarLogoLarge"
              />
            </div>
          )}

          {/* <div className="sidebarBrand">
            <h2 className="sidebarTitle">SSS-ERP</h2>
            <h5 className="sidebarSubtitle">Smart Transport ERP</h5>
          </div> */}
          {/* <Tooltip title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right"> */}
            <button
              type="button"
              className="sidebarToggle"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          {/* </Tooltip> */}
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