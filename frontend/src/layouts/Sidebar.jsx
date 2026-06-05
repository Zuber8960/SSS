import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div
      style={{
        width: "250px",
        background: "#0B3D91",
        color: "white",
        padding: "20px"
      }}
    >
      <h2>ERP</h2>

      <hr />

      <p>
        <Link
          to="/dashboard"
          style={{ color: "white", textDecoration: "none" }}
        >
          Dashboard
<p>Administration</p>

<li>
  <Link to="/admin/role-menu">
    Role Menu Mapping
  </Link>
</li>
<li>
  <Link to="/admin/menus">
    Menu Master
  </Link>
</li>
<li>
  <Link
    to="/admin/roles"
    style={{
      color: "white",
      textDecoration: "none",
    }}
  >
    Role Master
  </Link>
</li>

<li>
  <Link to="/admin/user-role">
    User Role Mapping
  </Link>
</li>

<ul>
  <li>
    <Link
      to="/admin/users"
      style={{
        color: "white",
        textDecoration: "none",
      }}
    >
      User Master
    </Link>
  </li>
</ul>
        </Link>
      </p>

<p>Masters</p>

<ul>

  <li>
    <Link
      to="/masters/company"
      style={{
        color: "white",
        textDecoration: "none"
      }}
    >
      Company Master
    </Link>
  </li>

  <li>
    <Link
      to="/masters/division"
      style={{
        color: "white",
        textDecoration: "none"
      }}
    >
      Division Master
    </Link>
  </li>

  <li>
    <Link
      to="/masters/location"
      style={{
        color: "white",
        textDecoration: "none"
      }}
    >
      Location Master
    </Link>
  </li>

  <li>
    <Link
      to="/masters/business-partner"
      style={{
        color: "white",
        textDecoration: "none"
      }}
    >
      Business Partner Master
    </Link>
  </li>

</ul>
      <p>Operations</p>

      <ul>
        <li>Docket</li>
        <li>Trip Sheet</li>
      </ul>
    </div>
  );
}