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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin/users" element={<UserPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/roles" element={<RolePage />} />
        <Route path="/admin/menus" element={<MenuPage />} />
	<Route  path="/admin/user-role"  element={<UserRolePage />}/>
	<Route  path="/admin/role-menu"  element={<RoleMenuPage />}/>
	<Route  path="/masters/company"  element={<CompanyPage />}/>
	<Route  path="/masters/division" element={<DivisionPage />}/>
	<Route  path="/masters/location" element={<LocationPage />}/>
	<Route  path="/masters/business-partner" element={<BusinessPartnerPage />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;