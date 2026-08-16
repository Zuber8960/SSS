import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MasterPortal from "./pages/MasterPortal";
import TenantLoginPage from "./pages/TenantLoginPage";
import DashboardPage from "./pages/DashboardPage";
import UserPage from "./pages/admin/UserPage";
import RolePage from "./pages/admin/RolePage";
import MenuPage from "./pages/admin/MenuPage";
import UserRolePage from "./pages/admin/UserRolePage";
import RoleMenuPage from "./pages/admin/RoleMenuPage";
import CompanyPage from "./pages/masters/CompanyPage";
import DivisionPage from "./pages/masters/DivisionPage";
import LocationPage from "./pages/masters/LocationPage";
import BusinessPartnerPage from "./pages/masters/BusinessPartnerPage";
import LorryPage from "./pages/masters/LorryPage";
import AddTown from "./pages/transaction/AddTown";
import Docket from "./pages/transaction/Docket";
import TripSheet from "./pages/transaction/TripSheet";
import ManifestEntry from "./pages/transaction/ManifestEntry";
import HireVoucherPage from "./pages/transaction/Hire_voucher";
import ManifestUnloading from "./pages/transaction/manifestUnloading";
import DocketEnquiry from "./pages/transaction/DocketEnquiry";
import DeliveryUpdate from "./pages/reports/DeliveryUpdate";
import DocketReport from "./pages/reports/DocketReport";
import InvoiceReport from "./pages/reports/InvoiceReport";
import ManifestReport from "./pages/reports/ManifestReport";
import CustomerBill from "./pages/transaction/CustomerBill";
import { isAuthenticated } from "./utils/authService";

const appRoutes = [
  { path: "/",                   element: <MasterPortal />,    protected: false },
  { path: "/:tenantSlug/login",  element: <TenantLoginPage />, protected: false },
  { path: "/login",              element: <Navigate to="/" replace />, protected: false },
{ path: "/dashboard", element: <DashboardPage />, protected: true },
  { path: "/admin/users", element: <UserPage />, protected: true },
  { path: "/admin/roles", element: <RolePage />, protected: true },
  { path: "/admin/menus", element: <MenuPage />, protected: true },
  { path: "/admin/user-role", element: <UserRolePage />, protected: true },
  { path: "/admin/role-menu", element: <RoleMenuPage />, protected: true },
  { path: "/masters/company", element: <CompanyPage />, protected: true },
  { path: "/masters/division", element: <DivisionPage />, protected: true },
  { path: "/masters/location", element: <LocationPage />, protected: true },
  { path: "/masters/business-partner", element: <BusinessPartnerPage />, protected: true },
  { path: "/masters/lorry", element: <LorryPage />, protected: true },
  { path: "/transaction/add-town", element: <AddTown />, protected: true },
  { path: "/transaction/docket", element: <Docket />, protected: true },
  { path: "/transaction/trip-sheet", element: <TripSheet />, protected: true },
  { path: "/transaction/manifest-entry", element: <ManifestEntry />, protected: true },
  { path: "/transaction/hire-voucher", element: <HireVoucherPage />, protected: true },
  { path: "/transaction/manifest-unloading", element: <ManifestUnloading />, protected: true },
  { path: "/reports/docket-enquiry", element: <DocketEnquiry />, protected: true },
  { path: "/transaction/customer-bill", element: <CustomerBill />, protected: true },
  { path: "/reports/delivery-update", element: <DeliveryUpdate />, protected: true },
  { path: "/reports/docket-report", element: <DocketReport />, protected: true },
  { path: "/reports/invoice-report", element: <InvoiceReport />, protected: true },
  { path: "/reports/manifest-report", element: <ManifestReport />, protected: true },
];

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {appRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.protected ? (
                <ProtectedRoute>{route.element}</ProtectedRoute>
              ) : (
                route.element
              )
            }
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
