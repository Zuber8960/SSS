import { useEffect, useState } from "react";
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
import "./Sidebar.css";
import Logo from "../images/loogo.PNG";

export default function Sidebar() {
  const { pathname } = useLocation();
  const [openAdmin, setOpenAdmin] = useState(() => pathname.startsWith("/admin"));
  const [openMasters, setOpenMasters] = useState(() => pathname.startsWith("/masters"));
  const [openTransaction, setOpenTransaction] = useState(() => pathname.startsWith("/transaction"));
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => pathname === path;
  const isSectionActive = (paths) => paths.some((path) => pathname.startsWith(path));
  const textVisible = !collapsed;

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setOpenAdmin(true);
    }
    if (pathname.startsWith("/masters")) {
      setOpenMasters(true);
    }
    if (pathname.startsWith("/transaction")) {
      setOpenTransaction(true);
    }
  }, [pathname]);

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebarHeader">
        {!collapsed ? <div><img
          src={Logo}
          alt="Saral Samadhan"
          style={{
            maxHeight: "80px",
            width: "70px",
            borderRadius: "50%",
            boxShadow: "0px 0px 15px 5px rgba(248, 249, 250, 0.6)"
          }}s
        /></div> : null}
        <div className="sidebarBrand">
          <h2 className="sidebarTitle">SSS-ERP</h2>
          <h5 className="sidebarSubtitle">Smart Transport ERP</h5>
        </div>
        <Tooltip title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right">
          <button
            type="button"
            className="sidebarToggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </Tooltip>
      </div>

      <List className="sidebarList">
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/dashboard"
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

        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setOpenAdmin(!openAdmin)
              setOpenMasters(false)
              setOpenTransaction(false)
            }}
            className={`sidebarItem sidebarCollapseButton${isSectionActive(["/admin"]) ? " sidebarItemActive" : ""}`}
          >
            <ListItemIcon className="sidebarIcon">
              <ShieldIcon />
            </ListItemIcon>
            <ListItemText
              primary="Administration"
              style={{ display: textVisible ? "block" : "none" }}
              primaryTypographyProps={{ style: { color: "#f8fafc" } }}
            />
            {openAdmin ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={openAdmin} timeout="auto" unmountOnExit>
          <List component="div" disablePadding className="nestedList">
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/users"
                className={`sidebarNestedItem${isActive("/admin/users") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <GroupIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="User Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/roles"
                className={`sidebarNestedItem${isActive("/admin/roles") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <ShieldIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Role Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/menus"
                className={`sidebarNestedItem${isActive("/admin/menus") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <MenuBookIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Menu Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/role-menu"
                className={`sidebarNestedItem${isActive("/admin/role-menu") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Role Menu Mapping"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/user-role"
                className={`sidebarNestedItem${isActive("/admin/user-role") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <PublicIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="User Role Mapping"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setOpenMasters(!openMasters);
              setOpenAdmin(false);
              setOpenTransaction(false);
            }}
            className={`sidebarItem sidebarCollapseButton${isSectionActive(["/masters"]) ? " sidebarItemActive" : ""}`}
          >
            <ListItemIcon className="sidebarIcon">
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText
              primary="Master Modules"
              style={{ display: textVisible ? "block" : "none" }}
              primaryTypographyProps={{ style: { color: "#f8fafc" } }}
            />
            {openMasters ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={openMasters} timeout="auto" unmountOnExit>
          <List component="div" disablePadding className="nestedList">
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/masters/company"
                className={`sidebarNestedItem${isActive("/masters/company") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Company Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/masters/division"
                className={`sidebarNestedItem${isActive("/masters/division") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <MenuBookIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Division Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/masters/location"
                className={`sidebarNestedItem${isActive("/masters/location") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <LocationOnIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Location Master"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/masters/business-partner"
                className={`sidebarNestedItem${isActive("/masters/business-partner") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <HandshakeIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Business Partner"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setOpenTransaction(!openTransaction);
              setOpenAdmin(false);
              setOpenMasters(false);
            }}
            className={`sidebarItem sidebarCollapseButton${isSectionActive(["/transaction"]) ? " sidebarItemActive" : ""}`}
          >
            <ListItemIcon className="sidebarIcon">
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText
              primary="Transaction"
              style={{ display: textVisible ? "block" : "none" }}
              primaryTypographyProps={{ style: { color: "#f8fafc" } }}
            />
            {openTransaction ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={openTransaction} timeout="auto" unmountOnExit>
          <List component="div" disablePadding className="nestedList">
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/transaction/docket"
                className={`sidebarNestedItem${isActive("/transaction/docket") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <LocalShippingIcon />
                </ListItemIcon>
                <ListItemText
                  secondary="Docket"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/transaction/trip-sheet"
                className={`sidebarNestedItem${isActive("/transaction/trip-sheet") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <AccountTreeSharp />
                </ListItemIcon>
                <ListItemText
                  secondary="Trip Sheet"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/transaction/manifest-entry"
                className={`sidebarNestedItem${isActive("/transaction/manifest-entry") ? " sidebarItemActive" : ""}`}
              >
                <ListItemIcon className="sidebarIcon">
                  <AccessTime />
                </ListItemIcon>
                <ListItemText
                  secondary="Manifest Entry"
                  style={{ display: textVisible ? "block" : "none" }}
                  secondaryTypographyProps={{ style: { color: "#cbd5e1" } }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>
      </List>
    </aside>
  );
}
