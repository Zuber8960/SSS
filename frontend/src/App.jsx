import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const appRoutes = [
  { path: "/", element: <LoginPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/admin/users", element: <UserPage /> },
  { path: "/admin/roles", element: <RolePage /> },
  { path: "/admin/menus", element: <MenuPage /> },
  { path: "/admin/user-role", element: <UserRolePage /> },
  { path: "/admin/role-menu", element: <RoleMenuPage /> },
  { path: "/masters/company", element: <CompanyPage /> },
  { path: "/masters/division", element: <DivisionPage /> },
  { path: "/masters/location", element: <LocationPage /> },
  { path: "/masters/business-partner", element: <BusinessPartnerPage /> },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {appRoutes.map((route) => (
          <Route key={route.path} {...route} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
