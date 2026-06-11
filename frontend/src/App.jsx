import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
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
import Docket from "./pages/transaction/Docket";
import TripSheet from "./pages/transaction/TripSheet";
import ManifestEntry from "./pages/transaction/ManifestEntry";
import { isAuthenticated } from "./utils/authService";

const appRoutes = [
  { path: "/", element: <LoginPage />, protected: false },
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
  { path: "/transaction/docket", element: <Docket />, protected: true },
  { path: "/transaction/trip-sheet", element: <TripSheet />, protected: true },
  { path: "/transaction/manifest-entry", element: <ManifestEntry />, protected: true },
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
